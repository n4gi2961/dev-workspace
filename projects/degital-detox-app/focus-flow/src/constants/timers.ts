import { TimerConfig } from '../types/timer';

export const TIMER_CONFIGS: Record<string, TimerConfig> = {
  pomodoro: {
    id: 'pomodoro',
    name: 'ポモドーロ',
    icon: '🍅',
    defaultDuration: 25,
    color: '#E76F51',
    sound: 'pomodoro_complete'
  },
  water: {
    id: 'water',
    name: '水飲み',
    icon: '💧',
    defaultDuration: 15,
    color: '#2A9D8F',
    sound: 'water_reminder'
  },
  stand: {
    id: 'stand',
    name: 'スタンド',
    icon: '🚶',
    defaultDuration: 30,
    color: '#F4A261',
    sound: 'stand_reminder'
  }
};

export const TIMER_SOUNDS = {
  pomodoro_complete: '/sounds/bell.mp3',
  water_reminder: '/sounds/water_drop.mp3',
  stand_reminder: '/sounds/chime.mp3'
};