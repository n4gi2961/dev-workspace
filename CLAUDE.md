# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a development workspace organized into purpose-specific directories:

- `projects/` - Main development projects
- `experiments/` - Experimental code and proof-of-concepts  
- `learning/` - Educational projects and tutorials
- `archive/` - Completed or old projects
- `claude-sessions/` - Claude Code session data

## Development Approach

When creating new projects:
1. Place them in the appropriate directory based on their purpose
2. Follow standard conventions for the chosen language/framework
3. Include necessary build/development files (package.json, requirements.txt, etc.)

## Configuration

- `.claude/settings.local.json` tracks bash command permissions
- No global build tools or package managers are currently configured
- Environment is language-agnostic and ready for any development stack

## Current State

This is a fresh workspace with no active projects. When working here:
- Determine the appropriate directory for new work
- Set up language-specific tooling as needed
- Follow project-specific conventions as they're established

## User added Rule 
- 回答は必ず日本語で行ってください。文脈が不適切な場合は英語を使用する。

## Vision Board app開発における技術スタック
### モバイル版
| 項目 | 選定 | 理由 |
|------|------|------|
| フレームワーク | **Expo SDK 52+** | New Architecture標準、OTA更新、EAS Build |
| ルーティング | **expo-router v4** | ファイルベース、ディープリンク自動化 |
| スタイル | **NativeWind v4** | Tailwind記法流用、学習コスト最小 |
| アニメーション | **Reanimated 3** | JSI経由の高パフォーマンス |
| ジェスチャー | **react-native-gesture-handler** | ドラッグ&ドロップ |
| リスト表示 | **FlashList** | FlatListの5-10倍高速（セルリサイクル） |
| 画像 | **expo-image** | BlurHash、ディスクキャッシュ、prefetch |
| ハプティクス | **expo-haptics** | タッチフィードバック |
| アイコン | Lucide Icons |
| ストレージ | **AsyncStorage + MMKV** | 通常データ + 機密データ（暗号化） |

### プランモードの計画保存
プランモードで承認されたプランは、実行開始時に以下の手順で保存すること：
1. プランファイル（`/root/.claude/plans/` 内）の内容を読み取る
2. `date +"%y%m%d"` で日付を取得し、保存先に日付フォルダ（例: `260206/`）を作成（既存なら省略）
3. ファイル名を `HHmm_タイトル.md` 形式で生成（`date +"%H%M"` を使用）
4. 保存先パスを `/home/claude-code/.claude/plan-config.json` の `outputFolder` から取得
5. `outputFolder/YYMMDD/HHmm_タイトル.md` に Write ツールで保存し、保存先をユーザーに報告

### pencil MCPについて
モバイルアプリUI開発に用いるpencilの操作は、指示がすべて完了しユーザーに会話を返す前に必ず保存すること。

### $log
ユーザーが$logと入力したら、以下を実行：
1. 各ディレクトリに格納されているフォルダ名から日付を認識し、最も新しい日付を特定。
   - Plan: `find /home/claude-code/projects/vision-board/docs/plan
   - Log: /mnt/c/Users/ogaki/Documents/Obsidian Vault/Vision-Board-app/Claude-code_Log
2. 特定した日付のフォルダ内のmdファイルの始めの数字から作成された時刻を把握し、最も新しい3つを読み込んで直近の計画と実行記録を確認する。読み込んだmdファイル数が3に満たない場合は前日に戻り同様の操作を行う。
3./home/claude-code/projects/vision-board/docs/plan/mustloadに保存されているファイルには必ず目を通す。
4.将来的に搭載予定の機能・修正する不具合メモ.mdファイルのうち、1-2の操作で既に実行済みを確認したものについては完了したチェックマークとその日付を記載する。
5 現在の状況と次のTODOをまとめて報告