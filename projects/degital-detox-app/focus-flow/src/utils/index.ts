import { SCORE_THRESHOLDS } from '../constants';

export const calculateFocusScore = (
  screenTime: number,
  focusSessions: number,
  detoxTime: number
): number => {
  const screenTimeScore = Math.max(0, 100 - (screenTime / 60)); // 1時間以上で減点
  const focusSessionScore = Math.min(100, focusSessions * 10); // セッション数による加点
  const detoxTimeScore = Math.min(100, (detoxTime / 60) * 20); // デトックス時間による加点
  
  const totalScore = (screenTimeScore + focusSessionScore + detoxTimeScore) / 3;
  return Math.round(Math.max(0, Math.min(100, totalScore)));
};

export const getScoreMessage = (score: number): string => {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) {
    return '素晴らしい集中力です！';
  } else if (score >= SCORE_THRESHOLDS.GOOD) {
    return '良好な集中状態です！';
  } else if (score >= SCORE_THRESHOLDS.AVERAGE) {
    return '平均的な集中力です';
  } else if (score >= SCORE_THRESHOLDS.NEEDS_IMPROVEMENT) {
    return '集中力を改善しましょう';
  } else {
    return 'デジタルデトックスを始めましょう';
  }
};

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
};

export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getRandomTip = (tips: readonly string[]): string => {
  const randomIndex = Math.floor(Math.random() * tips.length);
  return tips[randomIndex];
};

export const calculateProductivityGain = (
  currentScore: number,
  previousScore: number
): number => {
  if (previousScore === 0) return 0;
  return Math.round(((currentScore - previousScore) / previousScore) * 100);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};