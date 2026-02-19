# StarStack 3D モバイル実装プラン

## Context
StarStackはコア機能の一つ。ルーティン完了で星が瓶に物理的に蓄積する3Dビジュアライゼーション。Web版は Three.js + React Three Fiber + Rapier(WASM物理エンジン) で実装済み。モバイル版では R3F native renderer + JS簡易物理で3Dを実現する。ボード画面右上のsparkles(★)ボタンから開くモーダルとして実装。ボードごとに独立。

---

## Phase 1: パッケージ導入 + DB

### 1a. パッケージインストール
```bash
cd projects/vision-board/apps/mobile
npx expo install expo-gl three @react-three/fiber@^9 expo-three
```

**@react-three/drei は使わない** — `useMatcapTexture` がオフラインで使えない。代わりに `meshStandardMaterial` で表現。
**@react-three/rapier は使わない** — HermesでWASMが不安定。JS簡易物理で代替。

### 1b. app.json — expo-glプラグイン追加
**変更**: `apps/mobile/app.json` pluginsに `"expo-gl"` 追加

### 1c. Supabaseマイグレーション — star_stacking テーブル
```sql
CREATE TABLE star_stacking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  total_stars INTEGER NOT NULL DEFAULT 0,
  last_synced_total INTEGER NOT NULL DEFAULT 0,
  color_counts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, board_id)
);
ALTER TABLE star_stacking ENABLE ROW LEVEL SECURITY;
-- SELECT/INSERT/UPDATE/DELETE policies for auth.uid() = user_id
-- Index on (user_id, board_id)
```

### 1d. shared定数にMOBILEセクション追加
**変更**: `packages/shared/src/constants/starStack.ts`
```ts
MOBILE: {
  MAX_STARS: 200,           // Web版500 → モバイルは200
  SETTLE_THRESHOLD: 0.01,
  SETTLE_FRAMES: 30,
  GRID_SIZE: 0.48,
  PHYSICS_SUBSTEPS: 2,
  LATHE_SEGMENTS: 32,      // Web版64 → 半減
}
```

---

## Phase 2: 3Dコンポーネント

新規ディレクトリ: `apps/mobile/components/star-stack/`

### 2a. starGeometry.ts (~82行) — Web版そのままコピー
- ソース: `apps/web/src/components/features/star-stacking/starGeometry.ts`
- 4点双錐体(bipyramid)。Three.jsコアAPIのみ、プラットフォーム差なし

### 2b. starColors.ts (~25行) — Web版簡略化コピー
- ソース: `apps/web/src/components/features/star-stacking/starColors.ts`
- 10色パレット + `getRandomStarColorHex()` (hex string版のみ)

### 2c. StarBottle.tsx (~250行) — Web版移植
- ソース: `apps/web/src/components/features/star-stacking/StarBottle.tsx` (317行)
- **そのまま再利用**: `createBottleProfile()` (CatmullRomCurve3), `createRimProfile()`, LatheGeometry生成, コルクアニメーション(`useFrame`内)
- **変更**: `useMatcapTexture` → `meshStandardMaterial` (transparent, BackSide/FrontSide 2パス描画)
- **変更**: コルクCanvas texture → シンプルな `meshStandardMaterial` color: `#d4b896`, roughness: 0.95
- LatheGeometry segments: 64 → 32 (パフォーマンス)

### 2d. SimplePhysics.ts (~300行) — 新規（Rapier代替）
`useFrame` ループ内で実行するJS物理エンジン:
- **重力**: `vy -= 9.81 * dt`
- **床衝突**: Y < floorY → vy反転 * restitution(0.2)、摩擦適用
- **壁衝突**: XZ距離 > bodyRadius(0.6) → 法線方向反発
- **星間衝突**: 空間ハッシュグリッド(gridSize=0.48)で O(n) 判定、位置分離+速度交換
- **ダンピング**: linearDamping(0.5), angularDamping(0.3)
- **静止判定**: 速度 < 0.01 が 30フレーム連続 → settled=true → シミュレーション除外
- **サブステップ**: 2 (安定性向上)
- Float32Array使用 (GC軽減)

### 2e. StarMeshes.tsx (~80行) — InstancedMesh最適化
- 個別mesh × 200 → `InstancedMesh` × 1 で全星を1ドローコールで描画
- `useFrame` 内で各インスタンスの `matrix` + `instanceColor` を更新
- starGeometryを共有、`meshStandardMaterial` (metalness: 0.3, roughness: 0.5)

### 2f. StarStackScene.tsx (~100行) — Canvas統合
```tsx
import { Canvas } from '@react-three/fiber/native';
// ambientLight(0.6) + directionalLight([5,10,5]) + pointLight([-3,5,-3])
// <StarBottle showCork={showCork} />
// <StarMeshes stars={stars} physicsRef={physicsRef} />
// <TouchCameraControls /> — 1本指: 球面回転, ピンチ: ズーム
```

### 2g. TouchCameraControls (~60行) — OrbitControls代替
- Canvas の `onTouchStart/Move/End` でタッチ座標取得
- Spherical座標 (r, theta, phi) を更新 → `camera.position.setFromSpherical()`
- 制約: minPolar π/6, maxPolar π/2, minDistance 2, maxDistance 8

---

## Phase 3: Hook + 画面

### 3a. useStarStack.ts (~250行) — オフラインファースト版
- ソース参考: `apps/web/src/hooks/useStarStack.ts` (321行)
- **コアロジック**: Web版と同一 — `calculateTotalCompletedRoutines()` で全ルーティン完了数を算出、`lastSyncedTotal` との差分 = 新しい星数
- **追加**: AsyncStorageキャッシュ (`star_stack_cache_${boardId}`)
- **追加**: pendingStarColors は `toggleRoutineCheck` 時にAsyncStorageキューに色を追加。StarStack画面を開いた時に読み込んで消費
- **スポーン**: 500ms遅延 → 100ms間隔で1個ずつ落下 → 全完了後+1秒でコルク再表示
- **既存星復元**: `colorCounts` からボトル底部にランダム配置

### 3b. star-stack/[boardId].tsx (~180行) — モーダル画面
**新規ファイル**: `apps/mobile/app/(main)/star-stack/[boardId].tsx`

```
+-------------------------------+
| < Back   Star Stack     ★ 47 |
|                               |
|   +---------------------+    |
|   |                     |    |
|   |   [3D Canvas]       |    |
|   |   ガラス瓶 + 星     |    |
|   |                     |    |
|   +---------------------+    |
|                               |
|   Today: +3 ★                |
+-------------------------------+
```

- `useLocalSearchParams<{ boardId: string }>()` でboardId取得
- `useRoutines` で当該ボードのルーティン取得
- `useStarStack` で星の状態管理 + DB同期
- Canvas初期化中は `ActivityIndicator` 表示
- Canvas領域 = 画面高さの70%

### 3c. _layout.tsx — ルート登録
**変更**: `apps/mobile/app/(main)/_layout.tsx`
```tsx
<Stack.Screen
  name="star-stack/[boardId]"
  options={{
    presentation: 'modal',
    animation: 'slide_from_bottom',
    gestureEnabled: false,  // 3Dタッチ操作と競合防止
    gestureDirection: 'vertical',
  }}
/>
```

---

## Phase 4: 統合

### 4a. Sparklesボタン接続
**変更**: `apps/mobile/app/(main)/(tabs)/index.tsx` (行397-400)
```tsx
onRightPress={() => {
  if (selectedBoardId) {
    router.push(`/(main)/star-stack/${selectedBoardId}`);
  }
}}
```

### 4b. ルーティンチェック時に色をキューへ保存
**変更**: `apps/mobile/hooks/useRoutines.ts` (行373付近)
- `newChecked === true` 時に `AsyncStorage` の `star_pending_colors_${boardId}` にルーティン色を追加
- useStarStack側で消費して空にする

---

## 実装順序

| # | ファイル | 種別 | 行数 |
|---|---------|------|------|
| 1 | package.json / app.json | 変更 | +5行 |
| 2 | Supabase migration | 新規 | ~30行 |
| 3 | packages/shared/src/constants/starStack.ts | 変更 | +15行 |
| 4 | components/star-stack/starGeometry.ts | 新規(Web版コピー) | ~82行 |
| 5 | components/star-stack/starColors.ts | 新規(Web版簡略化) | ~25行 |
| 6 | components/star-stack/SimplePhysics.ts | 新規 | ~300行 |
| 7 | components/star-stack/StarBottle.tsx | 新規(Web版移植) | ~250行 |
| 8 | components/star-stack/StarMeshes.tsx | 新規 | ~80行 |
| 9 | components/star-stack/TouchCameraControls.tsx | 新規 | ~60行 |
| 10 | components/star-stack/StarStackScene.tsx | 新規 | ~100行 |
| 11 | hooks/useStarStack.ts | 新規 | ~250行 |
| 12 | app/(main)/star-stack/[boardId].tsx | 新規 | ~180行 |
| 13 | app/(main)/_layout.tsx | 変更 | +8行 |
| 14 | app/(main)/(tabs)/index.tsx | 変更 | +3行 |
| 15 | hooks/useRoutines.ts | 変更 | +10行 |

**合計**: 新規 ~1,327行 + 変更 ~41行

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| expo-gl + R3F native 互換性 | 高 | Phase 2最初にBox meshで動作確認。失敗時はGLView + 純Three.js |
| JS物理のパフォーマンス | 中 | 静止した星のスキップ、MAX_STARS=200、プロファイリング |
| モーダルジェスチャー競合 | 中 | `gestureEnabled: false` + 画面上部に明示的な閉じるボタン |
| InstancedMesh色更新 | 低 | 失敗時は色グループごとに別InstancedMeshを作成 |

---

## 検証方法
1. `npx expo install` 後にビルドエラーなしを確認
2. StarStack画面を開く → 3D Canvas + 空のボトルが表示されること
3. ルーティンをチェック → StarStack画面を開く → 新しい星が上から落下すること
4. 星が瓶底に着地し弾んで静止すること
5. アプリ再起動 → StarStack画面 → 前回の星がボトル底部に復元されること
6. 200個の星でも60fps維持を確認（Androidで特に検証）
7. `npx tsc --noEmit` — 新規TSエラーなし
