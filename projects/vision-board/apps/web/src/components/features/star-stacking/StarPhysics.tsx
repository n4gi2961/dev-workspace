'use client';

import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

/**
 * Physics colliders for the bottle container
 * Creates a cylindrical container with curved bottom using colliders
 */
export function BottleColliders() {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  const yOffset = STAR_STACK_CONFIG.BOTTLE.Y_OFFSET;

  const wallSegments = 24;
  const wallThickness = 0.03;

  // 新しいプロファイルに基づく寸法
  const bodyRadius = profile.BODY_RADIUS;
  const bottomCurve = profile.BOTTOM_CURVE;
  const bodyHeight = profile.BODY_HEIGHT;

  // 壁の高さ（本体部分のみ）
  const wallHeight = bodyHeight;

  return (
    <RigidBody type="fixed" colliders={false} position={[0, yOffset, 0]}>
      {/* 床（丸みのある底に対応するため、少し上に配置） */}
      <CuboidCollider
        args={[bodyRadius * 0.85, 0.02, bodyRadius * 0.85]}
        position={[0, bottomCurve + 0.02, 0]}
      />

      {/* 底の丸み用の追加コライダー（星が角を貫通しないよう） */}
      <BallCollider
        args={[bodyRadius * 0.3]}
        position={[0, bottomCurve * 0.5, 0]}
      />

      {/* 円筒形の壁（本体部分） */}
      {Array.from({ length: wallSegments }).map((_, i) => {
        const angle = (i / wallSegments) * Math.PI * 2;
        const x = Math.cos(angle) * bodyRadius;
        const z = Math.sin(angle) * bodyRadius;

        return (
          <CuboidCollider
            key={i}
            args={[wallThickness, wallHeight / 2, (bodyRadius * Math.PI) / wallSegments]}
            position={[x, bottomCurve + wallHeight / 2, z]}
            rotation={[0, -angle, 0]}
          />
        );
      })}
    </RigidBody>
  );
}
