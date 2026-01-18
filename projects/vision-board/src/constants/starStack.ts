// Star Stack Constants

export const STAR_STACK_CONFIG = {
  // 星の最大数
  MAX_STARS: 500,

  // ボトルのサイズ（レガシー、コライダー用に維持）
  BOTTLE: {
    HEIGHT: 2.5,
    RADIUS: 0.6,
    WALL_THICKNESS: 0.05,
    BODY_HEIGHT: 1.8,
    SHOULDER_HEIGHT: 0.3,
    NECK_HEIGHT: 0.5,
    Y_OFFSET: -1.25, // ボトル高さの半分だけ下に配置
  },

  // ボトルプロファイル（LatheGeometry用）
  // 基準: ボトル高さ 2.5, ボトル半径 0.6
  BOTTLE_PROFILE: {
    // 本体
    BODY_RADIUS: 0.6,
    BODY_HEIGHT: 1.4,
    // 肩のカーブ
    SHOULDER_HEIGHT: 0.1,
    // 底の丸み
    BOTTOM_CURVE: 0.15,
    // ネック
    NECK_HEIGHT: 0.15,
    NECK_RADIUS: 0.45,           // 0.6 × 75%
    // 口リム（薄いフランジ状）
    RIM_HEIGHT: 0.24,            // 0.06 × 4
    RIM_OUTER_RADIUS: 0.54,      // 0.6 × 90%
    RIM_INNER_RADIUS: 0.40,      // コルク半径より大きく（コルクが入る穴）
    // コルク（半径はボトルの60%、口リムに少しだけ埋まる）
    CORK_HEIGHT: 0.5,
    CORK_RADIUS: 0.36,           // 0.6 × 60%
    CORK_INSERT: 0.03,           // 口リム高さの半分
    // ジオメトリ設定
    LATHE_SEGMENTS: 64,
    PROFILE_SEGMENTS: 80,
  },

  // 星のサイズ
  STAR: {
    OUTER_RADIUS: 0.12,
    INNER_RADIUS: 0.05,
    HEIGHT: 0.09,
  },

  // 物理エンジン設定
  PHYSICS: {
    GRAVITY: [0, -9.81, 0] as [number, number, number],
    RESTITUTION: 0.2,
    FRICTION: 0.8,
    LINEAR_DAMPING: 0.5,
    ANGULAR_DAMPING: 0.3,
  },

  // 自動追加の間隔（ミリ秒）
  AUTO_SPAWN_INTERVAL: 100,

  // バッチ追加のサイズ
  BATCH_SIZE: 20,

  // スポーン位置
  SPAWN: {
    HEIGHT_BASE: 3,
    HEIGHT_VARIANCE: 0.5,
    HORIZONTAL_SPREAD: 0.4,
  },

  // カメラ設定
  CAMERA: {
    POSITION: [0, 5.5, 4] as [number, number, number],
    FOV: 45,
  },

  // OrbitControls設定
  ORBIT_CONTROLS: {
    MIN_DISTANCE: 2,
    MAX_DISTANCE: 8,
    MIN_POLAR_ANGLE: Math.PI / 6,
    MAX_POLAR_ANGLE: Math.PI / 2,
  },
} as const;

export type StarStackConfig = typeof STAR_STACK_CONFIG;
