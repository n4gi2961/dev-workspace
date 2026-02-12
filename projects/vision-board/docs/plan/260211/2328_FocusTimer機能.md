# Focus Timer 機能 実装計画

## Context
メモ（将来的に搭載予定の機能）の [4]Focus Timer機能(Bottom Nav:2) のメイン機能を実装する。ルーティンのタイトルから分数を自動検出し、カウントダウンタイマーとして動作させる。タイマー実行中はイマーシブな全画面体験、完了時にはメテオエフェクト+自動チェック機能を実現する。

## タブ構成変更
**Before:** Home(1) → Focus(2) → Profile(3)
**After:** Home(1) → **Timer(2)** → Focus(3) → Profile(4)

---

## 実装フェーズ

### Phase 1: 基盤ユーティリティ + i18n

**1-1. `apps/mobile/lib/parseTimerMinutes.ts`** (新規)
- `parseTimerMinutes(title)`: 分数(1-180)を抽出。優先: `(\d+)\s*分` → フォールバック: `(\d+)`
- `parseTimerParts(title)`: テキストを `{ before, number, after }` に分割（Focus画面の青リンク表示用）
- 例: "30分ランニング"→30, "ランニング45分"→45, "毎日歩く"→null, "200分"→null

**1-2. `packages/shared/src/i18n/ja.json` + `en.json`** (修正)
- `tabs.timer`: "タイマー" / "Timer"
- `timer.idle.*`: スタート、時間調整、デフォルトタイトル、タップヒント
- `timer.running.*`: 一時停止、停止
- `timer.paused.*`: 再開
- `timer.completed.*`: 完了、タップして記録

### Phase 2: TimerContext

**2-1. `apps/mobile/contexts/timer.tsx`** (新規)
- タイマーの全状態管理（タブ切り替え跨ぎで保持するためContextを使用）
- 状態: `status: 'idle' | 'running' | 'paused' | 'completed'`
- データ: `routineId, routineTitle, routineColor, totalSeconds, remainingSeconds`
- アクション: `setupTimer`, `adjustTime(±分)`, `start`, `pause`, `stop`, `confirmCompletion`, `reset`
- `setInterval(1000ms)` を `useRef` で管理、フォアグラウンドのみカウント
- status変化時に `setTabBarVisible(false/true)` でタブバー表示制御
  - running / completed → タブバー非表示
  - idle / paused → タブバー表示

**2-2. `apps/mobile/app/(main)/_layout.tsx`** (修正)
- `NavigationProvider` の内側に `TimerProvider` を追加
```
NavigationProvider → TimerProvider → MainLayoutContent
```

### Phase 3: UIコンポーネント

**3-1. `apps/mobile/components/timer/CircularTimer.tsx`** (新規)
- SVG Circle 2枚重ね（背景トラック + プログレスリング）
- Reanimated `useAnimatedProps` で `strokeDashoffset` を滑らかにアニメーション
- 中央に MM:SS 表示 (fontSize: 56, fontWeight: 200)
- paused時は時間テキスト点滅（opacity withRepeat）

**3-2. `apps/mobile/components/timer/TimerCompletionOverlay.tsx`** (新規)
- 全画面オーバーレイ + 大きなチェックボタン（CheckCircle2, size: 120）
- タップ → `useFocusEffects.triggerMeteor()` → 1.5秒後に `confirmCompletion()`
- 既存の `MeteorEffect` コンポーネントをそのまま再利用

### Phase 4: タイマー画面 + タブ追加

**4-1. `apps/mobile/app/(main)/(tabs)/timer.tsx`** (新規)
- 3つの表示状態を切り替え:
  - **idle**: タイトル + CircularTimer + 時間調整ボタン(±1分/±5分) + スタートボタン
  - **running**: タイトル + CircularTimer(カウントダウン中) + 一時停止/停止ボタン
  - **completed**: TimerCompletionOverlay + MeteorEffect
- ルーティン未選択時は空のタイマー画面 + ヒントテキスト
- 完了時: メテオエフェクト → `toggleRoutineCheck(routineId, today)` で自動チェック

**4-2. `apps/mobile/app/(main)/(tabs)/_layout.tsx`** (修正)
- `Tabs.Screen name="timer"` を `index` と `ambient` の間に追加
- アイコン: `timer` (Lucide)

**4-3. `apps/mobile/components/ui/TabBar.tsx`** (修正)
- 現在: `tabBarVisible ? <TabBar> : null` → アニメーションなし
- 変更: 常にレンダリングし、Reanimated `translateY` でスライドダウンアニメーション
- `_layout.tsx` の `tabBar` propから条件分岐を削除
- TabBar内部で `useNavigation().tabBarVisible` を監視してアニメーション

### Phase 5: Focus画面連携

**5-1. `apps/mobile/app/(main)/(tabs)/ambient.tsx`** (修正)
- FocusOverlay内のルーティンタイトルの数字部分をインラインリンク化:
  - `parseTimerMinutes` で数字を検出 → 数字部分を `<Text onPress={handleStartTimer} style={{ color: '#0095F6' }}>` でラップ
  - React Nativeのネスト `Text` を使い、ルーティンタイトルを「数字部分（青・タイマー遷移）」と「それ以外」に分割レンダリング
  - 例: "**30**分ランニングする" の "30" 部分が青いリンクテキストに
  - 行全体のタップ → チェックトグル（従来通り）
  - 青い数字部分のタップ → `setupTimer(routine, minutes)` → `router.navigate('/(main)/(tabs)/timer')`
- `parseTimerMinutes` にテキスト分割用のヘルパーも追加:
  ```
  parseTimerParts(title) → { before: string, number: string, after: string } | null
  ```

---

## 新規作成ファイル一覧
| ファイル | 用途 |
|---------|------|
| `apps/mobile/contexts/timer.tsx` | TimerContext/Provider |
| `apps/mobile/app/(main)/(tabs)/timer.tsx` | タイマー画面 |
| `apps/mobile/lib/parseTimerMinutes.ts` | 時間パースユーティリティ |
| `apps/mobile/components/timer/CircularTimer.tsx` | 円形タイマーUI |
| `apps/mobile/components/timer/TimerCompletionOverlay.tsx` | 完了オーバーレイ |

## 修正ファイル一覧
| ファイル | 変更内容 |
|---------|---------|
| `apps/mobile/app/(main)/_layout.tsx` | TimerProvider追加 |
| `apps/mobile/app/(main)/(tabs)/_layout.tsx` | timerタブ追加 |
| `apps/mobile/components/ui/TabBar.tsx` | スライドアニメーション化 |
| `apps/mobile/app/(main)/(tabs)/ambient.tsx` | タイマー遷移ボタン追加 |
| `packages/shared/src/i18n/ja.json` | timer翻訳追加 |
| `packages/shared/src/i18n/en.json` | timer翻訳追加 |

## 再利用する既存コード
- `useFocusEffects` (`hooks/useFocusEffects.ts`) — メテオエフェクトトリガー
- `MeteorEffect` (`components/focus/MeteorEffect.tsx`) — 完了時流星アニメーション
- `useRoutines.toggleRoutineCheck` — 完了時自動チェック
- `useNavigation.setTabBarVisible` — タブバー表示/非表示制御
- `dataEvents` (`lib/dataEvents.ts`) — クロスタブ同期
- `colors` (`constants/Colors.ts`) — デザイントークン

## 検証方法
1. 4タブが正しい順序で表示されることを確認
2. Focus overlay のルーティンタイトル内の数字部分が青色リンクで表示されること（時間検出可能なもののみ）
3. 青い数字タップ → Timer画面に遷移し、時間がプリセットされていること。行タップ → 従来通りチェックトグル
4. 時間調整ボタン（±1分/±5分）で正しく増減、下限1分/上限180分
5. スタート → タブバーがスライドで消える → カウントダウン開始
6. 一時停止 → タイマー停止 → タブバー復帰 → 時間表示点滅
7. 停止 → セットアップ画面に戻る → タブバー復帰
8. タブ切り替え後もタイマーが継続していること
9. カウントダウン0到達 → 完了画面 → チェックタップ → メテオエフェクト → ルーティン自動チェック → idle復帰
