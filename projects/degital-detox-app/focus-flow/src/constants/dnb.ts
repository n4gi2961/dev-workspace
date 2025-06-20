// DNB（Dual N-Back）ゲーム関連の定数

export const DNB_CONFIG = {
  GRID_SIZE: 3,
  STIMULUS_DURATION: 500,      // 0.5秒
  INTERVAL_DURATION: 2500,     // 2.5秒
  MIN_N_LEVEL: 1,
  MAX_N_LEVEL: 5,
  BASE_TRIALS: 20,             // 20 + N試行
  
  // 適応的難易度調整の閾値
  LEVEL_UP_THRESHOLD: 0.8,     // 80%正答率
  LEVEL_UP_BLOCKS: 3,          // 3ブロック連続
  LEVEL_DOWN_THRESHOLD: 0.5,   // 50%正答率
  LEVEL_DOWN_BLOCKS: 2,        // 2ブロック連続
  
  // マッチ生成確率（新しい分布）
  BOTH_MATCH_PROBABILITY: 0.1,     // 10%の確率で両方マッチ
  POSITION_MATCH_PROBABILITY: 0.3, // 30%の確率で位置マッチ
  NUMBER_MATCH_PROBABILITY: 0.3,   // 30%の確率で数字マッチ
  NEITHER_MATCH_PROBABILITY: 0.3,  // 30%の確率ですべて異なる
  
  // UI設定
  COUNTDOWN_DURATION: 3000,    // 3秒カウントダウン
  FEEDBACK_DURATION: 300,      // フィードバック表示時間
  
  // パフォーマンス評価
  EXCELLENT_THRESHOLD: 0.8,
  GOOD_THRESHOLD: 0.6,
  AVERAGE_THRESHOLD: 0.4,
  
  // 集中力スコア計算
  MAX_FOCUS_CONTRIBUTION: 15,  // 最大貢献度
  BASE_SCORE_MULTIPLIER: 10,   // 基本スコア倍率
} as const;

export const DNB_COLORS = {
  GRID_INACTIVE: '#E0E0E0',
  GRID_ACTIVE: '#2A9D8F',
  GRID_SHADOW: '#264653',
  NUMBER_TEXT: '#FFFFFF',
  
  // フィードバック色
  CORRECT_FEEDBACK: '#4CAF50',
  INCORRECT_FEEDBACK: '#F44336',
  NEUTRAL_FEEDBACK: '#FF9800',
  
  // レベル表示色
  LEVEL_BACKGROUND: '#E76F51',
  LEVEL_TEXT: '#FFFFFF',
  
  // ボタン色
  BUTTON_PRIMARY: '#264653',
  BUTTON_DISABLED: '#CCCCCC',
  BUTTON_TEXT: '#FFFFFF',
} as const;

export const DNB_ANIMATIONS = {
  GRID_FADE_DURATION: 200,
  NUMBER_SCALE_DURATION: 300,
  FEEDBACK_DURATION: 500,
  LEVEL_CHANGE_DURATION: 800,
} as const;

export const DNB_TIPS = [
  'DNBトレーニングにより、ワーキングメモリ容量が15%拡張されます',
  '3日間の練習でマルチタスク処理能力が28%向上します',  
  '1週間の継続で情報処理速度が350msから280msに短縮されます',
  'DNB実践により注意の切り替え速度が40%高速化し、作業効率がアップします',
  '2週間のトレーニングで短期記憶から長期記憶への転送率が35%改善されます',
  '19日間の実践で流動性知能（IQ）が平均4.5ポイント上昇します',
  '1ヶ月継続すると前頭前野の神経結合が強化され、計画能力が向上します',
  'DNBにより認知的柔軟性が45%向上し、問題解決力が飛躍的に改善されます',
  '3ヶ月の訓練で加齢による認知機能低下を5年分遅らせる効果があります',
  '6ヶ月継続すると学習効率が60%向上し、新しいスキル習得が容易になります'
] as const;

export const PERFORMANCE_MESSAGES = {
  EXCELLENT: "素晴らしいパフォーマンスです！認知機能が大幅に向上しています。",
  GOOD: "良い調子です。継続することで更なる向上が期待できます。",
  AVERAGE: "平均的な成績です。集中力を高めて練習を重ねましょう。",
  POOR: "まだ慣れが必要ですが、継続すれば必ず向上します。"
} as const;

export const DIFFICULTY_DESCRIPTIONS = {
  1: "N=1: 1つ前の刺激を覚える基本レベル",
  2: "N=2: 2つ前の刺激を覚える初級レベル", 
  3: "N=3: 3つ前の刺激を覚える中級レベル",
  4: "N=4: 4つ前の刺激を覚える上級レベル",
  5: "N=5: 5つ前の刺激を覚える最高難易度"
} as const;

// 統計表示用のフォーマッター
export const formatDNBTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
};

export const formatDNBAccuracy = (accuracy: number): string => {
  return `${(accuracy * 100).toFixed(1)}%`;
};

export const formatDNBLevel = (level: number): string => {
  return `N=${level}`;
};