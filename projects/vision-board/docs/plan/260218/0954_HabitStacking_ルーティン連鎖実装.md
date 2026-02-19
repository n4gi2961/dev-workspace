# Habit Stacking（ルーティン連鎖）実装計画

## Context
現在のルーティンは個別のフラットリストとして表示されている。「朝の儀式」のように複数ルーティンをグループ化し、順番に連鎖させる機能を追加する。既存の見た目を崩さず、「一括チェック」と「個別チェック」の両方を実現する。

## 1. データモデル変更

### Supabase マイグレーション
```sql
-- routine_stacks テーブル新規作成
CREATE TABLE routine_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- routines テーブルに stack 関連カラム追加
ALTER TABLE routines ADD COLUMN stack_id UUID REFERENCES routine_stacks(id) ON DELETE SET NULL;
ALTER TABLE routines ADD COLUMN stack_order INTEGER NOT NULL DEFAULT 0;
```
- `stack_id` が NULL のルーティンは従来どおり個別表示
- `stack_order` でスタック内の順序を管理
- `routine_stacks.sort_order` でスタック自体のルーティンリスト内の位置を管理

### 型定義追加 (`packages/shared/src/lib/pageMapper.ts`)
```typescript
interface RoutineStack {
  id: string;
  boardId: string;
  nodeId: string;
  title: string;
  sortOrder: number;
  createdAt?: string;
}
```

`Routine` に追加:
```typescript
stackId?: string | null;
stackOrder?: number;
```

## 2. useRoutines フック拡張 (`hooks/useRoutines.ts`)

### 新規関数
| 関数 | 説明 |
|------|------|
| `createStack(nodeId, title)` | 新しいスタックを作成 |
| `deleteStack(stackId)` | スタック削除（中のルーティンは stack_id=NULL に戻す） |
| `updateStackTitle(stackId, title)` | スタック名変更 |
| `addRoutineToStack(routineId, stackId, order)` | ルーティンをスタックに追加 |
| `removeRoutineFromStack(routineId)` | ルーティンをスタックから外す |
| `toggleStackCheck(stackId, date)` | スタック内の全ルーティンを一括チェック/解除 |
| `reorderRoutineInStack(stackId, fromIdx, toIdx)` | スタック内並び替え |

### toggleStackCheck ロジック
- スタック内の今日アクティブなルーティンを取得
- 全てチェック済み → 全て解除
- 1つでも未チェック → 全てチェック
- 各ルーティンに対して既存の `toggleRoutineCheck` を呼ぶ（StarStack連携・エフェクト維持）

### データ取得拡張
- `routineStacks` state を追加（`Record<string, RoutineStack>`）
- `getRoutinesForNode` の返却値でスタック情報込みのグループ化データも返せるようにする
- キャッシュ・オフライン対応は既存パターンに準拠

## 3. RoutineWeeklyTable UI変更 (`components/routine/RoutineWeeklyTable.tsx`)

### Props 追加
```typescript
stacks: RoutineStack[];
onCreateStack: (title: string) => void;
onDeleteStack: (stackId: string) => void;
onUpdateStackTitle: (stackId: string, title: string) => void;
onAddToStack: (routineId: string, stackId: string) => void;
onRemoveFromStack: (routineId: string) => void;
onToggleStack: (stackId: string, date: string) => void;
onReorderInStack: (stackId: string, fromIdx: number, toIdx: number) => void;
```

### 表示構造（通常モード）

```
┌──────────────────────────────────────────────────────┐
│ [色●] 個別ルーティンA          │ ☐ ☑ ☐ ☑ ☐ ☐ ─  │  ← スタックに属さない
├──────────────────────────────────────────────────────┤
│ ▼ 朝の儀式              [☑]   │ ── ── ── ── ── ── │  ← スタックヘッダー + 一括チェック
│ ┃ [色●] 瞑想 5分              │ ☐ ☑ ☐ ☑ ☐ ☐ ─  │  ← スタック内ルーティン（左に縦線）
│ ┃ [色●] ジャーナリング        │ ☐ ☑ ☐ ☑ ☐ ☐ ─  │
│ ┗ [色●] ストレッチ 10分       │ ☐ ☐ ☐ ☑ ☐ ☐ ─  │  ← 最後は角丸の終端
├──────────────────────────────────────────────────────┤
│ [色●] 個別ルーティンB          │ ☑ ☑ ☐ ☑ ☐ ☐ ─  │
└──────────────────────────────────────────────────────┘
```

- **スタックヘッダー行**: タイトル + 一括チェックボタン（右端、今日の列に配置）
- **スタック内ルーティン**: 左端に縦線（スタックの色 or #6366F1）で連鎖を視覚化
- **一括チェックボタン**: 丸い大きめチェックアイコン。全完了で塗りつぶし、一部完了で半分、未完了で空

### 編集モード追加UI
- 「スタック作成」ボタン（既存の「追加...」の隣 or 下）
- ルーティン行をロングプレス → コンテキストメニューに「スタックに追加」「スタックから外す」
- スタックヘッダーをロングプレス → 名前変更・削除

## 4. PageContent.tsx 連携

`PageContent.tsx` の RoutineWeeklyTable 呼び出しに新しいpropsを追加。useRoutinesから取得したstack関連の関数を渡す。

## 5. 対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/20260218000000_create_routine_stacks.sql` | 新規テーブル + カラム追加 |
| `packages/shared/src/lib/pageMapper.ts` | RoutineStack型, Routine型拡張 |
| `apps/mobile/hooks/useRoutines.ts` | スタックCRUD, 一括チェック, キャッシュ拡張 |
| `apps/mobile/components/routine/RoutineWeeklyTable.tsx` | スタックUI表示, 編集モード拡張 |
| `apps/mobile/components/page/PageContent.tsx` | 新Props受け渡し |

## 6. 検証方法
1. マイグレーション適用 → `routine_stacks` テーブル・カラム確認
2. スタック作成 → ルーティンをスタックに追加 → 表示が連鎖UIになることを確認
3. 一括チェック → スタック内全ルーティンがチェックされる + StarStack連携確認
4. 個別チェック → 従来どおり動作確認
5. オフライン時のスタック操作がペンディングキューに入ることを確認
6. スタックから外す → 個別ルーティンに戻ることを確認
