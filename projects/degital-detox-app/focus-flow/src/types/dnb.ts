// DNB（Dual N-Back）ゲーム関連の型定義

export interface GridPosition {
  row: number; // 0-2
  col: number; // 0-2
}

export interface UserResponse {
  position: boolean | null;
  number: boolean | null;
  both: boolean | null;     // 「すべて同じ」の応答
  neither: boolean | null;  // 「すべて異なる」の応答
  responseTime: number | null;
}

export interface DNBTrial {
  position: GridPosition;
  number: number; // 1-9
  index: number;
  positionMatch: boolean;
  numberMatch: boolean;
  userResponse: UserResponse;
  timestamp: number;
}

export interface SessionStats {
  correctPositions: number;
  correctNumbers: number;
  correctBoth: number;      // 「すべて同じ」の正解数
  correctNeither: number;   // 「すべて異なる」の正解数
  falsePositives: number;
  misses: number;
  totalResponseTime: number;
  responseCount: number;
}

export interface DNBSessionData {
  id: string;
  timestamp: string;
  nLevel: number;
  finalLevel: number;
  totalTrials: number;
  accuracy: number;
  positionAccuracy: number;
  numberAccuracy: number;
  avgResponseTime: number;
  correctResponses: number;
  falsePositives: number;
  misses: number;
  improvementRate?: number;
  focusContribution: number;
}

export interface DNBStatistics {
  totalSessions: number;
  totalTrainingTime: number;
  averageLevel: number;
  maxLevel: number;
  overallAccuracy: number;
  improvementRate: number;
  weeklyProgress: DNBSessionData[];
  cognitiveGains: CognitiveGains;
  lastSessionDate?: string;
}

export interface CognitiveGains {
  accuracyImprovement: number;
  levelProgression: number;
  responseTimeReduction: number;
  overallCognitiveGain: number;
}

export interface WeeklyReport {
  totalSessions: number;
  avgAccuracy: number;
  avgLevel: number;
  maxLevel: number;
  totalTrainingTime: number;
  improvementRate: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export const DNB_GAME_STATES = {
  MENU: 'menu',
  INSTRUCTIONS: 'instructions',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  STIMULUS_SHOW: 'stimulus_show',
  INTERVAL: 'interval',
  PAUSED: 'paused',
  COMPLETED: 'completed'
} as const;

export type DNBGameState = typeof DNB_GAME_STATES[keyof typeof DNB_GAME_STATES];

export type ResponseType = 'position' | 'number' | 'both' | 'neither';