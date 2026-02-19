import { useRef } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { View, StyleSheet, PanResponder } from 'react-native';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';
import { StarBottle } from './StarBottle';
import { StarMeshes } from './StarMeshes';
import { TouchCameraControls } from './TouchCameraControls';
import { WindowScene } from './WindowScene';
import { ParallaxBackground } from './ParallaxBackground';
import { LIGHTING, LIGHTING_TEXTURED } from './sceneConstants';
import { SimplePhysics } from './SimplePhysics';
import { useSceneTextures } from '../../hooks/useSceneTextures';

export interface TouchData {
  type: 'rotate' | 'zoom' | 'idle';
  dx: number;
  dy: number;
  scale: number;
  seq: number;
}

interface StarStackSceneProps {
  physicsRef: React.MutableRefObject<SimplePhysics>;
  colors: string[];
  meteorFlags: boolean[];
  showCork: boolean;
}

const CAMERA = STAR_STACK_CONFIG.CAMERA;

export function StarStackScene({ physicsRef, colors, meteorFlags, showCork }: StarStackSceneProps) {
  const touchRef = useRef<TouchData>({ type: 'idle', dx: 0, dy: 0, scale: 1, seq: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0, pinchDist: 0, touching: 0 });
  const textures = useSceneTextures();
  const light = textures.loaded ? LIGHTING_TEXTURED : LIGHTING;

  // PanResponder: Responderシステムよりネイティブスレッドに近く、
  // GL Viewとの干渉が少ない。透明オーバーレイに配置してCanvas自体には触らない
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 親（モーダル）にジェスチャーを奪わせない
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        if (!touches || touches.length === 0) return;
        if (touches.length === 1) {
          lastTouchRef.current.x = touches[0].pageX;
          lastTouchRef.current.y = touches[0].pageY;
          lastTouchRef.current.touching = 1;
        } else if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          lastTouchRef.current.pinchDist = Math.sqrt(dx * dx + dy * dy);
          lastTouchRef.current.touching = 2;
        }
      },

      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;
        if (!touches || touches.length === 0) return;
        const last = lastTouchRef.current;

        if (last.touching === 1 && touches.length === 1) {
          const dx = touches[0].pageX - last.x;
          const dy = touches[0].pageY - last.y;
          last.x = touches[0].pageX;
          last.y = touches[0].pageY;
          touchRef.current = {
            type: 'rotate', dx, dy, scale: 1,
            seq: touchRef.current.seq + 1,
          };
        } else if (touches.length >= 2) {
          if (last.touching !== 2) {
            // 1→2本指遷移
            const ddx = touches[0].pageX - touches[1].pageX;
            const ddy = touches[0].pageY - touches[1].pageY;
            last.pinchDist = Math.sqrt(ddx * ddx + ddy * ddy);
            last.touching = 2;
            return;
          }
          const ddx = touches[0].pageX - touches[1].pageX;
          const ddy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (last.pinchDist > 0) {
            const scale = last.pinchDist / dist;
            touchRef.current = {
              type: 'zoom', dx: 0, dy: 0, scale,
              seq: touchRef.current.seq + 1,
            };
          }
          last.pinchDist = dist;
        }
      },

      onPanResponderRelease: () => {
        lastTouchRef.current.touching = 0;
        // idle通知で慣性モードへ移行
        touchRef.current = {
          type: 'idle', dx: 0, dy: 0, scale: 1,
          seq: touchRef.current.seq + 1,
        };
      },
      onPanResponderTerminate: () => {
        lastTouchRef.current.touching = 0;
        touchRef.current = {
          type: 'idle', dx: 0, dy: 0, scale: 1,
          seq: touchRef.current.seq + 1,
        };
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Canvas: タッチイベントなし、GL描画のみ */}
      <Canvas
        camera={{
          position: CAMERA.POSITION as [number, number, number],
          fov: CAMERA.FOV,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
        style={styles.canvas}
      >
        {/* ライティング（テクスチャ背景時はボトル特化） */}
        <ambientLight intensity={light.AMBIENT.intensity} color={light.AMBIENT.color} />
        <directionalLight
          position={light.MOONLIGHT.position as unknown as [number, number, number]}
          intensity={light.MOONLIGHT.intensity}
          color={light.MOONLIGHT.color}
        />
        <pointLight
          position={light.CITY_GLOW.position as unknown as [number, number, number]}
          intensity={light.CITY_GLOW.intensity}
          color={light.CITY_GLOW.color}
          distance={light.CITY_GLOW.distance}
          decay={light.CITY_GLOW.decay}
        />
        <pointLight
          position={light.RIM.position as unknown as [number, number, number]}
          intensity={light.RIM.intensity}
          color={light.RIM.color}
          distance={light.RIM.distance}
          decay={light.RIM.decay}
        />

        {/* 背景: テクスチャ読み込み完了→パラレックス背景、未完了→ジオメトリフォールバック */}
        {textures.loaded ? <ParallaxBackground textures={textures} /> : <WindowScene />}

        <StarBottle showCork={showCork} />
        <StarMeshes physicsRef={physicsRef} colors={colors} meteorFlags={meteorFlags} />
        <TouchCameraControls touchRef={touchRef} />
      </Canvas>

      {/* 透明オーバーレイ: タッチ専用。CanvasのGL Viewに影響を与えない */}
      <View
        style={styles.overlay}
        {...panResponder.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
