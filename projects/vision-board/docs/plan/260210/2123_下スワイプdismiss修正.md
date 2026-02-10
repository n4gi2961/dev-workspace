# 下スワイプ dismiss 修正計画

## Context

`page/[nodeId]` 画面に水平 FlatList（ページカルーセル）を追加した後、モーダルの下スワイプ dismiss が効かなくなった。ネイティブモーダルジェスチャーが、FlatList + 内部 `Animated.ScrollView`（`bounces={false}`）とのジェスチャー競合で無効化されている。

**方針**: ネイティブモーダルジェスチャーを無効化し、`Gesture.Pan()` + `manualActivation` でカスタム pull-to-dismiss を実装する。既存コードベース（`BoardCanvas.tsx`, `ImageCropModal.tsx`）で同パターンを使用済み。

---

## 変更ファイル

| # | ファイル | 変更量 |
|---|---------|--------|
| 1 | `app/(main)/_layout.tsx` | 1行変更 |
| 2 | `components/page/PageContent.tsx` | ~5行変更 |
| 3 | `app/(main)/page/[nodeId].tsx` | ~80行追加 |

---

## Step 1: `_layout.tsx` — ネイティブジェスチャー無効化

`gestureEnabled: true` → `gestureEnabled: false` に変更（L51）。カスタムジェスチャーで代替するため。

## Step 2: `PageContent.tsx` — scrollY の外部公開

- `PageContentProps` に `externalScrollY?: SharedValue<number>` を追加
- scrollY 初期化を条件分岐:
  ```ts
  const internalScrollY = useSharedValue(0);
  const scrollY = externalScrollY ?? internalScrollY;
  ```
- 既存の `scrollHandler`, `collapsePoint`, `useAnimatedReaction`, `compactHeaderAnimStyle` は変更不要（すべて `scrollY` 変数を参照しているため自動的に外部値を使う）

## Step 3: `[nodeId].tsx` — カスタム dismiss ジェスチャー

### 3a. import 追加
```ts
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
```

### 3b. 定数
```ts
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 800;
const HORIZONTAL_FAIL = 15;
```

### 3c. Shared values
```ts
const translateY = useSharedValue(0);
const dismissOpacity = useSharedValue(1);
const activeScrollY = useSharedValue(0);
const startY = useSharedValue(0);
const startX = useSharedValue(0);
const gestureActive = useSharedValue(false);
```

### 3d. dismiss ジェスチャー定義（`manualActivation`）

**判定ロジック**:
- `activeScrollY <= 1` かつ下方向 8px 以上 → activate（dismiss開始）
- 横方向 15px 先行 → fail（FlatList ページング優先）
- 上方向 → fail（通常スクロール優先）

### 3e. アニメーション
- `onUpdate`: `translateY = max(0, translationY)`, opacity 減衰
- `onEnd`: `translationY > 120 || velocityY > 800` → `withTiming` で画面外 + `runOnJS(handleClose)`、それ以外 → `withTiming(0)` で復帰

### 3f. JSX ラップ
FlatList ケース・単一ページケース両方を:
```
GestureHandlerRootView → GestureDetector → Animated.View(dismissAnimatedStyle) → 既存コンテンツ
```

### 3g. renderItem 修正
`PageContent` に `externalScrollY={activeScrollY}` を渡す。

### 3h. ページ切替時の scrollY リセット
`onViewableItemsChanged` 内で `activeScrollY.value = 0`（新ページは常にトップから開始）。
