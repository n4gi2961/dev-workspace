# @gorhom/bottom-sheet による pull-to-dismiss 実装計画

## Context

260210でページ画面に横スワイプカルーセル（水平FlatList）を追加した結果、ネイティブモーダルの下スワイプdismissがジェスチャー競合で無効化された。カスタムGesture.Pan()実装は複雑になりすぎてロールバック済み。

`@gorhom/bottom-sheet` の `enablePanDownToClose` + `BottomSheetScrollView` を使うことで、スクロールとdismissの競合問題をライブラリ側が解決する。

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|----------|
| 1 | `apps/mobile/package.json` | `@gorhom/bottom-sheet` 追加 |
| 2 | `apps/mobile/app/(main)/_layout.tsx` | page/[nodeId] の presentation を `transparentModal` に変更、gestureEnabled: false |
| 3 | `apps/mobile/app/(main)/page/[nodeId].tsx` | BottomSheet でコンテンツをラップ、onClose で router.back() |
| 4 | `apps/mobile/components/page/PageContent.tsx` | `Animated.ScrollView` → `BottomSheetScrollView` に差し替え |

---

## Step 1: パッケージインストール

```bash
cd apps/mobile && npx expo install @gorhom/bottom-sheet
```

peer deps の `react-native-reanimated` (~4.1.1) と `react-native-gesture-handler` (~2.28.0) はインストール済み。

---

## Step 2: `_layout.tsx` — モーダル設定変更

```typescript
// 変更前
presentation: 'modal',
animation: 'slide_from_bottom',
gestureEnabled: true,
gestureDirection: 'vertical',

// 変更後
presentation: 'transparentModal',
animation: 'none',           // BottomSheetが独自アニメーションを持つ
gestureEnabled: false,        // BottomSheetに委譲
contentStyle: { backgroundColor: 'transparent' },
```

BottomSheetが自前でスライドインアニメーション + 背景暗転を行うため、Stackモーダルのアニメーションとジェスチャーは無効化する。

---

## Step 3: `[nodeId].tsx` — BottomSheet ラッパー追加

```
GestureHandlerRootView (flex: 1, backgroundColor: transparent)
└── BottomSheet
    ├── snapPoints={['100%']}
    ├── enablePanDownToClose={true}
    ├── onClose={handleClose}  // → router.back()
    ├── backgroundStyle={{ borderTopLeftRadius: 16, ... }}
    ├── handleIndicatorStyle={{ ... }}  // グラブバー表示
    │
    ├── [複数画像の場合] FlatList (horizontal, pagingEnabled) ← 通常FlatListのまま
    │   └── renderItem: PageContent
    └── [単一/テキストの場合] PageContent 直接
```

- 水平FlatListはそのまま維持（水平スクロールは垂直dismissと競合しない）
- `onChange` で index 0（閉じた状態）を検知して `router.back()`
- `enableDynamicSizing={false}` で100%固定

---

## Step 4: `PageContent.tsx` — ScrollView 差し替え

```typescript
// 変更前
import Animated, { ... } from 'react-native-reanimated';
// <Animated.ScrollView onScroll={scrollHandler} ... />

// 変更後
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
// <BottomSheetScrollView onScroll={scrollHandler} ... />
```

`BottomSheetScrollView` は内部で Reanimated の `Animated.ScrollView` を使用しているため、`useAnimatedScrollHandler` で作った `scrollHandler` をそのまま `onScroll` に渡せる。コンパクトヘッダーのアニメーションロジックは変更不要。

`bounces={false}` は削除する（BottomSheetがスクロール上端でのdismiss判定を行うために、デフォルトのバウンス挙動が必要）。

---

## 注意点

- `BottomSheetScrollView` に `scrollEventThrottle={16}` を明示的に設定（Reanimated scrollHandler との互換性確保）
- `GestureHandlerRootView` が必要（モーダル内でジェスチャーを動作させるため）
- HorizontalPageIndicator のドット表示は変更不要

---

## 検証方法

1. `npx tsc --noEmit` で新規エラーなしを確認
2. Expo Go で以下を動作確認:
   - 画像ロングプレス → ページ画面が下からスライドイン
   - ページ内を上下スクロール → 正常にスクロール
   - スクロール上端で下にスワイプ → dismiss（画面が下に消える）
   - 横スワイプ → ページ切り替え（複数画像時）
   - コンパクトヘッダー → スクロールでフェードイン/アウト正常
