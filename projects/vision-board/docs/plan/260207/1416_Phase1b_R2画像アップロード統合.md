# Phase 1b: R2 画像アップロード統合

## Context

Phase 1a（キャンバス操作）完了済み。画像追加ボタンは存在するが、現在はsrc=undefinedのプレースホルダーノードを作成するのみ（`index.tsx:41` の TODO）。R2 Workerは実装済みで、presign → PUT → CDN配信のフローが確立されている。本プランでは、モバイルアプリから画像を選択→圧縮→R2アップロード→ノード作成の一連のフローを実装する。

---

## 実装ステップ

### Step 0: パッケージインストール + 設定

```bash
cd projects/vision-board/apps/mobile
npx expo install expo-image-picker expo-image-manipulator expo-file-system
```

**`app.json`** — plugins に追加:
```json
["expo-image-picker", {
  "photosPermission": "ビジョンボードに画像を追加するために写真へのアクセスが必要です",
  "cameraPermission": "ビジョンボードに画像を追加するためにカメラへのアクセスが必要です"
}]
```

**`.env.local`** — Worker URLのコメント解除:
```
EXPO_PUBLIC_WORKER_URL=https://r2-api.asterize.workers.dev
```

---

### Step 1: R2StorageService 作成

**新規:** `apps/mobile/services/r2Storage.ts`

shared パッケージの `StorageService` インターフェース（`packages/shared/src/lib/storage.ts`）を実装。

- `uploadImage()`: POST `/upload/presign` → PUT `/upload/:key`（XHRでprogress取得）
- `deleteImage()`: DELETE `/images/:key`
- Worker URLは `process.env.EXPO_PUBLIC_WORKER_URL` から取得
- シングルトンexport

---

### Step 2: useImageUpload フック作成

**新規:** `apps/mobile/hooks/useImageUpload.ts`

**責務:** 画像選択 → 圧縮 → R2アップロード → オフラインキュー管理

**API:**
```typescript
function useImageUpload(userId: string | null, authToken: string | null) {
  return {
    isUploading: boolean;
    progress: number;        // 0-100
    error: string | null;
    pickImage(source: 'camera' | 'gallery'): Promise<ImagePickerAsset | null>;
    uploadImage(asset, boardId, nodeId): Promise<{ publicUrl, localUri, width, height }>;
    syncPendingUploads(): Promise<number>;
  };
}
```

**処理フロー（オンライン）:**
1. `pickImage()` — expo-image-picker でカメラ/ギャラリーから選択
2. `compressImage()` — expo-image-manipulator でリサイズ（max 1920px）+ JPEG圧縮（0.8）
3. `validateImageFile()` — shared の既存バリデーション関数を再利用
4. `r2Storage.uploadImage()` — presign → PUT（progressコールバック付き）
5. 成功 → publicUrl 返却

**オフライン時:**
- expo-file-system で `documentDirectory/pending_images/` にローカル保存
- AsyncStorage `image_upload_queue` にエンキュー
- ネットワーク復帰時に `syncPendingUploads()` で一括アップロード

---

### Step 3: UploadProgress コンポーネント

**新規:** `apps/mobile/components/ui/UploadProgress.tsx`

- キャンバス上部にオーバーレイ表示（Reanimated FadeIn/Out）
- プログレスバー + パーセント表示
- `visible` + `progress` props のみのシンプル設計

---

### Step 4: HomeScreen 修正

**変更:** `apps/mobile/app/(main)/(tabs)/index.tsx`

`handleAddImage` を完全書き換え:

1. ActionSheet で「カメラ」/「ライブラリ」選択（iOS: ActionSheetIOS / Android: Alert）
2. `pickImage(source)` で画像取得
3. `addNode({ src: asset.uri })` で仮ノード即時作成（ローカルURIプレビュー）
4. `uploadImage(asset, boardId, nodeId)` でR2アップロード
5. `updateNode(nodeId, { src: publicUrl })` でR2 URLに差し替え
6. JSXに `<UploadProgress>` 追加

**追加import:**
- `useImageUpload` フック
- `UploadProgress` コンポーネント
- `useAuth` から `session` も取得

---

### Step 5: useNodes に R2 削除カスケード追加

**変更:** `apps/mobile/hooks/useNodes.ts`

- フック引数に `authToken?: string | null` 追加
- `deleteNode` 内で、対象ノードが `type === 'image'` かつ `isR2Url(src)` の場合 → `r2Storage.deleteImage(extractR2Key(src), authToken)` を呼ぶ（ベストエフォート）
- 削除ノード情報はoptimistic update前に取得しておく

**HomeScreen側の呼び出し変更:**
```typescript
useNodes(selectedBoardId, user?.id ?? null, session?.access_token ?? null)
```

---

### Step 6: CanvasNode のプレースホルダー改善

**変更:** `apps/mobile/components/canvas/CanvasNode.tsx`

- `node.src` がローカル `file://` URIでも表示可能（expo-image は対応済み）
- `node.src` 未設定時にグレーのプレースホルダーUIを表示
- `transition={300}` でスムーズな画像読み込み

---

## 再利用する既存コード

| ファイル | 使用する関数/型 |
|---------|---------------|
| `packages/shared/src/lib/storage.ts` | `StorageService`, `UploadResult`, `isR2Url()`, `extractR2Key()` |
| `packages/shared/src/lib/validation.ts` | `validateImageFile()` |
| `apps/mobile/contexts/auth.tsx` | `session.access_token` (JWT) |
| `apps/mobile/hooks/useNodes.ts` | `addNode()`, `updateNode()`, `deleteNode()` |

---

## ファイル一覧

| 操作 | ファイル |
|------|---------|
| 新規 | `apps/mobile/services/r2Storage.ts` |
| 新規 | `apps/mobile/hooks/useImageUpload.ts` |
| 新規 | `apps/mobile/components/ui/UploadProgress.tsx` |
| 変更 | `apps/mobile/app/(main)/(tabs)/index.tsx` |
| 変更 | `apps/mobile/hooks/useNodes.ts` |
| 変更 | `apps/mobile/components/canvas/CanvasNode.tsx` |
| 変更 | `apps/mobile/app.json` |
| 変更 | `apps/mobile/.env.local` |

---

## データフロー

```
正常系（オンライン）:
FABMenu → ActionSheet → pickImage → compress(max 1920px, JPEG 0.8)
→ addNode({ src: localUri }) → 即時プレビュー
→ presign → PUT(XHR + progress) → R2アップロード
→ updateNode({ src: publicUrl }) → CDN URL差し替え

オフライン時:
→ addNode({ src: localUri }) → 即時プレビュー
→ documentDirectory にコピー → upload_queue に追加
→ ネットワーク復帰 → syncPendingUploads() → R2アップロード → src更新

削除時:
deleteNode → Supabase削除 → R2 deleteImage(ベストエフォート)
```

---

## 検証方法

1. **画像追加（ギャラリー）**: FAB → 画像追加 → ライブラリ → 選択 → プログレスバー表示 → キャンバスに画像表示
2. **画像追加（カメラ）**: FAB → 画像追加 → カメラ → 撮影 → アップロード → 表示
3. **大画像リサイズ**: 4000px超の画像 → 1920px以下にリサイズされることを確認
4. **オフライン**: 機内モード → 画像追加 → ローカルURIで即座に表示 → オンライン復帰 → R2にアップロードされsrc更新
5. **削除カスケード**: 画像ノード削除 → R2からも画像が消えることを確認（`GET /images/:key` → 404）
6. **プログレス**: アップロード中にプログレスバーが0→100%に進行することを確認
