import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

interface StarBottleProps {
  showCork?: boolean;
}

/**
 * ボトルのプロファイル（輪郭）を生成
 * LatheGeometryで回転させるためのVector2配列を返す
 */
function createBottleProfile(): THREE.Vector2[] {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;

  const shoulderTop = profile.BOTTOM_CURVE + profile.BODY_HEIGHT + profile.SHOULDER_HEIGHT;
  const neckTop = shoulderTop + profile.NECK_HEIGHT;

  const keyPoints: Array<{ y: number; r: number }> = [
    { y: 0.0, r: 0.0 },
    { y: 0.03, r: profile.BODY_RADIUS * 0.4 },
    { y: 0.08, r: profile.BODY_RADIUS * 0.7 },
    { y: profile.BOTTOM_CURVE, r: profile.BODY_RADIUS * 0.92 },
    { y: profile.BOTTOM_CURVE + 0.05, r: profile.BODY_RADIUS },
    { y: profile.BOTTOM_CURVE + profile.BODY_HEIGHT * 0.1, r: profile.BODY_RADIUS },
    { y: profile.BOTTOM_CURVE + profile.BODY_HEIGHT, r: profile.BODY_RADIUS },
    { y: shoulderTop, r: profile.NECK_RADIUS },
    { y: neckTop, r: profile.NECK_RADIUS },
  ];

  const curve3Points = keyPoints.map(p => new THREE.Vector3(p.r, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(curve3Points, false, 'catmullrom', 0.5);
  const points = curve.getPoints(profile.PROFILE_SEGMENTS);

  return points.map(p => new THREE.Vector2(p.x, p.y));
}

function getBottleBodyHeight(): number {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  return profile.BOTTOM_CURVE + profile.BODY_HEIGHT + profile.SHOULDER_HEIGHT + profile.NECK_HEIGHT;
}

function getBottleHeight(): number {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  return getBottleBodyHeight() + profile.RIM_HEIGHT;
}

function createRimProfile(): THREE.Vector2[] {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  return [
    new THREE.Vector2(profile.NECK_RADIUS, 0),
    new THREE.Vector2(profile.RIM_OUTER_RADIUS, 0),
    new THREE.Vector2(profile.RIM_OUTER_RADIUS, profile.RIM_HEIGHT),
    new THREE.Vector2(profile.RIM_INNER_RADIUS, profile.RIM_HEIGHT),
  ];
}

const LATHE_SEGMENTS = STAR_STACK_CONFIG.MOBILE.LATHE_SEGMENTS;

export function StarBottle({ showCork = true }: StarBottleProps) {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  const yOffset = STAR_STACK_CONFIG.BOTTLE.Y_OFFSET;

  const corkRef = useRef<THREE.Mesh>(null);
  const corkAnimState = useRef({ opacity: 1, yOffset: 0, targetOpacity: 1, targetYOffset: 0 });

  // コルク: シンプルなmeshStandardMaterial（Canvas texture不使用）
  const corkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xd4b896,
    roughness: 0.95,
    metalness: 0.0,
    depthWrite: true,
  }), []);

  // Cork animation
  useFrame((_, delta) => {
    if (!corkRef.current) return;

    const state = corkAnimState.current;
    state.targetOpacity = showCork ? 1 : 0;
    state.targetYOffset = showCork ? 0 : 0.8;

    const speed = 3;
    state.opacity += (state.targetOpacity - state.opacity) * speed * delta;
    state.yOffset += (state.targetYOffset - state.yOffset) * speed * delta;

    corkRef.current.position.y = corkY + state.yOffset;

    const isFullyOpaque = state.opacity > 0.99;
    corkMaterial.opacity = state.opacity;
    corkMaterial.transparent = !isFullyOpaque;
    corkMaterial.needsUpdate = true;

    corkRef.current.visible = state.opacity > 0.01;
  });

  const bottleGeometry = useMemo(() => {
    const profilePoints = createBottleProfile();
    return new THREE.LatheGeometry(profilePoints, LATHE_SEGMENTS, 0, Math.PI * 2);
  }, []);

  const rimGeometry = useMemo(() => {
    const rimPoints = createRimProfile();
    return new THREE.LatheGeometry(rimPoints, LATHE_SEGMENTS, 0, Math.PI * 2);
  }, []);

  const bottleBodyHeight = getBottleBodyHeight();
  const bottleHeight = getBottleHeight();
  const corkRadius = profile.CORK_RADIUS;
  const corkHeight = profile.CORK_HEIGHT;
  const corkInsert = profile.CORK_INSERT;
  const corkY = bottleHeight - corkInsert + corkHeight / 2 - profile.RIM_HEIGHT;

  return (
    <group position={[0, yOffset, 0]}>
      {/* ボトル背面（ガラスの主要な色味） */}
      <mesh geometry={bottleGeometry} renderOrder={0}>
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#c8d8e0"
          transparent
          opacity={0.45}
          depthWrite={true}
          roughness={0.05}
          metalness={0.15}
        />
      </mesh>

      {/* ボトル前面（ハイライト・透明感） */}
      <mesh geometry={bottleGeometry} renderOrder={1}>
        <meshStandardMaterial
          side={THREE.FrontSide}
          transparent
          opacity={0.25}
          color="#e8f4ff"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          roughness={0.02}
          metalness={0.3}
        />
      </mesh>

      {/* 口リム */}
      <mesh geometry={rimGeometry} position={[0, bottleBodyHeight, 0]} renderOrder={0}>
        <meshStandardMaterial
          side={THREE.DoubleSide}
          color="#8b9aa3"
          transparent
          opacity={0.6}
          depthWrite={true}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* コルク栓 */}
      <mesh ref={corkRef} position={[0, corkY, 0]} renderOrder={2} material={corkMaterial}>
        <cylinderGeometry args={[corkRadius * 1.0, corkRadius * 1.15, corkHeight, 24, 3]} />
      </mesh>
    </group>
  );
}
