# StarStack 窓際シーン背景クオリティ向上プラン

## Context
現在のStarStack 3D背景はBoxGeometry+フラットカラーで構成されており、理想の参考画像（nanobanana Proで生成した写真品質の窓際シーン）と大きなクオリティ差がある。背景をAI生成テクスチャ画像に置き換え、パラレックス効果で奥行き感を維持する。

## 用意してほしい画像（3枚）

すべて**PNG形式、サイズは1024×1536px**（縦長、スマホ画面比率）。

### Layer 0: 夜空・都市ボケ（最奥レイヤー）
- **内容**: 窓の外に見える夜景。月、夜空、街のボケ光（暖色オレンジ系の丸ボケ）
- **透明度**: 不要（全面塗りつぶし）
- **重要**: 窓枠は含めない。純粋に「窓の外の景色」だけ
- **プロンプト例**: "Night cityscape through window, soft warm bokeh lights, full moon upper right, deep navy sky, no window frame, photorealistic"

### Layer 1: 窓枠・壁（中間レイヤー）
- **内容**: 木製窓枠（十字桟で4〜6ペインに分割）、窓周囲の暗い壁、窓ガラスの軽い霜/結露
- **透明度**: **必須** — 窓のガラス部分（窓枠の内側）を透明にして、後ろのLayer 0が見えるようにする
- **重要**: 窓枠の木目テクスチャ、壁の質感が品質の鍵。ボトルを置く位置（画面下半分中央）は棚板で塞がないこと
- **プロンプト例**: "Wooden window frame cross pattern with weathered dark brown wood grain, dark walls around, glass panes transparent (alpha), PNG with transparency"

### Layer 2: 棚板・窓台（最手前レイヤー）
- **内容**: ボトルが乗る木製の棚板/窓台を**手前から見た面**
- **透明度**: **必須** — 棚板以外は透明
- **配置**: 画面の下部1/4〜1/3程度。ボトルの底と接する位置
- **注意**: 棚板の上面は必要（ボトルが乗る面）、前面の断面も見えると質感UP
- **プロンプト例**: "Wooden windowsill shelf from front view, dark walnut wood grain, transparent background, realistic wood texture"

### 画像の重ね順
```
[手前] Layer 2 (棚板)     → ボトルの底を隠す
[中間] ボトル+星 (3D)      → 既存のまま
[中間] Layer 1 (窓枠・壁)  → 窓のガラス部分は透明
[最奥] Layer 0 (夜空・ボケ) → 全面背景
```

## 実装計画

### Step 1: テクスチャローダー（新規）
**ファイル**: `hooks/useSceneTextures.ts`（新規）

- `expo-asset` の `Asset.loadAsync()` + `expo-three` の `loadTextureAsync()` でPNG読み込み
- WebGL1制約: `ClampToEdgeWrapping` + `LinearFilter`（Mipmap不可）
- `{ sky, window, shelf, loaded }` を返すフック
- 画像ファイル: `assets/images/star-stack/` に配置（require()で参照）

### Step 2: ParallaxBackground コンポーネント（新規）
**ファイル**: `components/star-stack/ParallaxBackground.tsx`（新規）

3枚のPlaneGeometryにテクスチャを貼り、Z深度を変えて配置:

| レイヤー | Z位置 | パラレックス係数 | マテリアル |
|---------|------|---------------|----------|
| Layer 0 (夜空) | -5.0 | 0.05 | MeshBasicMaterial（ライティング不要） |
| Layer 1 (窓枠) | -1.8 | 0.15 | MeshBasicMaterial + transparent |
| Layer 2 (棚板) | 0.2 | 0.02（ほぼ固定） | MeshBasicMaterial + transparent |

- `useFrame` でカメラ位置を読み取り、各レイヤーのx/y位置をオフセット
- パラレックス係数が異なるため、カメラ回転時に奥行き感が出る
- 各レイヤーは視野角より十分大きいサイズにして端が見えないようにする

### Step 3: StarStackScene.tsx 修正
**ファイル**: `components/star-stack/StarStackScene.tsx`

- `useSceneTextures()` を呼び出し
- `textures.loaded` の場合: `<ParallaxBackground textures={textures} />` を描画
- `!textures.loaded` の場合: 既存の `<WindowScene />` をフォールバック表示
- **ライティング調整**: 背景がテクスチャになるため、ライトはボトル+星のみに効く。月光を前面から当ててガラスの反射を強調

### Step 4: StarBottle.tsx ガラス質感強化
**ファイル**: `components/star-stack/StarBottle.tsx`

背景が写真品質になるとボトルの質感も重要になる:
- 背面メッシュ: `color` を青みのある白 `#c8d8e0` に、`roughness: 0.05`（より滑らか）
- 前面メッシュ: `opacity: 0.25`（より薄く）、`color: #e8f4ff`
- コルクの `heightSegments` を3に増やしてライティング変化を追加

### Step 5: sceneConstants.ts 更新
**ファイル**: `components/star-stack/sceneConstants.ts`

- パラレックス係数の定数追加
- レイヤー位置・サイズの定数追加
- ライティングをボトル特化に再調整（アンビエント低め、月光をカメラ寄りに）

### Step 6: WindowScene.tsx — 既存コードは保持
フォールバック用として残す。将来的にテクスチャ読み込みが安定したら削除検討。

## 削除/変更なし
- `StarMeshes.tsx` — 変更なし
- `TouchCameraControls.tsx` — 変更なし
- `SimplePhysics.ts` — 変更なし
- `starGeometry.ts` — 変更なし

## 変更ファイル一覧

| 順序 | ファイル | 変更種別 |
|------|---------|---------|
| 1 | `assets/images/star-stack/*.png` | 新規（ユーザーが画像用意） |
| 2 | `hooks/useSceneTextures.ts` | 新規 |
| 3 | `components/star-stack/sceneConstants.ts` | 修正（定数追加） |
| 4 | `components/star-stack/ParallaxBackground.tsx` | 新規 |
| 5 | `components/star-stack/StarStackScene.tsx` | 修正（ParallaxBackground統合） |
| 6 | `components/star-stack/StarBottle.tsx` | 修正（ガラス質感強化） |

## 検証方法
1. `npx tsc --noEmit` で新規エラーなし確認
2. テクスチャ3枚を配置後、実機でStarStack画面を開き背景画像が表示されることを確認
3. カメラ回転でレイヤー間のパラレックス効果が自然に見えることを確認
4. テクスチャ読み込み前にフォールバック（既存WindowScene）が表示されることを確認
5. ボトルのガラス質感が背景と調和していることを確認
6. iPhone 12クラスで60fps維持を確認
