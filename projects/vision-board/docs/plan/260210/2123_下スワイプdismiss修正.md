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


# 重要：ユーザー追記
pull-down dismiss大幅実装前に、[main 88b87f3] feat: Vision Board モバイルアプリ 260210全セッション分としてコミット、プッシュを行った。その後のコードが大規模かつ明後日の方向に進んだ(この計画)ので上記にロールバックした。その際いくつかの未コミットの変更を破棄した。
  - 変更済みファイル: SuburbsSound.ts, _layout.tsx, PageContent.tsx, など
  - 未追跡ファイル: experiments/PageScreen.tsx, 多数の Zone.Identifier ファイルなど 

再度実行し基本機能での不具合はなかったが、以前出現した画像追加時のエラーが再発していたので対処する。
教訓：夜のclaudeに大規模な修正やプラン建てをさせない。軽微な修正を残しておく。

またpull-down dismissの実装は、下記の解説を参考にする。

2. 既存ライブラリのpull-to-dismiss機能
react-native-bottom-sheet (⭐推奨)
GitHub: gorhom/react-native-bottom-sheet
特徴：

Reanimated v2 + Gesture Handler v2 ベースでジェスチャー競合を内部で解決済み
内蔵の BottomSheetScrollView がスクロールとdismissの切り替えをネイティブレベルで処理
あなたがClaude Codeに作らせたもの（ScrollView内のpull-to-dismiss）を、すでに解決された形で提供している
tsx
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
function PageModal() {
  const sheetRef = useRef<BottomSheet>(null);
  
  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={['100%']}        // フルスクリーン
      enablePanDownToClose={true}   // ← これだけでpull-to-dismiss完成
      enableDynamicSizing={false}
    >
      <BottomSheetScrollView>
        {/* コンテンツ */}
        {/* ScrollViewの上端にいるときだけ下スワイプでdismiss */}
        {/* → ジェスチャー競合はライブラリが解決済み */}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
ポイント： BottomSheetScrollView を使うだけで、スクロールとdismissの競合問題が自動的に解決されます。manualActivation も requireExternalGestureToFail も不要です。

react-native-modalize
特徴：

react-native-bottom-sheet より古い、やや機能が少ない
ただし設定がシンプルで、基本的なモーダル＋dismiss用途には十分
tsx
import { Modalize } from 'react-native-modalize';
<Modalize
  modalHeight={windowHeight}
  closeOnOverlayTap={true}
  panGestureEnabled={true}      // ← pull-to-dismiss有効
  closeSnapPointStraightEnabled={false}
>
  {/* コンテンツ（ScrollViewは内蔵） */}
</Modalize>
比較表
項目	bottom-sheet	modalize	今の自前実装
ジェスチャー競合処理	✅ 内部で解決	✅ 内部で解決	❌ 手動で戦う
Reanimated v2対応	✅	△ (v1ベース)	✅
Gesture Handler v2対応	✅	❌	✅
コード複雑度	低い	低い	非常に高い
snap points (中間位置)	✅	✅	❌
メンテナンス状況	活発	ほぼ停止	-
おすすめ
@gorhom/bottom-sheet を使って、ページ表示モーダルをBottomSheet + BottomSheetScrollViewに置き換えるのが最善です。

理由：

あなたのアプリはすでに react-native-reanimated と react-native-gesture-handler を使っている → 追加依存が最小
Claude Codeが100行以上かけて解決しようとした問題が、enablePanDownToClose={true} の1行で解決する
横スワイプ（ページ切り替え）との共存も simultaneousHandlers で比較的簡単に対応可能