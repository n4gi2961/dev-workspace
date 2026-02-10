import { HOVER_FONT_SIZES } from './types';

// Hover font configuration
export const HOVER_FONT_CONFIG = {
  [HOVER_FONT_SIZES.SMALL]: { title: 14, text: 13, icon: 12, label: 12 },
  [HOVER_FONT_SIZES.MEDIUM]: { title: 18, text: 16, icon: 16, label: 14 },
  [HOVER_FONT_SIZES.LARGE]: { title: 22, text: 19, icon: 20, label: 16 },
};

// Routine colors - vibrant but readable
export const ROUTINE_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

// Font options
export const FONT_OPTIONS = [
  { label: 'ゴシック', value: "'Noto Sans JP', sans-serif" },
  { label: '明朝', value: "'Noto Serif JP', serif" },
  { label: '手書き', value: "'Klee One', cursive" },
];

// Size options
export const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

// Color options for dark mode
export const COLOR_OPTIONS_DARK = [
  '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#a855f7'
];

// Color options for light mode
export const COLOR_OPTIONS_LIGHT = [
  '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#a855f7'
];
