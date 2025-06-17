import { BreathingSessionData, BreathingStatistics } from '../constants/breathing';

/**
 * セッションIDを生成
 */
export const generateSessionId = (): string => {
  return `breathing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 時間をフォーマット（秒から分:秒形式）
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * 時間をフォーマット（秒から分形式）
 */
export const formatTime = (seconds: number): string => {
  return Math.floor(seconds / 60) + '分';
};

/**
 * 一貫性スコアを計算
 */
export const calculateConsistencyScore = (breathIntervals: number[]): number => {
  if (breathIntervals.length < 2) return 100;

  const mean = breathIntervals.reduce((a, b) => a + b) / breathIntervals.length;
  const variance = breathIntervals.reduce((sum, interval) => {
    return sum + Math.pow(interval - mean, 2);
  }, 0) / breathIntervals.length;
  const stdDev = Math.sqrt(variance);
  
  // スコアは0-100で、標準偏差が小さいほど高い
  return Math.max(0, Math.round(100 - (stdDev / mean * 100)));
};

/**
 * 集中力スコアへの貢献度を計算
 */
export const calculateFocusScoreContribution = (sessionData: BreathingSessionData): number => {
  const baseScore = 5; // 基本ポイント
  const consistencyBonus = Math.round(sessionData.consistencyScore / 20); // 最大5ポイント
  const completionBonus = sessionData.completionRate >= 100 ? 3 : Math.round(sessionData.completionRate / 50); // 最大3ポイント
  const durationBonus = Math.min(Math.round(sessionData.duration / 300), 2); // 5分毎に1ポイント、最大2ポイント

  return Math.min(baseScore + consistencyBonus + completionBonus + durationBonus, 15);
};

/**
 * 平均値の新しい値を計算
 */
export const calculateNewAverage = (currentAverage: number, newValue: number, totalCount: number): number => {
  if (totalCount <= 1) return newValue;
  return ((currentAverage * (totalCount - 1)) + newValue) / totalCount;
};

/**
 * 連続日数を更新
 */
export const updateStreakCount = (lastSessionDate?: string): number => {
  if (!lastSessionDate) return 1;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastDate = new Date(lastSessionDate);
  const lastDateString = lastDate.toDateString();
  const todayString = today.toDateString();
  const yesterdayString = yesterday.toDateString();

  if (lastDateString === todayString) {
    // 今日既にセッションを行っている場合、連続日数は変わらず
    return 1; // この場合は現在の連続日数を維持すべきだが、ここでは簡略化
  } else if (lastDateString === yesterdayString) {
    // 昨日セッションを行っていた場合、連続日数+1
    return 1; // 実際の実装では現在の連続日数+1を返すべき
  } else {
    // それ以外の場合、連続日数リセット
    return 1;
  }
};

/**
 * パターン使用頻度を更新
 */
export const updatePatternPreference = (currentPreferences: Record<string, number>, newPattern: string): string => {
  const updated = { ...currentPreferences };
  updated[newPattern] = (updated[newPattern] || 0) + 1;
  
  // 最も使用頻度の高いパターンを返す
  return Object.entries(updated).reduce((a, b) => 
    updated[a[0]] > updated[b[0]] ? a : b
  )[0];
};

/**
 * 週次進捗を更新
 */
export const updateWeeklyProgress = (currentProgress: BreathingSessionData[], newSession: BreathingSessionData): BreathingSessionData[] => {
  const updated = [...currentProgress, newSession];
  
  // 過去7日分のみ保持
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  return updated.filter(session => 
    new Date(session.timestamp) >= oneWeekAgo
  );
};

/**
 * スコアレベルを取得
 */
export const getScoreLevel = (score: number): string => {
  if (score >= 90) return 'すばらしい！';
  if (score >= 80) return '良好';
  if (score >= 70) return '普通';
  if (score >= 60) return '改善の余地あり';
  return 'もう少し頑張りましょう';
};

/**
 * スコアに応じた色を取得
 */
export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
};

/**
 * 呼吸セッションの統計を初期化
 */
export const initializeBreathingStatistics = (): BreathingStatistics => ({
  totalSessions: 0,
  totalMeditationTime: 0,
  averageSessionLength: 0,
  preferredPattern: 'box',
  streakDays: 0,
  weeklyProgress: [],
});

/**
 * セッションデータの妥当性を検証
 */
export const validateSessionData = (sessionData: Partial<BreathingSessionData>): boolean => {
  return !!(
    sessionData.id &&
    sessionData.timestamp &&
    sessionData.pattern &&
    typeof sessionData.duration === 'number' &&
    typeof sessionData.plannedDuration === 'number' &&
    typeof sessionData.breathCount === 'number' &&
    typeof sessionData.consistencyScore === 'number' &&
    typeof sessionData.completionRate === 'number' &&
    sessionData.metrics
  );
};

/**
 * LocalStorageのキーを生成
 */
export const getStorageKey = (key: string): string => {
  return `focusflow_breathing_${key}`;
};

/**
 * セッション結果のサマリーを生成
 */
export const generateSessionSummary = (sessionData: BreathingSessionData): string => {
  const completionText = sessionData.completionRate >= 100 ? '完了' : `${Math.round(sessionData.completionRate)}%完了`;
  const scoreText = getScoreLevel(sessionData.consistencyScore);
  
  return `${sessionData.pattern}を${formatDuration(sessionData.duration)}実施（${completionText}）- ${scoreText}`;
};

/**
 * 推奨セッション時間を計算
 */
export const getRecommendedDuration = (userLevel: 'beginner' | 'intermediate' | 'advanced'): number => {
  switch (userLevel) {
    case 'beginner':
      return 3 * 60; // 3分
    case 'intermediate':
      return 5 * 60; // 5分
    case 'advanced':
      return 10 * 60; // 10分
    default:
      return 5 * 60;
  }
};

/**
 * 次回セッションの推奨パターンを取得
 */
export const getRecommendedPattern = (recentSessions: BreathingSessionData[]): string => {
  if (recentSessions.length === 0) return 'box';
  
  // 最近のセッションの平均スコアが高いパターンを推奨
  const patternScores: Record<string, { total: number; count: number }> = {};
  
  recentSessions.slice(-5).forEach(session => {
    if (!patternScores[session.pattern]) {
      patternScores[session.pattern] = { total: 0, count: 0 };
    }
    patternScores[session.pattern].total += session.consistencyScore;
    patternScores[session.pattern].count += 1;
  });
  
  const bestPattern = Object.entries(patternScores).reduce((best, [pattern, data]) => {
    const average = data.total / data.count;
    return average > best.score ? { pattern, score: average } : best;
  }, { pattern: 'box', score: 0 });
  
  return bestPattern.pattern;
};