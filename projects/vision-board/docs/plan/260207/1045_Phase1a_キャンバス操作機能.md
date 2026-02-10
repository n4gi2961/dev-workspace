# Phase 1a: キャンバス操作機能

## Context

Phase 0（基盤整備）、Phase 0.5（UIコンポーネントライブラリ）完了済み。
現在のBoardCanvas.tsxにはピンチズーム+パンジェスチャーのみ実装済み。ノードは表示のみで操作不可。
R2画像アップロードは次回（Phase 1b）に回し、今回はキャンバスでのノード操作に集中する。

**今回のスコープ:**
- useNodesフック（オフラインファースト）
- ノードのドラッグ移動＆リサイズ
- FABメニュー（展開アニメーション）
- ノード選択UI（ハンドル＋ツールバー）
- 画像ノードエディタ（レイヤー順序・サイズプリセット）
- テキストノードエディタ
- 新UIコンポーネント（TopBar, TabBar）の既存画面への適用

---

## 1. useNodes フック

**ファイル:** `apps/mobile/hooks/useNodes.ts`

useBoardsパターンを踏襲したオフラインファーストフック。

```typescript
interface CanvasNode {
  id: string;
  board_id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  image_url?: string;       // 画像ノード
  content?: string;          // テキストノード
  font_size?: number;
  color?: string;
  corner_radius?: number;
}

interface PendingAction {
  type: 'create' | 'update' | 'delete';
  nodeId: string;
  data?: Partial<CanvasNode>;
  timestamp: number;
  tempId?: string;
}
```

**API:**
```typescript
function useNodes(boardId: string | null, userId: string | null) {
  return {
    nodes: CanvasNode[];
    loading: boolean;
    isOffline: boolean;
    pendingCount: number;
    selectedNodeId: string | null;

    // CRUD
    addNode(node: Omit<CanvasNode, 'id' | 'board_id'>): Promise<CanvasNode>;
    updateNode(nodeId: string, updates: Partial<CanvasNode>): Promise<void>;
    deleteNode(nodeId: string): Promise<void>;

    // 選択
    selectNode(nodeId: string | null): void;

    // レイヤー操作
    bringToFront(nodeId: string): void;
    bringForward(nodeId: string): void;
    sendBackward(nodeId: string): void;
    sendToBack(nodeId: string): void;

    // 同期
    refresh(): Promise<void>;
    syncPending(): Promise<void>;
  };
}
```

**キャッシュキー:** `nodes_cache_{boardId}` / `nodes_pending_queue`

**Supabaseテーブル:** 既存の`nodes`テーブル（columns: id, board_id, type, x, y, width, height, image_url, content, font_size, color）。z_indexカラムが未定義の場合は追加マイグレーション必要。

---

## 2. BoardCanvas 書き換え

**ファイル:** `apps/mobile/components/canvas/BoardCanvas.tsx` — 大幅リファクタ

**現状の問題:**
- ノード表示のみで操作不可
- Supabase直接クエリ（useNodesフックに移行すべき）
- 選択・編集機能なし

**変更内容:**
- props: `boardId` + `nodes` + `selectedNodeId` + callbacks（useNodesからの値を受け取る）
- キャンバスジェスチャー（既存のpinch+pan維持）
- ノードごとにCanvasNodeコンポーネントを使用
- 選択状態管理: タップで選択、キャンバスタップで解除
- グリッドライン表示（.penの通りx:130,260 / y:200,400の十字線）

**ジェスチャー優先度ルール:**
- ノードドラッグ > キャンバスパン（ノード上のパンはドラッグ、空白のパンはキャンバス移動）
- ピンチズームは常にキャンバス操作

---

## 3. CanvasNode コンポーネント

**ファイル:** `apps/mobile/components/canvas/CanvasNode.tsx`

```typescript
interface CanvasNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  scale: SharedValue<number>;  // キャンバスのズームレベル（ドラッグ量補正用）
  onSelect: (nodeId: string) => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onResizeEnd: (nodeId: string, width: number, height: number, x: number, y: number) => void;
}
```

**機能:**
- タップで選択
- PanGestureでドラッグ移動（キャンバスscaleで移動量を補正: `delta / scale`）
- 選択時に8つのリサイズハンドル表示（.pen VuCUfの通り）
  - 角4点: 12x12白円
  - 辺中点4点: 10x10白円
- 選択枠: 2px `accent-primary`ボーダー
- ダブルタップでエディタ起動

### ImageNode / TextNode

CanvasNode内部でtype分岐:
- `image`: `expo-image`の`<Image>`でcornerRadius付き表示
- `text`: `<Text>`でfontSize/color付き表示

---

## 4. ノードツールバー

**ファイル:** `apps/mobile/components/canvas/NodeToolbar.tsx`

.pen VuCUfのImageToolBarに対応。選択ノード直下に表示。

```typescript
interface NodeToolbarProps {
  node: CanvasNode;
  onEdit: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
}
```

**構造（.penから）:**
- 背景: #2C2C2E, rounded-3xl, h-[45px]
- アイコンボタン: edit, separator, font-size操作, separator, trash(赤)

---

## 5. FABメニュー

**ファイル:** `apps/mobile/components/canvas/FABMenu.tsx`

Phase 0.5で作成した`ui/FAB`と`ui/FABMenuItem`を使用。

```typescript
interface FABMenuProps {
  onAddImage: () => void;
  onAddText: () => void;
}
```

**動作:**
- FABタップ → overlay(#00000060) + メニュー4項目が下から上へスライドイン
  - .penでは4項目あるが、今回は画像とテキストの2項目のみ（図形・メモは将来）
- メニュー項目タップ → アクション実行 + メニュー閉じる
- FABアイコン: 閉じた状態="plus" / 開いた状態="x"
- Reanimated: `withSpring` でメニュー展開アニメーション

---

## 6. 画像ノードエディタ

**ファイル:** `apps/mobile/components/canvas/ImageEditor.tsx`

.pen aNqAvのPopup構造。BottomSheet的に画面下部からスライドイン。

**機能:**
- アスペクト比選択: Free / Original / Portrait / Square / Landscape
- レイヤー操作: 最前面/前面/背面/最背面に移動
- サイズプリセット: Large / Medium / Small
- 削除ボタン

---

## 7. テキストノード追加/編集

テキストノード追加時:
1. FABメニューから「テキストを追加」タップ
2. キャンバス中央にデフォルトテキストノード配置（"テキスト", 24px, #FFFFFF）
3. タップで選択 → ダブルタップでインライン編集モード

**ファイル:** `apps/mobile/components/canvas/TextEditor.tsx`

- TextInput for inline editing
- フォントサイズ調整（ToolbarのA+/A-）
- カラー選択は将来フェーズ

---

## 8. 既存画面への新UIコンポーネント適用

### HomeScreen (`app/(main)/(tabs)/index.tsx`)
- `TopBar` → `ui/TopBar` に差し替え（title=ボード名, leftIcon="menu"）
- FABボタン → `FABMenu`コンポーネントに差し替え
- BoardCanvas → useNodesフック経由のprops受け渡し

### TabLayout (`app/(main)/(tabs)/_layout.tsx`)
- expo-routerの`tabBar`に`ui/TabBar`を設定
- tabBarIconName属性でアイコン名を渡す

---

## 9. Supabase スキーマ確認

既存`nodes`テーブルに`z_index`カラムがあるか確認が必要。なければマイグレーション追加:

```sql
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS z_index integer DEFAULT 0;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS corner_radius integer DEFAULT 12;
```

---

## 10. 実装順序

```
Step 1: Supabase nodesテーブル確認 + z_indexカラム追加（必要なら）
Step 2: useNodes フック作成
Step 3: CanvasNode コンポーネント（ドラッグ移動 + 選択UI）
Step 4: NodeToolbar（選択ノード直下のツールバー）
Step 5: FABMenu（展開アニメーション + 画像/テキスト追加アクション）
Step 6: ImageEditor + TextEditor
Step 7: BoardCanvas リファクタ（全統合）
Step 8: HomeScreen + TabLayout に新UIコンポーネント適用
```

---

## 11. 対象ファイル

### 新規作成
- `hooks/useNodes.ts` — オフラインファーストノード管理
- `components/canvas/CanvasNode.tsx` — ドラッグ&リサイズ可能ノード
- `components/canvas/NodeToolbar.tsx` — 選択ノードのツールバー
- `components/canvas/FABMenu.tsx` — 展開メニュー
- `components/canvas/ImageEditor.tsx` — 画像ノード編集
- `components/canvas/TextEditor.tsx` — テキスト編集

### 変更
- `components/canvas/BoardCanvas.tsx` — 大幅リファクタ
- `app/(main)/(tabs)/index.tsx` — 新TopBar + FABMenu + useNodes統合
- `app/(main)/(tabs)/_layout.tsx` — 新TabBar適用

---

## 12. 検証方法

1. ノード表示: boardId指定で既存ノードがキャンバスに表示される
2. ドラッグ: ノードをドラッグして移動 → 位置がSupabaseに保存
3. リサイズ: ハンドルドラッグでサイズ変更 → 保存
4. FAB: タップで展開 → 「テキストを追加」→ キャンバスにテキストノード出現
5. 削除: ノード選択 → ツールバーのゴミ箱 → ノード消失
6. オフライン: 機内モード → ノード操作 → オンライン復帰 → 同期確認
7. TabBar: 3タブ（Home/Focus/Profile）が新デザインで表示
