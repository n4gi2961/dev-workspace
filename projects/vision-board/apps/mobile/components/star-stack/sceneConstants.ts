import * as THREE from 'three';

/**
 * 窓際シーンの定数
 */

// --- 棚板 ---
export const SHELF = {
  SIZE: [4, 0.12, 2.5] as const,
  POSITION: [0, -1.31, 0] as const,
  COLOR: '#5a3a1a',
  ROUGHNESS: 0.85,
  METALNESS: 0.05,
};

// --- 窓枠 ---
export const WINDOW = {
  CENTER_Z: -1.8,
  CENTER_Y: 1.0,
  OPENING_WIDTH: 2.8,
  OPENING_HEIGHT: 3.2,
  FRAME_THICKNESS: 0.15,
  FRAME_DEPTH: 0.15,
  MUNTIN_THICKNESS: 0.08,
  MUNTIN_DEPTH: 0.08,
  COLOR: '#3d2b1f',
  ROUGHNESS: 0.9,
  METALNESS: 0.0,
};

// 窓台（sill）— 窓枠下部、棚板より少し手前
export const WINDOW_SILL = {
  SIZE: [3.25, 0.15, 0.4] as const,
  POSITION: [0, -0.6, -1.7] as const,
};

// --- 壁 ---
export const WALL = {
  COLOR: '#1a1520',
  ROUGHNESS: 0.95,
  METALNESS: 0.0,
  THICKNESS: 0.1,
};

// --- 夜空 ---
export const NIGHT_SKY = {
  SIZE: [8, 6] as const,
  POSITION: [0, 1.5, -3.0] as const,
  COLOR: '#0a0a1a',
};

// --- 月 ---
export const MOON = {
  RADIUS: 0.35,
  SEGMENTS: 16,
  POSITION: [1.8, 3.2, -4.0] as const,
  COLOR: '#e8e0c8',
  GLOW_SIZE: 1.5,
  GLOW_OPACITY: 0.15,
};

// --- 街灯ボケ光 ---
export const CITY_BOKEH = {
  COUNT: 70,
  SIZE: 0.08,
  X_RANGE: [-3.5, 3.5] as const,
  Y_RANGE: [-0.5, 2.5] as const,
  Z_RANGE: [-2.5, -4.0] as const,
  COLORS: ['#ffbb44', '#ff8844', '#aaccff'] as const,
  COLOR_WEIGHTS: [0.7, 0.2, 0.1] as const,
  OPACITY_RANGE: [0.3, 0.7] as const,
};

// --- パラレックス背景レイヤー ---
export const PARALLAX_LAYERS = {
  SKY: {
    POSITION: [0, 1.0, -5.0] as const,
    SIZE: [12, 9] as const,
    FACTOR: 0.05,
  },
  WINDOW: {
    POSITION: [0, 1.0, -1.8] as const,
    SIZE: [6.5, 5.5] as const,
    FACTOR: 0.15,
  },
  SHELF: {
    POSITION: [0, -1.25, 0.2] as const,
    SIZE: [5, 1.5] as const,
    FACTOR: 0.02,
  },
};

// --- ライティング ---
// テクスチャ背景使用時: ボトル+星に特化したライティング
export const LIGHTING_TEXTURED = {
  AMBIENT: { intensity: 0.08, color: '#100818' },
  MOONLIGHT: { position: [1.5, 3, 1] as const, intensity: 0.5, color: '#99aacc' },
  CITY_GLOW: { position: [0, -0.5, -1.5] as const, intensity: 0.6, color: '#ff8822', distance: 4, decay: 2 },
  RIM: { position: [-2, 3, 2] as const, intensity: 0.25, color: '#bbccff', distance: 6, decay: 1.5 },
};

// フォールバック用: 既存ジオメトリ背景のライティング
export const LIGHTING = {
  AMBIENT: { intensity: 0.15, color: '#1a1030' },
  MOONLIGHT: { position: [2, 4, -3] as const, intensity: 0.3, color: '#8899bb' },
  CITY_GLOW: { position: [0, 0, -2.5] as const, intensity: 0.4, color: '#ff9944', distance: 8, decay: 2 },
  RIM: { position: [1.5, 2, 1] as const, intensity: 0.15, color: '#ffffff', distance: 5, decay: 2 },
};
