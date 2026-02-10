import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { RippleState } from '../../hooks/useFocusEffects';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RippleEffectProps {
  rippleState: RippleState;
  rippleRadius: SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
}

export const RippleEffect = React.memo(function RippleEffect({
  rippleState,
  rippleRadius,
  screenWidth,
  screenHeight,
}: RippleEffectProps) {
  const { originX, originY, color } = rippleState;
  const maxRadius = Math.sqrt(screenWidth ** 2 + screenHeight ** 2);

  // SVGリングのアニメーション
  const ringProps = useAnimatedProps(() => {
    return {
      r: rippleRadius.value,
      strokeOpacity: interpolate(
        rippleRadius.value,
        [0, maxRadius * 0.7, maxRadius],
        [0.8, 0.3, 0],
      ),
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width={screenWidth}
        height={screenHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <AnimatedCircle
          cx={originX}
          cy={originY}
          animatedProps={ringProps}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />
      </Svg>
    </View>
  );
});
