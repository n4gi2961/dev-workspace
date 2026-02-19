import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  SHELF,
  WINDOW,
  WINDOW_SILL,
  WALL,
  NIGHT_SKY,
  MOON,
  CITY_BOKEH,
} from './sceneConstants';

const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

/**
 * 窓際シーン背景
 * 棚板・窓枠・壁・夜空・月・街灯ボケ光を3D空間に配置
 */
export function WindowScene() {
  return (
    <>
      <Shelf />
      <WindowFrame />
      <Walls />
      <NightSky />
      <MoonWithGlow />
      <CityBokeh />
    </>
  );
}

// --- 棚板 ---
function Shelf() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: SHELF.COLOR,
    roughness: SHELF.ROUGHNESS,
    metalness: SHELF.METALNESS,
  }), []);

  return (
    <mesh position={SHELF.POSITION as unknown as [number, number, number]} material={material}>
      <boxGeometry args={[...SHELF.SIZE]} />
    </mesh>
  );
}

// --- 窓枠 ---
function WindowFrame() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: WINDOW.COLOR,
    roughness: WINDOW.ROUGHNESS,
    metalness: WINDOW.METALNESS,
  }), []);

  const z = WINDOW.CENTER_Z;
  const cy = WINDOW.CENTER_Y;
  const halfW = WINDOW.OPENING_WIDTH / 2 + WINDOW.FRAME_THICKNESS / 2;
  const frameH = WINDOW.OPENING_HEIGHT + WINDOW.FRAME_THICKNESS;
  const frameW = WINDOW.OPENING_WIDTH + WINDOW.FRAME_THICKNESS * 2;

  return (
    <>
      {/* 左枠 */}
      <mesh position={[-halfW, cy, z]} material={material}>
        <boxGeometry args={[WINDOW.FRAME_THICKNESS, frameH, WINDOW.FRAME_DEPTH]} />
      </mesh>
      {/* 右枠 */}
      <mesh position={[halfW, cy, z]} material={material}>
        <boxGeometry args={[WINDOW.FRAME_THICKNESS, frameH, WINDOW.FRAME_DEPTH]} />
      </mesh>
      {/* 上枠 */}
      <mesh position={[0, cy + WINDOW.OPENING_HEIGHT / 2 + WINDOW.FRAME_THICKNESS / 2, z]} material={material}>
        <boxGeometry args={[frameW, WINDOW.FRAME_THICKNESS, WINDOW.FRAME_DEPTH]} />
      </mesh>
      {/* 窓台 (sill) */}
      <mesh position={WINDOW_SILL.POSITION as unknown as [number, number, number]} material={material}>
        <boxGeometry args={[...WINDOW_SILL.SIZE]} />
      </mesh>
      {/* 縦桟 */}
      <mesh position={[0, cy, z + 0.02]} material={material}>
        <boxGeometry args={[WINDOW.MUNTIN_THICKNESS, WINDOW.OPENING_HEIGHT, WINDOW.MUNTIN_DEPTH]} />
      </mesh>
      {/* 横桟 */}
      <mesh position={[0, cy, z + 0.02]} material={material}>
        <boxGeometry args={[WINDOW.OPENING_WIDTH, WINDOW.MUNTIN_THICKNESS, WINDOW.MUNTIN_DEPTH]} />
      </mesh>
    </>
  );
}

// --- 壁 ---
function Walls() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: WALL.COLOR,
    roughness: WALL.ROUGHNESS,
    metalness: WALL.METALNESS,
  }), []);

  const z = WINDOW.CENTER_Z;
  const cy = WINDOW.CENTER_Y;
  const windowHalfW = WINDOW.OPENING_WIDTH / 2 + WINDOW.FRAME_THICKNESS;
  const wallW = 2.0;

  return (
    <>
      {/* 左壁 */}
      <mesh position={[-(windowHalfW + wallW / 2), cy, z]} material={material}>
        <boxGeometry args={[wallW, 5.0, WALL.THICKNESS]} />
      </mesh>
      {/* 右壁 */}
      <mesh position={[(windowHalfW + wallW / 2), cy, z]} material={material}>
        <boxGeometry args={[wallW, 5.0, WALL.THICKNESS]} />
      </mesh>
      {/* 上壁 */}
      <mesh position={[0, cy + WINDOW.OPENING_HEIGHT / 2 + WINDOW.FRAME_THICKNESS + 1.0, z]} material={material}>
        <boxGeometry args={[7.0, 2.0, WALL.THICKNESS]} />
      </mesh>
      {/* 下壁 */}
      <mesh position={[0, -1.1, z]} material={material}>
        <boxGeometry args={[7.0, 0.5, WALL.THICKNESS]} />
      </mesh>
    </>
  );
}

// --- 夜空背景面 ---
function NightSky() {
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: NIGHT_SKY.COLOR,
  }), []);

  return (
    <mesh position={NIGHT_SKY.POSITION as unknown as [number, number, number]} material={material}>
      <planeGeometry args={[...NIGHT_SKY.SIZE]} />
    </mesh>
  );
}

// --- 月 + グロー ---
function MoonWithGlow() {
  const moonMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: MOON.COLOR,
  }), []);

  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: MOON.COLOR,
    transparent: true,
    opacity: MOON.GLOW_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  const pos = MOON.POSITION as unknown as [number, number, number];

  return (
    <>
      <mesh position={pos} material={moonMaterial}>
        <sphereGeometry args={[MOON.RADIUS, MOON.SEGMENTS, MOON.SEGMENTS]} />
      </mesh>
      <mesh position={[pos[0], pos[1], pos[2] + 0.1]} material={glowMaterial}>
        <planeGeometry args={[MOON.GLOW_SIZE, MOON.GLOW_SIZE]} />
      </mesh>
    </>
  );
}

// --- 街灯ボケ光 (InstancedMesh) ---
function CityBokeh() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(CITY_BOKEH.SIZE, CITY_BOKEH.SIZE),
    [],
  );

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  // ボケ光の位置・色・サイズをuseMemoで1回だけ生成
  const bokehData = useMemo(() => {
    const data: { x: number; y: number; z: number; color: string; scale: number }[] = [];
    const [xMin, xMax] = CITY_BOKEH.X_RANGE;
    const [yMin, yMax] = CITY_BOKEH.Y_RANGE;
    const [zMin, zMax] = CITY_BOKEH.Z_RANGE;
    const [opMin, opMax] = CITY_BOKEH.OPACITY_RANGE;

    for (let i = 0; i < CITY_BOKEH.COUNT; i++) {
      const x = xMin + Math.random() * (xMax - xMin);
      // 下半分（地平線付近）に集中させる
      const y = yMin + Math.random() * Math.random() * (yMax - yMin);
      const z = zMin + Math.random() * (zMax - zMin);

      // 色の重み付き選択
      const r = Math.random();
      let color: string;
      if (r < CITY_BOKEH.COLOR_WEIGHTS[0]) {
        color = CITY_BOKEH.COLORS[0]; // 暖色
      } else if (r < CITY_BOKEH.COLOR_WEIGHTS[0] + CITY_BOKEH.COLOR_WEIGHTS[1]) {
        color = CITY_BOKEH.COLORS[1]; // オレンジ
      } else {
        color = CITY_BOKEH.COLORS[2]; // 青白
      }

      // opacityをスケールで表現（MeshBasicMaterialは全インスタンス共通opacityなので、
      // スケールの大小で明るさの差を出す）
      const scale = 0.5 + Math.random() * 1.5;

      data.push({ x, y, z, color, scale });
    }
    return data;
  }, []);

  // InstancedMeshの初期化
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < CITY_BOKEH.COUNT; i++) {
      const d = bokehData[i];
      tempMatrix.makeScale(d.scale, d.scale, d.scale);
      tempMatrix.setPosition(d.x, d.y, d.z);
      mesh.setMatrixAt(i, tempMatrix);

      tempColor.set(d.color);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bokehData]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, CITY_BOKEH.COUNT]}
      frustumCulled={false}
    />
  );
}
