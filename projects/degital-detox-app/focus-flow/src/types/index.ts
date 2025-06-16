export interface UserData {
  id: string;
  name: string;
  settings: UserSettings;
  stats: UserStats;
  gameScores: GameScore[];
  detoxSessions: DetoxSession[];
}

export interface UserSettings {
  detoxReminders: boolean;
  focusAlerts: boolean;
  theme: 'light' | 'dark';
  notifications: boolean;
  themeColor: 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'rose' | 'mint' | 'amber' | 'slate' | 'purple';
}

export interface UserStats {
  dailyScore: number;
  screenTime: number;
  focusSessions: number;
  detoxTime: number;
  productivityGain: number;
  weeklyTrend: number[];
}

export interface GameScore {
  id: string;
  gameType: 'breathing' | 'memory' | 'pattern' | 'attention';
  score: number;
  timestamp: Date;
  duration: number;
}

export interface DetoxSession {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  completed: boolean;
}

export type NavigationTab = 'home' | 'dashboard' | 'detox' | 'games' | 'settings';

export interface AppState {
  user: UserData | null;
  isDetoxActive: boolean;
  currentScore: number;
  activeTab: NavigationTab;
  detoxSession: DetoxSession | null;
}

export type AppAction = 
  | { type: 'SET_USER'; payload: UserData }
  | { type: 'START_DETOX' }
  | { type: 'END_DETOX' }
  | { type: 'UPDATE_SCORE'; payload: number }
  | { type: 'SET_ACTIVE_TAB'; payload: NavigationTab }
  | { type: 'ADD_GAME_SCORE'; payload: GameScore }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> };