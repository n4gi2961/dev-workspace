# FocusScreen ルーティンチェックエフェクト実装計画（彩度版）

## Context

FocusScreenでルーティンをチェックした際の視覚フィードバックが未実装。
ウェブ版では「ブラー波紋 + 5%確率の流星」が実装済み。
モバイル版では **画像の彩度（saturation）** を変化させる方式で実装する。

**コアUX**: チェック時にタッチ位置からリップル（ルーティンカラー）が広がり、
円の内側の画像がより鮮やかになる。clearPercent=0%で完全グレースケール、100%でフルカラー。

## 技術方針
- RN 0.81.5 ネイティブ `filter: [{ saturate: N }]` で彩度制御（依存追加なし）
- 波紋: Animated.View円形クリッピング（overflow:hidden + borderRadius）で高彩度画像をリビール
- 流星: 5%確率、Reanimated + expo-linear-gradient
- clearPercent計算: 既存 `useClearPercent`（shared）を再利用

## 新規ファイル
1. `apps/mobile/hooks/useFocusEffects.ts` — 彩度・波紋・流星の統合state管理
2. `apps/mobile/components/focus/RippleEffect.tsx` — 円形Viewクリッピング + SVGリング
3. `apps/mobile/components/focus/MeteorEffect.tsx` — 流星コンポーネント

## 変更ファイル
1. `apps/mobile/app/(main)/(tabs)/ambient.tsx` — 彩度フィルター適用 + エフェクト統合
