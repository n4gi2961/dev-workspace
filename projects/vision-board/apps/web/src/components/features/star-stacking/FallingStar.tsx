'use client';

import { useRef, useMemo, useEffect } from 'react';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { useMatcapTexture } from '@react-three/drei';
import * as THREE from 'three';
import { createStarGeometry } from './starGeometry';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

export interface StarInstance {
  key: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: THREE.Color;
}

interface FallingStarProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: THREE.Color;
}

/**
 * A single falling star with physics
 */
export function FallingStar({ position, rotation, color }: FallingStarProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [matcap] = useMatcapTexture('F79686_FCCBD4_E76644_E76B56', 256);

  const starGeometry = useMemo(
    () =>
      createStarGeometry(
        STAR_STACK_CONFIG.STAR.OUTER_RADIUS,
        STAR_STACK_CONFIG.STAR.INNER_RADIUS,
        STAR_STACK_CONFIG.STAR.HEIGHT
      ),
    []
  );

  // Add random spin on spawn
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setAngvel(
        {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 5,
        },
        true
      );
    }
  }, []);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      rotation={rotation}
      colliders="hull"
      restitution={STAR_STACK_CONFIG.PHYSICS.RESTITUTION}
      friction={STAR_STACK_CONFIG.PHYSICS.FRICTION}
      linearDamping={STAR_STACK_CONFIG.PHYSICS.LINEAR_DAMPING}
      angularDamping={STAR_STACK_CONFIG.PHYSICS.ANGULAR_DAMPING}
    >
      <mesh geometry={starGeometry} renderOrder={1}>
        <meshMatcapMaterial matcap={matcap} color={color} />
      </mesh>
    </RigidBody>
  );
}
