export type TimerType = 'pomodoro' | 'water' | 'stand';

export interface TimerConfig {
  id: TimerType;
  name: string;
  icon: string;
  defaultDuration: number; // 分単位
  color: string;
  sound: string;
}

export interface TimerState {
  id: TimerType;
  isActive: boolean;
  timeRemaining: number; // 秒単位
  totalDuration: number; // 秒単位
  isPaused: boolean;
  isBreak?: boolean; // ポモドーロ用
  isCompleted?: boolean; // タイマー終了状態
}

export interface PomodoroState extends TimerState {
  focusDuration: number; // 分単位
  breakDuration: number; // 分単位
  isBreak: boolean;
  cycle: number;
  isCompleted: boolean; // タイマー終了状態
}