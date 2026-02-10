'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { StarBottle } from './StarBottle';
import { BottleColliders } from './StarPhysics';
import { FallingStar, StarInstance } from './FallingStar';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

interface StarStackSceneProps {
  stars: StarInstance[];
  darkMode?: boolean;
  showCork?: boolean;
}

function Scene({ stars, showCork = true }: { stars: StarInstance[]; showCork?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 5, -3]} intensity={0.5} color="#ffe4b5" />

      <Physics gravity={STAR_STACK_CONFIG.PHYSICS.GRAVITY}>
        <BottleColliders />

        {/* Render individual stars */}
        {stars.map((star) => (
          <FallingStar
            key={star.key}
            position={star.position}
            rotation={star.rotation}
            color={star.color}
          />
        ))}
      </Physics>

      <Suspense fallback={null}>
        <StarBottle showCork={showCork} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={STAR_STACK_CONFIG.ORBIT_CONTROLS.MIN_DISTANCE}
        maxDistance={STAR_STACK_CONFIG.ORBIT_CONTROLS.MAX_DISTANCE}
        minPolarAngle={STAR_STACK_CONFIG.ORBIT_CONTROLS.MIN_POLAR_ANGLE}
        maxPolarAngle={STAR_STACK_CONFIG.ORBIT_CONTROLS.MAX_POLAR_ANGLE}
      />
    </>
  );
}

export function StarStackScene({ stars, darkMode = false, showCork = true }: StarStackSceneProps) {
  const bgColor = darkMode ? '#1f2937' : '#f5f0e8';
  const fogColor = darkMode ? '#1f2937' : '#f5f0e8';

  return (
    <Canvas
      camera={{
        position: STAR_STACK_CONFIG.CAMERA.POSITION,
        fov: STAR_STACK_CONFIG.CAMERA.FOV,
      }}
      shadows
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 5, 15]} />
      <Suspense fallback={null}>
        <Scene stars={stars} showCork={showCork} />
      </Suspense>
    </Canvas>
  );
}
