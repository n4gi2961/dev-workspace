import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';
import type { TouchData } from './StarStackScene';

const CONTROLS = STAR_STACK_CONFIG.ORBIT_CONTROLS;

const spherical = new THREE.Spherical();
const target = new THREE.Vector3(0, 0.5, 0); // ボトル中心を見る

// 慣性パラメータ
const INERTIA_DAMPING = 0.92; // 減衰率（1に近いほど長く滑る）
const INERTIA_THRESHOLD = 0.0001; // これ以下で停止

interface TouchCameraControlsProps {
  touchRef: React.RefObject<TouchData>;
}

/**
 * OrbitControls代替 — 外部Viewのタッチイベントでカメラ操作
 * R3F nativeではgl.domElementが存在しないため、
 * StarStackScene側のViewでタッチを受け取りrefで共有する
 */
export function TouchCameraControls({ touchRef }: TouchCameraControlsProps) {
  const { camera } = useThree();
  const initialized = useRef(false);
  const lastProcessed = useRef(0);
  // 慣性用: 回転の角速度
  const velocityTheta = useRef(0);
  const velocityPhi = useRef(0);

  useFrame(() => {
    if (!touchRef.current) return;

    // 初期化: カメラ位置から球面座標を設定
    if (!initialized.current) {
      const pos = STAR_STACK_CONFIG.CAMERA.POSITION;
      camera.position.set(pos[0], pos[1], pos[2]);
      spherical.setFromVector3(
        new THREE.Vector3().subVectors(camera.position, target)
      );
      camera.lookAt(target);
      initialized.current = true;
    }

    const touch = touchRef.current;
    let needsUpdate = false;

    // 新しいタッチイベントがあれば処理
    if (touch.seq !== lastProcessed.current) {
      lastProcessed.current = touch.seq;

      if (touch.type === 'rotate') {
        const dTheta = -touch.dx * 0.005;
        const dPhi = touch.dy * 0.005;
        spherical.theta = Math.max(
          CONTROLS.MIN_AZIMUTH_ANGLE,
          Math.min(CONTROLS.MAX_AZIMUTH_ANGLE, spherical.theta + dTheta)
        );
        spherical.phi = Math.max(
          CONTROLS.MIN_POLAR_ANGLE,
          Math.min(CONTROLS.MAX_POLAR_ANGLE, spherical.phi + dPhi)
        );
        // 慣性用に角速度を記録
        velocityTheta.current = dTheta;
        velocityPhi.current = dPhi;
        needsUpdate = true;
      } else if (touch.type === 'zoom') {
        spherical.radius = Math.max(
          CONTROLS.MIN_DISTANCE,
          Math.min(CONTROLS.MAX_DISTANCE, spherical.radius * touch.scale)
        );
        needsUpdate = true;
      } else if (touch.type === 'idle') {
        // 指を離した — 慣性はvelocityに残っているので何もしない
      }
    } else {
      // タッチイベントなし → 慣性を適用
      if (Math.abs(velocityTheta.current) > INERTIA_THRESHOLD ||
          Math.abs(velocityPhi.current) > INERTIA_THRESHOLD) {
        velocityTheta.current *= INERTIA_DAMPING;
        velocityPhi.current *= INERTIA_DAMPING;

        spherical.theta = Math.max(
          CONTROLS.MIN_AZIMUTH_ANGLE,
          Math.min(CONTROLS.MAX_AZIMUTH_ANGLE, spherical.theta + velocityTheta.current)
        );
        spherical.phi = Math.max(
          CONTROLS.MIN_POLAR_ANGLE,
          Math.min(CONTROLS.MAX_POLAR_ANGLE, spherical.phi + velocityPhi.current)
        );
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      camera.position.setFromSpherical(spherical).add(target);
      camera.lookAt(target);
    }
  });

  return null;
}
