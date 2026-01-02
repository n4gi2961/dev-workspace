export interface BreathingPhase {
  type: 'inhale' | 'hold' | 'exhale';
  duration: number;
  instruction: string;
}

export interface BreathingPattern {
  name: string;
  phases: BreathingPhase[];
  description: string;
}

export const BREATHING_PATTERNS: Record<string, BreathingPattern> = {
  box: {
    name: 'ボックス呼吸',
    phases: [
      { type: 'inhale', duration: 4000, instruction: '吸う' },
      { type: 'hold', duration: 4000, instruction: '止める' },
      { type: 'exhale', duration: 4000, instruction: '吐く' },
      { type: 'hold', duration: 4000, instruction: '止める' }
    ],
    description: 'アメリカ海軍でも採用 ストレス軽減と集中力向上'
  },
  relaxing: {
    name: '4-7-8呼吸法',
    phases: [
      { type: 'inhale', duration: 4000, instruction: '吸う' },
      { type: 'hold', duration: 7000, instruction: '止める' },
      { type: 'exhale', duration: 8000, instruction: '吐く' }
    ],
    description: '深いリラックスと睡眠改善'
  },
  balanced: {
    name: 'バランス呼吸',
    phases: [
      { type: 'inhale', duration: 5000, instruction: '吸う' },
      { type: 'exhale', duration: 5000, instruction: '吐く' }
    ],
    description: '心身のバランス調整'
  }
};

export const SESSION_STATES = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed'
} as const;

export type SessionState = typeof SESSION_STATES[keyof typeof SESSION_STATES];

export const SESSION_DURATIONS = {
  SHORT: 3 * 60,   // 3分
  MEDIUM: 5 * 60,  // 5分
  LONG: 10 * 60    // 10分
} as const;

export const PHASE_COLORS = {
  inhale: '#2A9D8F',   // ターコイズ（吸う）
  hold: '#F4A261',     // オレンジ（止める）
  exhale: '#0099FF'    // スカイブルー（吐く）
} as const;

export interface BreathingSessionData {
  id: string;
  timestamp: string;
  pattern: string;
  duration: number;
  plannedDuration: number;
  breathCount: number;
  consistencyScore: number;
  completionRate: number;
  metrics: {
    avgBreathsPerMinute: string;
    totalFocusTime: number;
  };
}

export interface BreathingStatistics {
  totalSessions: number;
  totalMeditationTime: number;
  averageSessionLength: number;
  preferredPattern: string;
  streakDays: number;
  weeklyProgress: BreathingSessionData[];
  lastSessionDate?: string;
}