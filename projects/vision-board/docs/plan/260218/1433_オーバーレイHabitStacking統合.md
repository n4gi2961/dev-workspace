# ボード・Focusオーバーレイへの Habit Stacking 統合

## Context
RoutineWeeklyTable（ページ詳細モーダル）では既にスタック表示・一括チェックが実装されているが、
ボードキャンバスのオーバーレイ（NodeOverlay）と Focusタブ（ambient.tsx）では
ルーティンがフラットリストのみで表示されスタック情報が欠落している。
スタックタイトル+一括チェックボタンを追加し、押すと500ms間隔で順番にリップル/流星アニメが実行されるよう統合する。

**影響ファイル:** 5ファイル変更（新規ファイルなし）

---

## 実装計画

### Step 1: `NodeOverlay.tsx` — 型拡張 + スタックUI追加

**変更箇所 1-1: インポート追加**
```typescript
import { useMemo } from 'react';
import { Layers } from 'lucide-react-native';          // 既存 Check, Circle に追加
import type { Routine, RoutineStack, Milestone } from '@vision-board/shared/lib';  // RoutineStack 追加
```

**変更箇所 1-2: OverlayData 型に stacks 追加**
```typescript
export interface OverlayData {
  title: string;
  routines: Routine[];
  milestones: Milestone[];
  clearPercent: number;
  hoverFontSize?: string;
  stacks?: RoutineStack[];   // 追加
}
```

**変更箇所 1-3: NodeOverlayProps に onToggleStack 追加**
```typescript
interface NodeOverlayProps {
  ...既存...
  onToggleStack?: (stackId: string, event: GestureResponderEvent) => void;  // 追加
}
```

**変更箇所 1-4: コンポーネント内でメモ化ヘルパーを追加（既存ルーティンリストの直後）**
```typescript
// スタックIDをキーにしたルーティンマップ
const stackRoutineMap = useMemo(() => {
  const map: Record<string, Routine[]> = {};
  if (!data.stacks) return map;
  for (const stack of data.stacks) {
    map[stack.id] = data.routines
      .filter(r => r.stackId === stack.id)
      .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
  }
  return map;
}, [data.routines, data.stacks]);

// スタック未所属ルーティン
const standaloneRoutines = useMemo(
  () => data.routines.filter(r => !r.stackId),
  [data.routines],
);
```

**変更箇所 1-5: Routines section を置き換え**

現在の `{data.routines.length > 0 && (...)}` ブロックを以下に置き換え：
- **スタック未所属ルーティン**（standaloneRoutines）→ 従来通りの行をそのまま表示
- **スタック**（data.stacks）→ スタックごとに以下を表示：
  - スタックヘッダー行（Layers アイコン + タイトル + 丸型一括チェックボタン）
  - スタック内ルーティン（左端に縦線 + 既存 routineItem スタイルで表示）

一括チェックボタンの3状態：
- allChecked → `backgroundColor: '#6366F1'`（塗りつぶし紫）
- someChecked → `backgroundColor: '#6366F160'`（半透明紫）
- none → `backgroundColor: 'rgba(255,255,255,0.12)'`（グレー）

ボタンサイズ: `Math.round(26 * scaleFactor)` px の円
タッチ: `onPress={(event) => onToggleStack?.(stack.id, event)}`

縦線: `width: 2, backgroundColor: '#6366F140', borderRadius: 1` の View（position: relative、高さはルーティン数に応じて自動）

---

### Step 2: `index.tsx` — stacks 取得・handleOverlayToggleStack 追加

**変更箇所 2-1: useRoutines の destructuring に追加（L119-125）**
```typescript
const {
  getRoutinesForNode,
  getStacksForNode,      // 追加
  toggleRoutineCheck,
  toggleStackCheck,       // 追加
  isRoutineActiveToday,
  isMeteorWinner,
  reload: reloadRoutines,
} = useRoutines(selectedBoardId, user?.id ?? null);
```

**変更箇所 2-2: overlayDataMap に stacks を追加（L185-200）**
```typescript
map[nodeId] = {
  title: page?.title || '',
  routines: nodeRoutines,
  milestones: page?.milestones || [],
  clearPercent: cpOverrides[nodeId] ?? clearPercentMap[nodeId] ?? 100,
  hoverFontSize: node?.hoverFontSize,
  stacks: getStacksForNode(nodeId),  // 追加
};
```

**変更箇所 2-3: handleOverlayToggleStack を handleOverlayToggleRoutine の直後に追加**
```typescript
const handleOverlayToggleStack = useCallback(
  (nodeId: string, stackId: string, event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const data = overlayDataMapRef.current[nodeId];
    if (!data) return;

    const stackRoutines = data.routines
      .filter(r => r.stackId === stackId)
      .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0))
      .filter(r => {
        if (!r.activeDays) return true;
        const dayOfWeek = new Date(today).getDay();
        return r.activeDays.includes(dayOfWeek);
      });
    if (stackRoutines.length === 0) return;

    const allChecked = stackRoutines.every(r => !!r.history[today]);
    const newChecked = !allChecked;
    const routinesToFire = stackRoutines.filter(r => !!r.history[today] !== newChecked);

    // 500ms間隔で逐次リップル+流星（チェック時のみ）
    if (newChecked) {
      routinesToFire.forEach((routine, i) => {
        setTimeout(() => {
          const color = routine.color || '#6366F1';
          effects.triggerRipple(pageX, pageY, color);
          if (isMeteorWinner(routine.id)) effects.triggerMeteor(color);
        }, i * 500);
      });
    }

    toggleStackCheck(stackId, today);
  },
  [today, effects, isMeteorWinner, toggleStackCheck],
);
```

**変更箇所 2-4: BoardCanvas に onOverlayToggleStack を追加**（JSX内）

---

### Step 3: `BoardCanvas.tsx` — prop 中継

```typescript
// Props 型に追加
onOverlayToggleStack?: (nodeId: string, stackId: string, event: GestureResponderEvent) => void;

// CanvasNode レンダリング時に渡す
onOverlayToggleStack={onOverlayToggleStack}
```

---

### Step 4: `CanvasNode.tsx` — prop 中継

```typescript
// Props 型に追加
onOverlayToggleStack?: (nodeId: string, stackId: string, event: GestureResponderEvent) => void;

// NodeOverlay に渡す
onToggleStack={(stackId, event) => onOverlayToggleStack?.(node.id, stackId, event)}
```

---

### Step 5: `ambient.tsx` — FocusOverlay にスタック統合

**変更箇所 5-1: インポート追加**
```typescript
import type { RoutineStack } from '@vision-board/shared/lib';
```

**変更箇所 5-2: useRoutines の destructuring に追加**
```typescript
getStacksForNode,   // 追加
toggleStackCheck,   // 追加
```

**変更箇所 5-3: overlayData（useMemo）に stacks 追加**
```typescript
stacks: getStacksForNode(currentNode.id),
```

**変更箇所 5-4: FocusOverlay の型定義に onToggleStack 追加**
```typescript
onToggleStack?: (stackId: string, event: GestureResponderEvent) => void;
```

**変更箇所 5-5: handleToggleStack を追加（handleToggleRoutine の直後）**
index.tsx の handleOverlayToggleStack と同パターン。
`overlayData` を deps に含める（ambient.tsxはシングルノード表示のため ref 不要）。

**変更箇所 5-6: FocusOverlay 内のルーティン表示をスタック対応に**
NodeOverlay と同じグループ化ロジック（standaloneRoutines + スタックヘッダー+縦線+ルーティン）。
フォントサイズはスケール計算不要（固定 13px 程度で実装）。

**変更箇所 5-7: FocusOverlay 呼び出し時に onToggleStack={handleToggleStack} を渡す**

---

## 実装順序

1. `NodeOverlay.tsx`（型変更 → メモ化 → UI）
2. `index.tsx`（追加取得 → overlayDataMap → handler → JSX）
3. `BoardCanvas.tsx`（prop 追加）
4. `CanvasNode.tsx`（prop 追加 → NodeOverlay へ渡す）
5. `ambient.tsx`（型 → 取得 → overlayData → handler → FocusOverlay UI）

---

## 検証方法

1. スタックを含むボードを閲覧モードで表示 → オーバーレイを開く → スタックヘッダーと縦線が表示される
2. 一括チェックボタンが3状態（未/部分/全）で正しく表示される
3. ボタンを押すと 500ms 間隔でルーティンが順番にチェックされ、リップル（タップ位置から）と流星（当選時）が発火する
4. Focusタブでも同様の動作を確認
5. スタックなしのボード/ノードで従来通りフラットリスト表示が維持される
