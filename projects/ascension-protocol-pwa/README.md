# ASCENSION PROTOCOL - PWA Version

宇宙戦闘ゲーム「ASCENSION PROTOCOL」のPWA（Progressive Web App）版です。

## 特徴

- **オフライン対応**: Service Workerによりインターネット接続なしでもプレイ可能
- **インストール可能**: ホーム画面に追加してネイティブアプリのように使用可能
- **レスポンシブ**: デスクトップからモバイルまで対応
- **高速読み込み**: リソースをキャッシュして高速起動

## ゲーム内容

- スキルベースの宇宙シューティングゲーム
- レベルアップによるスキル強化システム
- 5種類の基本スキル + 3種類のアルティメットスキル
- ランキングシステム

## 技術仕様

- **HTML5 Canvas**: ゲーム描画
- **Service Worker**: オフライン機能
- **Web App Manifest**: PWA設定
- **レスポンシブデザイン**: CSS Grid/Flexbox

## 起動方法

1. HTTPサーバーでホスト（例: `python3 -m http.server 8000`）
2. ブラウザで http://localhost:8000 にアクセス
3. ブラウザの「ホーム画面に追加」でインストール可能

## ファイル構成

- `index.html` - メインHTML
- `styles.css` - CSS スタイル
- `game.js` - ゲームロジック
- `manifest.json` - PWA設定
- `sw.js` - Service Worker
- `icon-192.svg`, `icon-512.svg` - アプリアイコン

## 操作方法

- **マウス**: プレイヤー移動
- **Q, W, E**: 基本スキル
- **R**: アルティメットスキル
- **自動射撃**: 常時発射

## 次のステップ（Electron化）

このPWA版をElectronに移行する際は：

1. Service Workerを削除
2. Electronメインプロセスファイル追加
3. package.jsonでElectron設定
4. ネイティブ配布ファイル作成

## 開発者情報

- バージョン: 1.0.0
- 対応ブラウザ: Chrome, Firefox, Safari, Edge
- PWA仕様準拠