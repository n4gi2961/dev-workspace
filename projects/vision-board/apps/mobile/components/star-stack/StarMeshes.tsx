import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { createStarGeometry } from './starGeometry';
import { SimplePhysics } from './SimplePhysics';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';

interface StarMeshesProps {
  physicsRef: React.MutableRefObject<SimplePhysics>;
  colors: string[];
  meteorFlags: boolean[];
}

const MAX_STARS = STAR_STACK_CONFIG.MOBILE.MAX_STARS;
const tempMatrix = new THREE.Matrix4();
const tempEuler = new THREE.Euler();
const tempColor = new THREE.Color();
const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * 通常星 + meteor星の2つのInstancedMeshで描画
 * meteor星は自発光マテリアルで目立つ
 */
export function StarMeshes({ physicsRef, colors, meteorFlags }: StarMeshesProps) {
  const normalMeshRef = useRef<THREE.InstancedMesh>(null);
  const meteorMeshRef = useRef<THREE.InstancedMesh>(null);
  const lastColorCount = useRef(0);

  const geometry = useMemo(() => createStarGeometry(), []);

  const normalMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.5,
  }), []);

  const meteorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    metalness: 0.7,
    roughness: 0.2,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.4,
  }), []);

  // 初回マウント時に全インスタンスを不可視に
  useEffect(() => {
    for (const meshRef of [normalMeshRef, meteorMeshRef]) {
      if (!meshRef.current) continue;
      for (let i = 0; i < MAX_STARS; i++) {
        meshRef.current.setMatrixAt(i, zeroMatrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    const normalMesh = normalMeshRef.current;
    const meteorMesh = meteorMeshRef.current;
    const physics = physicsRef.current;
    if (!normalMesh || !meteorMesh || !physics) return;

    const count = physics.getCount();
    if (count === 0) return;

    // 物理ステップ（アクティブな星がある時だけ）
    const hasActive = physics.hasActiveStars ? physics.hasActiveStars() : true;
    if (hasActive) {
      const clampedDt = Math.min(delta, 1 / 30);
      physics.step(clampedDt);
    }

    // 通常星とmeteor星を振り分け
    let normalIdx = 0;
    let meteorIdx = 0;

    for (let i = 0; i < count; i++) {
      const [px, py, pz] = physics.getPosition(i);
      const [rx, ry, rz] = physics.getRotation(i);
      const isMeteor = meteorFlags[i] || false;

      tempEuler.set(rx, ry, rz);
      tempMatrix.makeRotationFromEuler(tempEuler);
      tempMatrix.setPosition(px, py, pz);

      if (isMeteor) {
        meteorMesh.setMatrixAt(meteorIdx, tempMatrix);
        meteorIdx++;
      } else {
        normalMesh.setMatrixAt(normalIdx, tempMatrix);
        normalIdx++;
      }
    }

    // 余りのインスタンスを非表示にする
    for (let i = normalIdx; i < normalMesh.count; i++) {
      normalMesh.setMatrixAt(i, zeroMatrix);
    }
    for (let i = meteorIdx; i < meteorMesh.count; i++) {
      meteorMesh.setMatrixAt(i, zeroMatrix);
    }

    normalMesh.count = normalIdx;
    meteorMesh.count = meteorIdx;
    normalMesh.instanceMatrix.needsUpdate = true;
    meteorMesh.instanceMatrix.needsUpdate = true;

    // 色の更新（新しい星が追加された時だけ再計算）
    const colorLen = colors.length;
    if (colorLen !== lastColorCount.current) {
      // 全色を再割り当て（振り分けが変わる可能性があるため）
      let nIdx = 0;
      let mIdx = 0;
      for (let i = 0; i < count; i++) {
        const isMeteor = meteorFlags[i] || false;
        tempColor.set(colors[i] || '#8b5cf6');

        if (isMeteor) {
          meteorMesh.setColorAt(mIdx, tempColor);
          // emissiveは星ごとではなくマテリアル全体に設定済み
          // 個別色をemissiveにも反映
          mIdx++;
        } else {
          normalMesh.setColorAt(nIdx, tempColor);
          nIdx++;
        }
      }
      if (normalMesh.instanceColor) normalMesh.instanceColor.needsUpdate = true;
      if (meteorMesh.instanceColor) meteorMesh.instanceColor.needsUpdate = true;
      lastColorCount.current = colorLen;
    }

    // meteor星のemissiveを星の色に動的更新
    // (MeshStandardMaterialのemissiveは全インスタンス共通なので、
    //  meteor星が複数色ある場合はblendで平均色にする or 最初の色を使用)
    if (meteorIdx > 0) {
      // 最初のmeteor星の色をemissiveに設定
      const firstMeteorI = meteorFlags.findIndex(f => f);
      if (firstMeteorI >= 0 && colors[firstMeteorI]) {
        tempColor.set(colors[firstMeteorI]);
        meteorMaterial.emissive.copy(tempColor);
      }
    }
  });

  return (
    <>
      <instancedMesh
        ref={normalMeshRef}
        args={[geometry, normalMaterial, MAX_STARS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={meteorMeshRef}
        args={[geometry, meteorMaterial, MAX_STARS]}
        frustumCulled={false}
      />
    </>
  );
}
