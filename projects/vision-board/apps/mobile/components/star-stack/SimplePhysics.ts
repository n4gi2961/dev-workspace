import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

const CONFIG = STAR_STACK_CONFIG;
const MOBILE = CONFIG.MOBILE;
const PHYSICS = CONFIG.PHYSICS;

/**
 * JS簡易物理エンジン（Rapier代替）
 * - 重力 + 床/壁衝突 + 星間衝突
 * - 空間ハッシュグリッドで O(n) 衝突判定
 * - Float32Array で GC 軽減
 * - 静止判定でシミュレーション除外
 */

// 1星あたりのデータサイズ（Float32Array上のストライド）
// [px, py, pz, vx, vy, vz, rx, ry, rz, avx, avy, avz]
const STRIDE = 12;

// ボトル形状パラメータ
const BODY_RADIUS = CONFIG.BOTTLE_PROFILE.BODY_RADIUS - 0.05; // 壁内側マージン
const Y_OFFSET = CONFIG.BOTTLE.Y_OFFSET; // -1.25（ボトルのワールド座標オフセット）
const BOTTOM_CURVE = CONFIG.BOTTLE_PROFILE.BOTTOM_CURVE; // 0.15（底の丸み）
const FLOOR_Y = Y_OFFSET + BOTTOM_CURVE; // ボトル内側の底面（ワールド座標）
const STAR_RADIUS = CONFIG.STAR.OUTER_RADIUS;
// 双錐体の実効衝突半径（OUTER_RADIUSは先端のみ、本体はずっと細い）
const EFFECTIVE_RADIUS = STAR_RADIUS * 0.65; // ~0.078
// 生成後の強制静止タイムアウト（フレーム数）: 4.5秒 × 60fps = 270
const FORCE_SETTLE_FRAMES = 270;

export class SimplePhysics {
  private data: Float32Array;
  private settled: Uint8Array;
  private settledFrames: Uint8Array;
  private aliveFrames: Uint16Array; // 生成からの経過フレーム数
  private count: number = 0;
  private maxStars: number;
  private grid: Map<number, number[]>;

  constructor(maxStars: number = MOBILE.MAX_STARS) {
    this.maxStars = maxStars;
    this.data = new Float32Array(maxStars * STRIDE);
    this.settled = new Uint8Array(maxStars);
    this.settledFrames = new Uint8Array(maxStars);
    this.aliveFrames = new Uint16Array(maxStars);
    this.grid = new Map();
  }

  getCount(): number {
    return this.count;
  }

  /**
   * 新しい星を追加
   */
  addStar(px: number, py: number, pz: number): number {
    if (this.count >= this.maxStars) return -1;
    const i = this.count;
    const offset = i * STRIDE;

    // Position
    this.data[offset + 0] = px;
    this.data[offset + 1] = py;
    this.data[offset + 2] = pz;
    // Velocity (slight random)
    this.data[offset + 3] = (Math.random() - 0.5) * 0.2;
    this.data[offset + 4] = 0;
    this.data[offset + 5] = (Math.random() - 0.5) * 0.2;
    // Rotation
    this.data[offset + 6] = Math.random() * Math.PI * 2;
    this.data[offset + 7] = Math.random() * Math.PI * 2;
    this.data[offset + 8] = Math.random() * Math.PI * 2;
    // Angular velocity
    this.data[offset + 9] = (Math.random() - 0.5) * 3;
    this.data[offset + 10] = (Math.random() - 0.5) * 3;
    this.data[offset + 11] = (Math.random() - 0.5) * 3;

    this.settled[i] = 0;
    this.settledFrames[i] = 0;
    this.aliveFrames[i] = 0;
    this.count++;
    return i;
  }

  /**
   * 既存星を静止状態で配置（復元用）
   */
  addSettledStar(px: number, py: number, pz: number): number {
    if (this.count >= this.maxStars) return -1;
    const i = this.count;
    const offset = i * STRIDE;

    this.data[offset + 0] = px;
    this.data[offset + 1] = py;
    this.data[offset + 2] = pz;
    // Velocity = 0
    this.data[offset + 3] = 0;
    this.data[offset + 4] = 0;
    this.data[offset + 5] = 0;
    // Random rotation
    this.data[offset + 6] = Math.random() * Math.PI * 2;
    this.data[offset + 7] = Math.random() * Math.PI * 2;
    this.data[offset + 8] = Math.random() * Math.PI * 2;
    // Angular velocity = 0
    this.data[offset + 9] = 0;
    this.data[offset + 10] = 0;
    this.data[offset + 11] = 0;

    this.settled[i] = 1;
    this.settledFrames[i] = MOBILE.SETTLE_FRAMES;
    this.aliveFrames[i] = FORCE_SETTLE_FRAMES; // 既にタイムアウト済み扱い
    this.count++;
    return i;
  }

  /**
   * 物理ステップ実行
   */
  step(dt: number): void {
    const subDt = dt / MOBILE.PHYSICS_SUBSTEPS;

    for (let sub = 0; sub < MOBILE.PHYSICS_SUBSTEPS; sub++) {
      this.buildGrid();
      this.integrateAndCollide(subDt);
    }
  }

  /**
   * 空間ハッシュグリッド構築
   */
  private buildGrid(): void {
    this.grid.clear();
    const gridSize = MOBILE.GRID_SIZE;

    for (let i = 0; i < this.count; i++) {
      // settled星も含める（非settled星との衝突判定に必要）
      const offset = i * STRIDE;
      const gx = Math.floor(this.data[offset + 0] / gridSize);
      const gy = Math.floor(this.data[offset + 1] / gridSize);
      const gz = Math.floor(this.data[offset + 2] / gridSize);
      const key = (gx + 1000) * 2000000 + (gy + 1000) * 2000 + (gz + 1000);

      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(i);
    }
  }

  /**
   * 速度積分 + 衝突処理
   */
  private integrateAndCollide(dt: number): void {
    const gravity = PHYSICS.GRAVITY[1]; // -9.81
    const restitution = PHYSICS.RESTITUTION;
    const friction = PHYSICS.FRICTION;
    const linearDamping = PHYSICS.LINEAR_DAMPING;
    const angularDamping = PHYSICS.ANGULAR_DAMPING;
    const gridSize = MOBILE.GRID_SIZE;
    const collisionDist = EFFECTIVE_RADIUS * 2;

    for (let i = 0; i < this.count; i++) {
      if (this.settled[i]) continue;

      const o = i * STRIDE;

      // Gravity
      this.data[o + 4] += gravity * dt;

      // Linear damping
      this.data[o + 3] *= (1 - linearDamping * dt);
      this.data[o + 4] *= (1 - linearDamping * dt);
      this.data[o + 5] *= (1 - linearDamping * dt);

      // Angular damping
      this.data[o + 9] *= (1 - angularDamping * dt);
      this.data[o + 10] *= (1 - angularDamping * dt);
      this.data[o + 11] *= (1 - angularDamping * dt);

      // Integrate position
      this.data[o + 0] += this.data[o + 3] * dt;
      this.data[o + 1] += this.data[o + 4] * dt;
      this.data[o + 2] += this.data[o + 5] * dt;

      // Integrate rotation
      this.data[o + 6] += this.data[o + 9] * dt;
      this.data[o + 7] += this.data[o + 10] * dt;
      this.data[o + 8] += this.data[o + 11] * dt;

      // --- Floor collision ---
      if (this.data[o + 1] < FLOOR_Y + EFFECTIVE_RADIUS) {
        this.data[o + 1] = FLOOR_Y + EFFECTIVE_RADIUS;
        this.data[o + 4] = -this.data[o + 4] * restitution;
        // Friction on floor
        this.data[o + 3] *= (1 - friction * dt);
        this.data[o + 5] *= (1 - friction * dt);
      }

      // --- Wall collision (cylindrical) ---
      const px = this.data[o + 0];
      const pz = this.data[o + 2];
      const distXZ = Math.sqrt(px * px + pz * pz);
      const wallRadius = this.getWallRadiusAtHeight(this.data[o + 1]);

      if (distXZ > wallRadius - EFFECTIVE_RADIUS && distXZ > 0.001) {
        // Push back inside
        const nx = px / distXZ;
        const nz = pz / distXZ;
        const penetration = distXZ - (wallRadius - EFFECTIVE_RADIUS);
        this.data[o + 0] -= nx * penetration;
        this.data[o + 2] -= nz * penetration;

        // Reflect velocity along normal
        const vDotN = this.data[o + 3] * nx + this.data[o + 5] * nz;
        if (vDotN > 0) {
          this.data[o + 3] -= (1 + restitution) * vDotN * nx;
          this.data[o + 5] -= (1 + restitution) * vDotN * nz;
        }
      }

      // --- Star-star collision (spatial hash) ---
      const gx = Math.floor(this.data[o + 0] / gridSize);
      const gy = Math.floor(this.data[o + 1] / gridSize);
      const gz = Math.floor(this.data[o + 2] / gridSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = (gx + dx + 1000) * 2000000 + (gy + dy + 1000) * 2000 + (gz + dz + 1000);
            const cell = this.grid.get(key);
            if (!cell) continue;

            for (const j of cell) {
              if (j === i) continue;
              // 非settled同士は i < j のペアだけ処理（二重処理防止）
              // settled星との衝突は常に処理（settledは主ループでスキップされるため）
              if (j < i && !this.settled[j]) continue;
              const oj = j * STRIDE;

              const dpx = this.data[o + 0] - this.data[oj + 0];
              const dpy = this.data[o + 1] - this.data[oj + 1];
              const dpz = this.data[o + 2] - this.data[oj + 2];
              const dist = Math.sqrt(dpx * dpx + dpy * dpy + dpz * dpz);

              if (dist < collisionDist && dist > 0.0001) {
                const invDist = 1 / dist;
                // Separation: settled星相手は全量をiに、非settled同士は半分ずつ
                const overlap = (collisionDist - dist) * (this.settled[j] ? 1.0 : 0.5);
                const sepX = dpx * invDist * overlap;
                const sepY = dpy * invDist * overlap;
                const sepZ = dpz * invDist * overlap;

                this.data[o + 0] += sepX;
                this.data[o + 1] += sepY;
                this.data[o + 2] += sepZ;
                if (!this.settled[j]) {
                  this.data[oj + 0] -= sepX;
                  this.data[oj + 1] -= sepY;
                  this.data[oj + 2] -= sepZ;
                }

                // Impulse-based velocity exchange (正しい衝突応答)
                const dvx = this.data[o + 3] - this.data[oj + 3];
                const dvy = this.data[o + 4] - this.data[oj + 4];
                const dvz = this.data[o + 5] - this.data[oj + 5];
                const dvDotN = (dvx * dpx + dvy * dpy + dvz * dpz) * invDist;

                if (dvDotN < 0) {
                  // settled星 = 無限質量（壁と同じ反射）、非settled = 等質量
                  const impulseMag = this.settled[j]
                    ? -(1 + restitution) * dvDotN
                    : -(1 + restitution) * dvDotN * 0.5;
                  const nx2 = dpx * invDist;
                  const ny2 = dpy * invDist;
                  const nz2 = dpz * invDist;

                  this.data[o + 3] += impulseMag * nx2;
                  this.data[o + 4] += impulseMag * ny2;
                  this.data[o + 5] += impulseMag * nz2;
                  if (!this.settled[j]) {
                    this.data[oj + 3] -= impulseMag * nx2;
                    this.data[oj + 4] -= impulseMag * ny2;
                    this.data[oj + 5] -= impulseMag * nz2;
                    // Wake up collided star
                    this.settled[j] = 0;
                    this.settledFrames[j] = 0;
                  }
                }
              }
            }
          }
        }
      }

      // --- 生存フレーム加算 ---
      this.aliveFrames[i]++;

      // --- Settle detection ---
      const speed = Math.sqrt(
        this.data[o + 3] ** 2 + this.data[o + 4] ** 2 + this.data[o + 5] ** 2
      );
      const forceSettle = this.aliveFrames[i] >= FORCE_SETTLE_FRAMES;
      if (speed < MOBILE.SETTLE_THRESHOLD || forceSettle) {
        this.settledFrames[i]++;
        // 通常静止 or 5秒タイムアウトで強制静止
        if (this.settledFrames[i] >= MOBILE.SETTLE_FRAMES || forceSettle) {
          this.settled[i] = 1;
          // Zero out velocity
          this.data[o + 3] = 0;
          this.data[o + 4] = 0;
          this.data[o + 5] = 0;
          this.data[o + 9] = 0;
          this.data[o + 10] = 0;
          this.data[o + 11] = 0;
        }
      } else {
        this.settledFrames[i] = 0;
      }
    }
  }

  /**
   * 高さに応じた壁の半径（ボトル形状を近似）
   */
  private getWallRadiusAtHeight(y: number): number {
    const profile = CONFIG.BOTTLE_PROFILE;
    // ワールド座標からボトルローカル座標に変換
    const localY = y - Y_OFFSET;
    const bodyTop = profile.BOTTOM_CURVE + profile.BODY_HEIGHT;
    const shoulderTop = bodyTop + profile.SHOULDER_HEIGHT;

    if (localY <= bodyTop) {
      return BODY_RADIUS;
    } else if (localY <= shoulderTop) {
      // 肩: 線形補間
      const t = (localY - bodyTop) / profile.SHOULDER_HEIGHT;
      return BODY_RADIUS + (profile.NECK_RADIUS - 0.05 - BODY_RADIUS) * t;
    } else {
      return profile.NECK_RADIUS - 0.05;
    }
  }

  /**
   * 物理シミュレーションを指定回数実行（復元星のpre-settle用）
   */
  warmup(iterations: number): void {
    const dt = 1 / 60;
    for (let i = 0; i < iterations; i++) {
      this.step(dt);
    }
  }

  /**
   * 全星を強制的に静止状態にする
   */
  settleAll(): void {
    for (let i = 0; i < this.count; i++) {
      const o = i * STRIDE;
      this.data[o + 3] = 0;
      this.data[o + 4] = 0;
      this.data[o + 5] = 0;
      this.data[o + 9] = 0;
      this.data[o + 10] = 0;
      this.data[o + 11] = 0;
      this.settled[i] = 1;
      this.settledFrames[i] = MOBILE.SETTLE_FRAMES;
    }
  }

  /**
   * i番目の星の位置・回転を取得
   */
  getPosition(i: number): [number, number, number] {
    const o = i * STRIDE;
    return [this.data[o + 0], this.data[o + 1], this.data[o + 2]];
  }

  getRotation(i: number): [number, number, number] {
    const o = i * STRIDE;
    return [this.data[o + 6], this.data[o + 7], this.data[o + 8]];
  }

  isSettled(i: number): boolean {
    return this.settled[i] === 1;
  }

  /**
   * 1つでも未静止の星があるか（物理ステップのスキップ判定用）
   */
  hasActiveStars(): boolean {
    for (let i = 0; i < this.count; i++) {
      if (!this.settled[i]) return true;
    }
    return false;
  }

  reset(): void {
    this.count = 0;
    this.data.fill(0);
    this.settled.fill(0);
    this.settledFrames.fill(0);
    this.aliveFrames.fill(0);
    this.grid.clear();
  }
}
