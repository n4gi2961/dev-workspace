# EventEmitter導入後のロールバック＆オフライン保存バグ修正

## Context

EventEmitter（`dataEvents`）を導入して画面間のデータ同期を実現したが、2つのバグが発生：
1. **変更ロールバック** — UI上の変更が数秒後に元に戻る
2. **オフライン保存が永続しない** — オフラインで保存したデータが消える

### 根本原因

各フック（useNodes, useBoards, useRoutines）で以下の競合が発生：

```
1. setNodes(楽観的更新) + saveToCache(非同期・await無し)
2. dataEvents.emit('nodes:changed')  ← キャッシュ書込み完了前、API呼出し前
3. 自分自身のリスナーが loadNodes() を実行
4. loadNodes() がキャッシュ読込み → 古いデータでステート上書き
5. loadNodes() がSupabase取得 → API未完了なのでサーバーも古いデータ
```

つまり **自己反応 + 非同期キャッシュ + emit早すぎ** の3重問題。

## 修正方針（3つの修正を組合せ）

### Fix A: 自己反応の防止
- `dataEvents.emit(event, sourceId)` に sourceId を追加
- 各フックがユニークIDを持ち、自分が発火したイベントをスキップ

### Fix B: キャッシュ書込みをawaitしてからemit
- `setNodes()` コールバック内の `saveToCache()` を外に出し、awaitする
- `nodesRef` で最新ステートを追跡し、楽観的更新を計算

### Fix C: emitをAPI完了後に移動
- emitのタイミングを「API成功後」または「オフラインならキャッシュ保存後」に変更
- 他画面がリロードした時にサーバーが最新データを返すことを保証

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `apps/mobile/lib/dataEvents.ts` | emit/onにsourceIdパラメータ追加 |
| `apps/mobile/hooks/useNodes.ts` | instanceId・nodesRef追加、3メソッド修正、loadNodesにバージョンガード |
| `apps/mobile/hooks/useBoards.ts` | instanceId・boardsRef追加、3メソッド修正、loadBoardsにバージョンガード |
| `apps/mobile/hooks/useRoutines.ts` | instanceId追加、6メソッド修正（キャッシュawait + emit移動） |
