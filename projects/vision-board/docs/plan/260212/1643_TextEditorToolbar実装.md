# Text Editor Toolbar 実装プラン

## Context
現在、NodeToolbarはテキストノード選択時にも画像用のエディタバー（Crop, overlay font size, Layers, Delete）を表示している。mobile_UI.penの「Popup - Text Editor」デザインに基づき、テキストノード専用のツールバー（文字色変更・文字サイズ変更・フォント変更・削除）を実装する。

---

## 修正ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `apps/mobile/components/canvas/NodeToolbar.tsx` | node.typeで画像/テキストを分岐、テキスト用ボタン＆ポップアップ追加 |
| 2 | `apps/mobile/hooks/useNodes.ts` | fontFamilyのDB永続化マッピング追加（updateNode + syncPending） |
| 3 | `apps/mobile/app/_layout.tsx` | Expo Google Fontsのロード追加 |
| 4 | `apps/mobile/components/canvas/CanvasNode.tsx` | fontLoaded確認、テキスト表示のfontFamily適用 |
| 5 | `apps/mobile/components/canvas/TextEditor.tsx` | フォント選択UIを追加、カラーパレットを12色に拡張 |

---

## Step 1: Expo Google Fonts の導入

### 1a. パッケージインストール
```bash
cd projects/vision-board/apps/mobile
npx expo install @expo-google-fonts/noto-sans-jp @expo-google-fonts/noto-serif-jp @expo-google-fonts/m-plus-rounded-1c @expo-google-fonts/zen-maru-gothic expo-font
```

### 1b. `_layout.tsx` にフォントロード追加
```typescript
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { NotoSerifJP_400Regular } from '@expo-google-fonts/noto-serif-jp';
import { MPLUSRounded1c_400Regular } from '@expo-google-fonts/m-plus-rounded-1c';
import { ZenMaruGothic_400Regular } from '@expo-google-fonts/zen-maru-gothic';

const [loaded, error] = useFonts({
  SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  ...FontAwesome.font,
  NotoSansJP_400Regular,
  NotoSansJP_700Bold,
  NotoSerifJP_400Regular,
  MPLUSRounded1c_400Regular,
  ZenMaruGothic_400Regular,
});
```

### 1c. フォント定数定義（NodeToolbar.tsx内またはconstants/fonts.ts）
```typescript
export const TEXT_FONTS = [
  { label: 'デフォルト', value: undefined },            // システムフォント
  { label: 'Noto Sans JP', value: 'NotoSansJP_400Regular' },
  { label: 'Noto Serif JP', value: 'NotoSerifJP_400Regular' },
  { label: 'M+ Rounded', value: 'MPLUSRounded1c_400Regular' },
  { label: '丸ゴシック', value: 'ZenMaruGothic_400Regular' },
  { label: 'SpaceMono', value: 'SpaceMono' },
];
```

---

## Step 2: useNodes.ts — fontFamily永続化マッピング追加

### 2a. updateNode関数（直接更新パス）に追加
`fontSize`/`color`の行の近くに:
```typescript
if (updates.fontFamily !== undefined) updateData.font_family = updates.fontFamily;
```

### 2b. syncPending関数（オフラインキュー処理）に追加
同様の場所に:
```typescript
if (action.data.fontFamily !== undefined) updateData.font_family = action.data.fontFamily;
```

---

## Step 3: NodeToolbar.tsx — テキストノード専用ツールバー

### 3a. PopupType拡張
```typescript
type PopupType = 'shape' | 'layers' | 'fontSize' | 'textColor' | 'textSize' | 'fontFamily' | null;
```

### 3b. ツールバーのボタンをnode.typeで分岐

**画像ノード** (現状維持):
`[AA(overlay font size)] [Crop(shape)] [Layers] | [Delete]`

**テキストノード** (新規):
`[Color(●)] [Font(あぁ)] [Size(24)] [Layers] | [Delete]`

デザインに基づくボタン仕様:
- **Color**: 現在の`node.color`を表示する色丸（直径20px, 白枠2px）→ `textColor`ポップアップ
- **Font**: 「あぁ」テキスト表示 → `fontFamily`ポップアップ
- **Size**: 現在の`node.fontSize`を数値表示（例: "24"）→ `textSize`ポップアップ
- **Layers**: 既存のレイヤーポップアップを共有
- **Delete**: 既存の削除ボタンを共有

### 3c. カラーパレットポップアップ (`textColor`)
.penデザイン準拠: 2行×6色、各色丸36px、gap: 10
```typescript
const TEXT_COLORS = [
  // Row 1
  ['#FFFFFF', '#9E9E9E', '#1C1C1E', '#00BCD4', '#E91E8C', '#9C27B0'],
  // Row 2
  ['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#009688'],
];
```
- 選択中の色は青枠（#3B82F6, borderWidth: 2）でハイライト
- 背景: #2C2C2E, cornerRadius: 16, padding: 14

### 3d. フォント選択ポップアップ (`fontFamily`)
- TEXT_FONTS配列をScrollViewで表示
- 各アイテム: フォント名テキスト（そのフォント自体で描画）
- 選択中は青色テキスト+左にチェックマーク

### 3e. サイズ選択ポップアップ (`textSize`)
- プリセット: 14, 18, 24, 32, 48, 64（TextEditorと同じ）
- `+2` / `-2` 微調整ボタン
- 選択中のサイズは青色ハイライト
- `onUpdateNode({ fontSize: newSize })`で即時反映

### 3f. ツールバー幅の調整
- 画像用: 220px（現状）
- テキスト用: 260px（ボタンが多いため少し広く）

---

## Step 4: TextEditor.tsx — フォント選択追加・カラー拡張

### 4a. カラーパレットを12色に拡張
NodeToolbarのTEXT_COLORSと同じ12色に統一。

### 4b. フォント選択セクション追加
フォントサイズコントロールの下に、水平ScrollViewでフォント一覧を表示。
各フォント: そのフォント自体で「あぁ Aa」と表示。選択中は青色ハイライト。
選択時: `onUpdateNode({ fontFamily: value })`

---

## Step 5: CanvasNode.tsx — 確認

現在のNodeContent内テキスト表示:
```tsx
fontFamily: node.fontFamily,
```
→ **変更不要**。node.fontFamilyが設定されていればそのフォントで表示、undefinedならシステムデフォルト。

---

## UI Flow（完成後）

### テキストノード選択時:
1. タップ → 選択状態 → **テキスト用ツールバー**表示
   - [●色] [あぁ] [24] [layers] | [🗑]
2. 色ボタンタップ → カラーパレット開く → 色選択 → 即時反映
3. フォントボタンタップ → フォント一覧開く → 選択 → 即時反映
4. サイズボタンタップ → サイズ選択開く → 選択 → 即時反映
5. ダブルタップ → TextEditor（ボトムシート）開く → テキスト内容編集

### 画像ノード選択時:
→ 現状通り（変更なし）

---

## 検証方法
1. テキストノードを追加 → タップ → テキスト用ツールバーが表示されることを確認
2. 色変更 → キャンバス上のテキスト色が即座に変わることを確認
3. フォント変更 → テキストのフォントが即座に変わることを確認
4. サイズ変更 → テキストサイズが即座に変わることを確認
5. レイヤー操作 → z_indexが正しく変わることを確認
6. 削除 → ノードが削除されることを確認
7. ダブルタップ → TextEditor開く → content編集が動作すること
8. 画像ノード → 従来のツールバーが表示されることを確認
9. アプリ再起動 → fontFamily/color/fontSizeの変更がDB永続化されていることを確認
10. TSビルドチェック: `npx tsc --noEmit`
