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

## React開発におけるuseCallbackの依存配列管理ルール

### 発生した問題の構造的原因
React Hooksの`useCallback`で依存配列が不完全だったため、パターン変更時に古いクロージャが使われ続けた問題が発生しました。

**根本原因:**
1. `useCallback`内で他の関数を呼び出しているのに、その関数が依存配列に含まれていなかった
2. 関数定義の順序による循環依存が発生していた
3. ESLintの警告を適切に対処せずに放置していた

### 今後の防止策ルール

**必須ルール:**
1. **完全な依存配列**: `useCallback`内で使用するすべての関数・変数を依存配列に含める
2. **ESLint警告の即時対応**: `react-hooks/exhaustive-deps`の警告は必ず修正する
3. **関数定義順序の管理**: 循環依存を避けるため、呼び出される関数を先に定義する

**推奨ルール:**
1. **関数の責任分離**: 複雑な処理は小さな関数に分割して依存関係を明確にする
2. **型安全性の確保**: TypeScriptの型チェックを活用してランタイムエラーを防ぐ
3. **テスト駆動開発**: 各フックの動作を単体テストで検証する

これらのルールに従うことで、React Hooksの依存配列に関する問題を事前に防ぐことができます。
- 

## 参照ドキュメント
- /docs/supabase-reference.md - Supabase実装の参考