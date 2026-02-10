import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';

// --- Config ---

const HEAD_SIZE = 12;
const TRAIL_COUNT = 10;
const TRAIL_STEP = 0.015; // progress offset between each trail dot
const TRAIL_INDICES = Array.from({ length: TRAIL_COUNT }, (_, i) => i);

// --- Trail Dot ---

interface TrailDotProps {
  index: number;
  meteorProgress: SharedValue<number>;
  meteorActive: SharedValue<number>;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const TrailDot = React.memo(function TrailDot({
  index,
  meteorProgress,
  meteorActive,
  color,
  startX,
  startY,
  endX,
  endY,
}: TrailDotProps) {
  const offset = (index + 1) * TRAIL_STEP;
  const opacityFactor = 1 - (index + 1) / (TRAIL_COUNT + 1);
  const sizeFactor = Math.max(0.3, 1 - (index + 0.5) / TRAIL_COUNT);
  const size = HEAD_SIZE * sizeFactor;

  const style = useAnimatedStyle(() => {
    const p = meteorProgress.value;
    const active = meteorActive.value;
    const trailP = p - offset;

    if (active === 0 || trailP < 0) return { opacity: 0 };

    const x = startX + (endX - startX) * trailP;
    const y = startY + (endY - startY) * trailP;
    const fadeOut = p < 0.8 ? 1 : interpolate(p, [0.8, 1], [1, 0]);

    return {
      opacity: opacityFactor * fadeOut * active,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

// --- Main Component ---

interface MeteorEffectProps {
  meteorProgress: SharedValue<number>;
  meteorActive: SharedValue<number>;
  meteorColor: string;
  meteorStartOffset: number;
  screenWidth: number;
  screenHeight: number;
}

export const MeteorEffect = React.memo(function MeteorEffect({
  meteorProgress,
  meteorActive,
  meteorColor,
  meteorStartOffset,
  screenWidth,
  screenHeight,
}: MeteorEffectProps) {
  const color = meteorColor;

  // 軌道の始点・終点を計算
  const startX = screenWidth * (-0.1 + meteorStartOffset / 100);
  const startY = screenHeight * (-0.1 + meteorStartOffset / 100);
  const endX = screenWidth * 1.1;
  const endY = screenHeight * 1.1;

  // ヘッドの位置
  const headStyle = useAnimatedStyle(() => {
    const p = meteorProgress.value;
    const active = meteorActive.value;
    if (active === 0) return { opacity: 0 };

    const x = startX + (endX - startX) * p;
    const y = startY + (endY - startY) * p;
    const opacity = active * (p < 0.8 ? 1 : interpolate(p, [0.8, 1], [1, 0]));

    return {
      opacity,
      transform: [
        { translateX: x - HEAD_SIZE / 2 },
        { translateY: y - HEAD_SIZE / 2 },
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 軌跡ドット（ヘッドの後ろに自然に残る） */}
      {TRAIL_INDICES.map((i) => (
        <TrailDot
          key={i}
          index={i}
          meteorProgress={meteorProgress}
          meteorActive={meteorActive}
          color={color}
          startX={startX}
          startY={startY}
          endX={endX}
          endY={endY}
        />
      ))}

      {/* 流星ヘッド（3層グロー） */}
      <Animated.View style={[styles.headContainer, headStyle]}>
        {/* 外側グロー（大きなブルーム） */}
        <View
          style={[
            styles.headOuterGlow,
            {
              backgroundColor: `${color}25`,
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 30,
                  }
                : { elevation: 15 }),
            },
          ]}
        />
        {/* 中間グロー */}
        <View
          style={[
            styles.headMiddleGlow,
            {
              backgroundColor: `${color}80`,
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 15,
                  }
                : { elevation: 10 }),
            },
          ]}
        />
        {/* 内側コア（最も明るい白） */}
        <View
          style={[
            styles.headCore,
            {
              backgroundColor: 'white',
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 10,
                  }
                : { elevation: 5 }),
            },
          ]}
        />
      </Animated.View>
    </View>
  );
});

// --- Styles ---

const styles = StyleSheet.create({
  headContainer: {
    position: 'absolute',
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    overflow: 'visible',
  },
  headOuterGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    left: (HEAD_SIZE - 40) / 2,
    top: (HEAD_SIZE - 40) / 2,
  },
  headMiddleGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    left: (HEAD_SIZE - 20) / 2,
    top: (HEAD_SIZE - 20) / 2,
  },
  headCore: {
    position: 'absolute',
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    left: 0,
    top: 0,
  },
});
