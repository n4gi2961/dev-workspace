import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { PARALLAX_LAYERS } from './sceneConstants';
import type { SceneTextures } from '../../hooks/useSceneTextures';

interface ParallaxBackgroundProps {
  textures: SceneTextures;
}

/**
 * テクスチャ画像を3レイヤーに配置し、カメラ移動に応じてパラレックス効果を出す
 * - Layer 0 (sky): 最奥 — 夜空・月・街のボケ光
 * - Layer 1 (window): 中間 — 窓枠・壁
 * - Layer 2 (shelf): 最手前 — 棚板・窓台
 */
export function ParallaxBackground({ textures }: ParallaxBackgroundProps) {
  const skyRef = useRef<THREE.Mesh>(null);
  const windowRef = useRef<THREE.Mesh>(null);
  const shelfRef = useRef<THREE.Mesh>(null);

  const skyGeo = useMemo(() => new THREE.PlaneGeometry(...PARALLAX_LAYERS.SKY.SIZE), []);
  const windowGeo = useMemo(() => new THREE.PlaneGeometry(...PARALLAX_LAYERS.WINDOW.SIZE), []);
  const shelfGeo = useMemo(() => new THREE.PlaneGeometry(...PARALLAX_LAYERS.SHELF.SIZE), []);

  // パラレックス: カメラのXY位置をレイヤーごとに異なる係数で反映
  useFrame(({ camera }) => {
    const cx = camera.position.x;
    const cy = camera.position.y;

    if (skyRef.current) {
      skyRef.current.position.x = PARALLAX_LAYERS.SKY.POSITION[0] + cx * PARALLAX_LAYERS.SKY.FACTOR;
      skyRef.current.position.y = PARALLAX_LAYERS.SKY.POSITION[1] + (cy - 5.5) * PARALLAX_LAYERS.SKY.FACTOR;
    }
    if (windowRef.current) {
      windowRef.current.position.x = PARALLAX_LAYERS.WINDOW.POSITION[0] + cx * PARALLAX_LAYERS.WINDOW.FACTOR;
      windowRef.current.position.y = PARALLAX_LAYERS.WINDOW.POSITION[1] + (cy - 5.5) * PARALLAX_LAYERS.WINDOW.FACTOR;
    }
    if (shelfRef.current) {
      shelfRef.current.position.x = PARALLAX_LAYERS.SHELF.POSITION[0] + cx * PARALLAX_LAYERS.SHELF.FACTOR;
      shelfRef.current.position.y = PARALLAX_LAYERS.SHELF.POSITION[1] + (cy - 5.5) * PARALLAX_LAYERS.SHELF.FACTOR;
    }
  });

  return (
    <group>
      {/* Layer 0: 夜空（最奥） */}
      {textures.sky && (
        <mesh
          ref={skyRef}
          geometry={skyGeo}
          position={[...PARALLAX_LAYERS.SKY.POSITION]}
          renderOrder={-3}
        >
          <meshBasicMaterial map={textures.sky} />
        </mesh>
      )}

      {/* Layer 1: 窓枠・壁（中間） */}
      {textures.window && (
        <mesh
          ref={windowRef}
          geometry={windowGeo}
          position={[...PARALLAX_LAYERS.WINDOW.POSITION]}
          renderOrder={-2}
        >
          <meshBasicMaterial map={textures.window} transparent />
        </mesh>
      )}

      {/* Layer 2: 棚板（最手前） */}
      {textures.shelf && (
        <mesh
          ref={shelfRef}
          geometry={shelfGeo}
          position={[...PARALLAX_LAYERS.SHELF.POSITION]}
          renderOrder={-1}
        >
          <meshBasicMaterial map={textures.shelf} transparent />
        </mesh>
      )}
    </group>
  );
}
