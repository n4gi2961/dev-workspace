export const NAVIGATION_TABS = {
  HOME: 'home',
  DASHBOARD: 'dashboard', 
  DETOX: 'detox',
  GAMES: 'games',
  SETTINGS: 'settings',
} as const;

export const GAME_TYPES = {
  BREATHING: 'breathing',
  MEMORY: 'memory',
  PATTERN: 'pattern',
  ATTENTION: 'attention',
} as const;

export const GAME_DURATIONS = {
  [GAME_TYPES.BREATHING]: 5 * 60, // 5分
  [GAME_TYPES.MEMORY]: 3 * 60,   // 3分
  [GAME_TYPES.PATTERN]: 5 * 60,  // 5分
  [GAME_TYPES.ATTENTION]: 7 * 60, // 7分
} as const;

export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  NEEDS_IMPROVEMENT: 20,
} as const;

export const DETOX_TIPS = [
  '20分のデジタルデトックスは、2時間の集中力向上につながります。',
  '深呼吸をして、周りの環境に意識を向けてみましょう。',
  'スマートフォンを手の届かない場所に置くことで、集中力が向上します。',
  '自然の音や瞑想音楽を聞いて、心を落ち着かせましょう。',
  '軽いストレッチや散歩で、体をリフレッシュしてください。',
  'デジタルデトックス中は、好きな本を読む時間にしてみてください。',
  '手書きで今日の感謝を3つ書き出してみましょう。',
] as const;

export const LOCAL_STORAGE_KEYS = {
  USER_DATA: 'focusflow_user_data',
  USER_SETTINGS: 'focusflow_user_settings',
  GAME_SCORES: 'focusflow_game_scores',
  DETOX_SESSIONS: 'focusflow_detox_sessions',
} as const;

export const DEFAULT_USER_SETTINGS = {
  detoxReminders: true,
  focusAlerts: false,
  theme: 'light' as const,
  notifications: true,
  themeColor: 'default' as const,
};

export const THEME_COLORS = {
  // オーシャンカーム（寒色系）
  oceanCalm: {
    name: 'オーシャンカーム',
    primary: '#264653',
    secondary: '#2A9D8F',
    accent: '#E76F51',
    background: '#F1FAEE',
  },
  deepFocus: {
    name: 'ディープフォーカス',
    primary: '#003049',
    secondary: '#669BBC',
    accent: '#FFC300',
    background: '#F0F8FF',
  },
  serenity: {
    name: 'セレニティ',
    primary: '#0077B6',
    secondary: '#00B4D8',
    accent: '#90E0EF',
    background: '#E6F9FF',
  },
  tranquil: {
    name: 'トランクィル',
    primary: '#03045E',
    secondary: '#0096C7',
    accent: '#CAF0F8',
    background: '#F0F9FF',
  },
  mistyWater: {
    name: 'ミスティウォーター',
    primary: '#1D3557',
    secondary: '#457B9D',
    accent: '#A8DADC',
    background: '#F1F9FA',
  },
  // サンライズ（暖色系）
  sunrise: {
    name: 'サンライズ',
    primary: '#FF8C42',
    secondary: '#FFD166',
    accent: '#06D6A0',
    background: '#FFF9E6',
  },
  morningGlow: {
    name: 'モーニンググロウ',
    primary: '#F4A261',
    secondary: '#E9C46A',
    accent: '#2A9D8F',
    background: '#FFF8E1',
  },
  daybreak: {
    name: 'デイブレイク',
    primary: '#F77F00',
    secondary: '#FCBF49',
    accent: '#52B788',
    background: '#FFFAEB',
  },
  aurora: {
    name: 'オーロラ',
    primary: '#EE6C4D',
    secondary: '#FFE8D6',
    accent: '#95D5B2',
    background: '#FFF5F0',
  },
  sunshine: {
    name: 'サンシャイン',
    primary: '#F8961E',
    secondary: '#F9C74F',
    accent: '#43AA8B',
    background: '#FFFBF0',
  },
  // 既存のテーマ（互換性のため保持）
  default: {
    name: 'デフォルト',
    primary: '#264653',
    secondary: '#2A9D8F',
    accent: '#E76F51',
    background: '#F1FAEE',
  },
  ocean: {
    name: 'オーシャン',
    primary: '#0077BE',
    secondary: '#00A8E8',
    accent: '#007EA7',
    background: '#E6F7FF',
  },
  forest: {
    name: 'フォレスト',
    primary: '#2D5016',
    secondary: '#3B7321',
    accent: '#65A30D',
    background: '#F0F9E6',
  },
  sunset: {
    name: 'サンセット',
    primary: '#8B3A3A',
    secondary: '#D2691E',
    accent: '#FF6347',
    background: '#FFF8DC',
  },
  lavender: {
    name: 'ラベンダー',
    primary: '#663399',
    secondary: '#9966CC',
    accent: '#DDA0DD',
    background: '#F8F4FF',
  },
  rose: {
    name: 'ローズ',
    primary: '#8B1538',
    secondary: '#C21807',
    accent: '#FF69B4',
    background: '#FFF0F5',
  },
  mint: {
    name: 'ミント',
    primary: '#2F5233',
    secondary: '#40826D',
    accent: '#52B788',
    background: '#F1FDF4',
  },
  amber: {
    name: 'アンバー',
    primary: '#B45309',
    secondary: '#D97706',
    accent: '#F59E0B',
    background: '#FFFBEB',
  },
  slate: {
    name: 'スレート',
    primary: '#334155',
    secondary: '#475569',
    accent: '#64748B',
    background: '#F8FAFC',
  },
  purple: {
    name: 'パープル',
    primary: '#6B21A8',
    secondary: '#9333EA',
    accent: '#A855F7',
    background: '#FAF5FF',
  },
} as const;

export const MAX_SCORE = 100;
export const MIN_SCORE = 0;
export const DEFAULT_SCORE = 50;