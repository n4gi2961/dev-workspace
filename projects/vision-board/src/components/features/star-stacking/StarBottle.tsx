'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMatcapTexture } from '@react-three/drei';
import * as THREE from 'three';
import { STAR_STACK_CONFIG } from '@/constants/starStack';

interface StarBottleProps {
  showCork?: boolean;
}

/**
 * ボトルのプロファイル（輪郭）を生成
 * LatheGeometryで回転させるためのVector2配列を返す
 */
function createBottleProfile(): THREE.Vector2[] {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;

  // 各セクションの終点
  const shoulderTop = profile.BOTTOM_CURVE + profile.BODY_HEIGHT + profile.SHOULDER_HEIGHT;
  const neckTop = shoulderTop + profile.NECK_HEIGHT;

  // キーポイントを定義（下から上へ）
  const keyPoints: Array<{ y: number; r: number }> = [
    // 底の中心
    { y: 0.0, r: 0.0 },
    // 底の丸み
    { y: 0.03, r: profile.BODY_RADIUS * 0.4 },
    { y: 0.08, r: profile.BODY_RADIUS * 0.7 },
    { y: profile.BOTTOM_CURVE, r: profile.BODY_RADIUS * 0.92 },
    { y: profile.BOTTOM_CURVE + 0.05, r: profile.BODY_RADIUS },
    // 本体（ストレート部分）
    { y: profile.BOTTOM_CURVE + profile.BODY_HEIGHT * 0.1, r: profile.BODY_RADIUS },
    { y: profile.BOTTOM_CURVE + profile.BODY_HEIGHT, r: profile.BODY_RADIUS },
    // 肩のカーブ（短いので1点のみで滑らかに遷移）
    { y: shoulderTop, r: profile.NECK_RADIUS },
    // ネック（円柱）- 口リムは別メッシュで作成するためここで終了
    { y: neckTop, r: profile.NECK_RADIUS },
  ];

  // CatmullRomCurve3でスムーズ化
  const curve3Points = keyPoints.map(p => new THREE.Vector3(p.r, p.y, 0));
  const curve = new THREE.CatmullRomCurve3(curve3Points, false, 'catmullrom', 0.5);

  // 補間ポイントを取得
  const points = curve.getPoints(profile.PROFILE_SEGMENTS);

  // Vector2に変換（x=半径, y=高さ）
  return points.map(p => new THREE.Vector2(p.x, p.y));
}

/**
 * ボトル本体の高さを計算（口リムを除く）
 */
function getBottleBodyHeight(): number {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  return profile.BOTTOM_CURVE + profile.BODY_HEIGHT + profile.SHOULDER_HEIGHT + profile.NECK_HEIGHT;
}

/**
 * ボトルの全高を計算（口リム含む）
 */
function getBottleHeight(): number {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  return getBottleBodyHeight() + profile.RIM_HEIGHT;
}

/**
 * 口リムのプロファイル（輪郭）を生成
 * LatheGeometryで回転させるためのVector2配列を返す
 */
function createRimProfile(): THREE.Vector2[] {
  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;

  // 口リムの断面（下から時計回り）
  // ネック接続部 → 外側下 → 外側上 → 内側上
  const points: THREE.Vector2[] = [
    new THREE.Vector2(profile.NECK_RADIUS, 0),           // ネック上端（内側）
    new THREE.Vector2(profile.RIM_OUTER_RADIUS, 0),      // 外側下
    new THREE.Vector2(profile.RIM_OUTER_RADIUS, profile.RIM_HEIGHT),  // 外側上
    new THREE.Vector2(profile.RIM_INNER_RADIUS, profile.RIM_HEIGHT),  // 内側上（コルクが入る穴）
  ];

  return points;
}

/**
 * コルクの粒状パターンをCanvasに描画する共通関数
 */
function drawCorkPattern(ctx: CanvasRenderingContext2D, size: number): void {
  // ベース色（明るいサンド/タン色）
  ctx.fillStyle = '#d4b896';
  ctx.fillRect(0, 0, size, size);

  // 粒状パターンを追加（密度を上げて均一に）
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const particleSize = Math.random() * 3 + 1;
    const brightness = Math.random() * 50 - 25;
    const r = Math.min(255, Math.max(0, 212 + brightness));
    const g = Math.min(255, Math.max(0, 184 + brightness));
    const b = Math.min(255, Math.max(0, 150 + brightness));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(x, y, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 小さな穴（コルクの多孔質な見た目）
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const holeSize = Math.random() * 2 + 0.5;
    ctx.fillStyle = 'rgba(139, 115, 85, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, holeSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * コルク側面用テクスチャを生成（横方向に繰り返し）
 * cylinderGeometryのグループ0（側面）用
 */
function createCorkSideTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  drawCorkPattern(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // 側面のUVは横方向が円周、縦方向が高さ
  // 正方形に近づけるため、横方向を多く繰り返す
  texture.repeat.set(4, 1);
  return texture;
}

/**
 * コルク上面/底面用テクスチャを生成（均一な繰り返し）
 * cylinderGeometryのグループ1（上面）、グループ2（底面）用
 */
function createCorkCapTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  drawCorkPattern(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // 上面/底面は均一な繰り返しで引き伸ばしを防ぐ
  texture.repeat.set(2, 2);
  return texture;
}

export function StarBottle({ showCork = true }: StarBottleProps) {
  const [glassMatcap] = useMatcapTexture('C7C0AC_2E181B_543B30_6B6270', 256);

  const profile = STAR_STACK_CONFIG.BOTTLE_PROFILE;
  const yOffset = STAR_STACK_CONFIG.BOTTLE.Y_OFFSET;

  // Cork animation state
  const corkRef = useRef<THREE.Mesh>(null);
  const corkAnimState = useRef({ opacity: 1, yOffset: 0, targetOpacity: 1, targetYOffset: 0 });

  // Cork textures（側面用と上面/底面用を分離）
  const corkSideTexture = useMemo(() => createCorkSideTexture(), []);
  const corkCapTexture = useMemo(() => createCorkCapTexture(), []);

  // Cork materials配列（cylinderGeometryは3つのマテリアルグループを持つ）
  // グループ0: 側面、グループ1: 上面、グループ2: 底面
  const corkMaterials = useMemo(() => [
    // 側面用マテリアル
    new THREE.MeshStandardMaterial({
      map: corkSideTexture,
      color: 0xd4b896,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: true,
    }),
    // 上面用マテリアル
    new THREE.MeshStandardMaterial({
      map: corkCapTexture,
      color: 0xd4b896,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: true,
    }),
    // 底面用マテリアル
    new THREE.MeshStandardMaterial({
      map: corkCapTexture,
      color: 0xd4b896,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: true,
    }),
  ], [corkSideTexture, corkCapTexture]);

  // Animate cork
  useFrame((_, delta) => {
    if (!corkRef.current) return;

    const state = corkAnimState.current;
    state.targetOpacity = showCork ? 1 : 0;
    state.targetYOffset = showCork ? 0 : 0.8; // Move up when hiding

    // Smooth interpolation
    const speed = 3;
    state.opacity += (state.targetOpacity - state.opacity) * speed * delta;
    state.yOffset += (state.targetYOffset - state.yOffset) * speed * delta;

    // Apply to mesh
    corkRef.current.position.y = corkY + state.yOffset;

    // opacityが1に近いときはtransparentをfalseに
    // これにより口リム（透明オブジェクト）越しのdepth sorting問題を回避
    const isFullyOpaque = state.opacity > 0.99;

    corkMaterials.forEach(mat => {
      mat.opacity = state.opacity;
      mat.transparent = !isFullyOpaque; // 完全不透明時はfalseに
      mat.needsUpdate = true;
    });

    corkRef.current.visible = state.opacity > 0.01;
  });

  // ボトル本体のジオメトリをメモ化
  const bottleGeometry = useMemo(() => {
    const profilePoints = createBottleProfile();
    return new THREE.LatheGeometry(
      profilePoints,
      profile.LATHE_SEGMENTS,
      0,
      Math.PI * 2
    );
  }, [profile.LATHE_SEGMENTS]);

  // 口リムのジオメトリをメモ化（別メッシュとして作成）
  const rimGeometry = useMemo(() => {
    const rimPoints = createRimProfile();
    return new THREE.LatheGeometry(
      rimPoints,
      profile.LATHE_SEGMENTS,
      0,
      Math.PI * 2
    );
  }, [profile.LATHE_SEGMENTS]);

  // 口リムの位置（ネック上端）
  const bottleBodyHeight = getBottleBodyHeight();

  // コルクの位置と寸法
  const bottleHeight = getBottleHeight();
  const corkRadius = profile.CORK_RADIUS;
  const corkHeight = profile.CORK_HEIGHT;
  const corkInsert = profile.CORK_INSERT;
  // コルクの中心Y位置（下部が口リムに埋まる）
  const corkY = bottleHeight - corkInsert + corkHeight / 2 - profile.RIM_HEIGHT;

  return (
    <group position={[0, yOffset, 0]}>
      {/* ボトル背面（先に描画） */}
      <mesh geometry={bottleGeometry} renderOrder={0}>
        <meshMatcapMaterial
          matcap={glassMatcap}
          side={THREE.BackSide}
          color="#8b9aa3"
          transparent
          opacity={0.5}
          depthWrite={true}
        />
      </mesh>

      {/* ボトル前面（後に描画、透明感を出す） */}
      <mesh geometry={bottleGeometry} renderOrder={1}>
        <meshMatcapMaterial
          matcap={glassMatcap}
          side={THREE.FrontSide}
          transparent
          opacity={0.35}
          color="#ffffff"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 口リム（別メッシュ、スムーズ化の影響を受けない） */}
      <mesh geometry={rimGeometry} position={[0, bottleBodyHeight, 0]} renderOrder={0}>
        <meshMatcapMaterial
          matcap={glassMatcap}
          side={THREE.DoubleSide}
          color="#8b9aa3"
          transparent
          opacity={0.6}
          depthWrite={true}
        />
      </mesh>

      {/* コルク栓（アニメーション付き、複数マテリアル対応） */}
      <mesh ref={corkRef} position={[0, corkY, 0]} renderOrder={2} material={corkMaterials}>
        <cylinderGeometry args={[corkRadius * 1.15, corkRadius, corkHeight, 24]} />
      </mesh>
    </group>
  );
}
