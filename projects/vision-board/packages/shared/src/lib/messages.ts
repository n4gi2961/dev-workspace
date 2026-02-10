// Returns translation key based on percentage
// Usage: const t = useTranslations('messages'); t(getMessageKey(percentage, 'milestone'))
export const getMessageKey = (percentage: number, type: string): string => {
  if (type === 'milestone') {
    if (percentage === 0) return 'milestone.0';
    if (percentage < 25) return 'milestone.25';
    if (percentage < 50) return 'milestone.50';
    if (percentage < 75) return 'milestone.75';
    if (percentage < 100) return 'milestone.99';
    return 'milestone.100';
  }
  if (type === 'today') {
    if (percentage === 0) return 'today.0';
    if (percentage < 50) return 'today.50';
    if (percentage < 100) return 'today.99';
    return 'today.100';
  }
  if (type === 'streak') {
    if (percentage === 0) return 'streak.0';
    if (percentage < 10) return 'streak.10';
    if (percentage < 30) return 'streak.30';
    if (percentage < 50) return 'streak.50';
    if (percentage < 70) return 'streak.70';
    if (percentage < 90) return 'streak.90';
    return 'streak.100';
  }
  return 'milestone.0';
};

// Legacy function for backwards compatibility
// @deprecated Use getMessageKey with useTranslations instead
export const getEncouragementMessage = (percentage: number, type: string) => {
  if (type === 'milestone') {
    if (percentage === 0) return 'はじめの一歩を踏み出そう';
    if (percentage < 25) return '着実に前進中';
    if (percentage < 50) return '順調に進んでいます';
    if (percentage < 75) return 'ゴールが見えてきた';
    if (percentage < 100) return 'あと少し！';
    return '目標達成！おめでとう🎉';
  }
  if (type === 'today') {
    if (percentage === 0) return '今日も頑張ろう';
    if (percentage < 50) return 'いい調子！';
    if (percentage < 100) return 'あと少しで完璧';
    return '今日も完璧！✨';
  }
  if (type === 'streak') {
    if (percentage === 0) return '千里の道も一歩から';
    if (percentage < 10) return '継続は力なり';
    if (percentage < 30) return '習慣が芽生えてきた';
    if (percentage < 50) return '良いリズムができてきた';
    if (percentage < 70) return '素晴らしい継続力';
    if (percentage < 90) return '習慣マスターへの道';
    return '圧倒的継続力！💪';
  }
  return '';
};
