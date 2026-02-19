# StarStack 窓際シーン背景実装プラン

## Context
StarStack画面の背景が真っ黒で味気ない。参考画像の「窓際に置かれた瓶」の雰囲気を3Dシーン内に再現する。全要素を3D空間に配置することで、カメラ回転時に窓枠・棚・夜景すべてが自然なパララックスで動く。

## 変更ファイル一覧

| 順序 | ファイル | 変更 |
|------|----------|------|
| 1 | `components/star-stack/sceneConstants.ts` | **新規** — 窓シーンの座標・色・サイズ定数 |
| 2 | `packages/shared/src/constants/starStack.ts` | azimuth角度制限の定数追加 |
| 3 | `components/star-stack/WindowScene.tsx` | **新規** — 棚板・窓枠・壁・夜空・月・ボケ光 |
| 4 | `components/star-stack/StarStackScene.tsx` | WindowScene挿入 + ライティング変更 |
| 5 | `components/star-stack/TouchCameraControls.tsx` | theta(azimuth)制限追加 |

## Step 1: sceneConstants.ts（新規）

窓シーン全体の座標・色・サイズ定数をまとめる。

## Step 2: starStack.ts に azimuth 定数追加

```
ORBIT_CONTROLS に追加:
  MIN_AZIMUTH_ANGLE: -Math.PI / 3   // -60°
  MAX_AZIMUTH_ANGLE: Math.PI / 3    // +60°
```

theta無制限だと裏側（窓のない方向）が見えてしまうため、正面±60°に制限。

## Step 3: WindowScene.tsx（新規）— メイン

全要素を1コンポーネントにまとめる。ジオメトリはすべてuseMemoで1回だけ生成。

### 3-1. 棚板 (Shelf)
```
BoxGeometry(4, 0.12, 2.5)
Position: [0, -1.31, 0]  ← ボトル底(Y=-1.25)の直下
Material: color #5a3a1a, roughness 0.85
```

### 3-2. 窓枠 (Window Frame)
ボトルの後方(z=-1.8)に木枠。4本の外枠 + 十字桟2本 = 6 BoxGeometry。
```
窓開口部: 幅2.8 x 高さ3.2、中心 [0, 1.0, -1.8]
外枠: BoxGeometry(0.15厚)、color #3d2b1f, roughness 0.9
十字桟: BoxGeometry(0.08厚)、同色
```

### 3-3. 壁 (Walls)
窓の周囲を囲む。左右壁 + 上壁 + 下壁 = 4 BoxGeometry。
```
Position: z=-1.8（窓枠と同一面）
Material: color #1a1520, roughness 0.95
```

### 3-4. 夜空背景面 + 月
```
夜空: PlaneGeometry(8, 6), z=-3.0, color #0a0a1a (MeshBasicMaterial)
月: SphereGeometry(0.35, 16, 16), [1.8, 3.2, -4.0], color #e8e0c8
月グロー: PlaneGeometry(1.5, 1.5), AdditiveBlending, opacity 0.15
```

### 3-5. 街灯ボケ光 (City Bokeh)
InstancedMesh × 1で60〜80個の小さな光を配置。1ドローコール。
```
Geometry: PlaneGeometry(0.08, 0.08)
配置範囲: X[-3.5, 3.5], Y[-0.5, 2.5], Z[-2.5, -4.0]
Material: MeshBasicMaterial, AdditiveBlending
色: 70% #ffbb44(暖色) / 20% #ff8844(オレンジ) / 10% #aaccff(青白)
opacity: 0.3〜0.7ランダム
```

## Step 4: StarStackScene.tsx 変更

### ライティング変更（明るい → ムーディー窓際）
```
Before:
  ambientLight(0.6) + directional[5,10,5](0.8) + point[-3,5,-3](0.4)

After:
  ambientLight(0.15, color="#1a1030")           ← 全体を暗く
  directionalLight([2,4,-3], 0.3, "#8899bb")    ← 月光（窓から斜めに）
  pointLight([0,0,-2.5], 0.4, "#ff9944")        ← 街灯の暖色反射
  pointLight([1.5,2,1], 0.15, "#ffffff")         ← ボトル輪郭用リムライト
```

### コンポーネント配置
```tsx
<WindowScene />       ← StarBottleの前に追加
<StarBottle ... />
<StarMeshes ... />
<TouchCameraControls ... />
```

## Step 5: TouchCameraControls.tsx 変更

spherical.thetaにmin/maxクランプを追加:
```typescript
spherical.theta = clamp(spherical.theta, MIN_AZIMUTH, MAX_AZIMUTH)
```
慣性スクロール中も同様にクランプ。

## パフォーマンス

追加ジオメトリ: 約1,400頂点（既存ボトル5,120頂点と比較して軽量）
- 静的ジオメトリ → useMemoで1回生成
- ボケ光 → InstancedMesh 1ドローコール
- 夜空・月 → MeshBasicMaterial（ライティング計算なし）

## 検証方法
1. `npx tsc --noEmit` で新規エラーなし確認
2. 実機でStarStack画面を開き、窓際シーンが表示されることを確認
3. カメラ回転で窓枠・棚に自然なパララックスが出ることを確認
4. theta制限（±60°）が機能し、裏側が見えないことを確認
5. 星の物理・スポーン・カメラ慣性が既存通り動作することを確認
6. iPhone 12クラスで60fps維持を確認
