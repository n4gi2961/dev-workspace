import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
  useAnimatedStyle,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  size?: number;
  strokeWidth?: number;
  color?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const CircularTimer = React.memo(function CircularTimer({
  totalSeconds,
  remainingSeconds,
  status,
  size = 280,
  strokeWidth = 8,
  color = colors.accent.primary,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Progress animation
  const progress = useSharedValue(0);

  useEffect(() => {
    if (totalSeconds <= 0) {
      progress.value = 0;
      return;
    }
    const target = 1 - remainingSeconds / totalSeconds;
    progress.value = withTiming(target, {
      duration: status === 'running' ? 900 : 300,
      easing: Easing.linear,
    });
  }, [remainingSeconds, totalSeconds, status, progress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Blink animation for paused state
  const blinkOpacity = useSharedValue(1);

  useEffect(() => {
    if (status === 'paused') {
      blinkOpacity.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(blinkOpacity);
      blinkOpacity.value = 1;
    }
  }, [status, blinkOpacity]);

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: blinkOpacity.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Time display */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
          },
          blinkStyle,
        ]}
      >
        <Text
          style={{
            fontSize: 56,
            fontWeight: '200',
            color: colors.text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatTime(remainingSeconds)}
        </Text>
      </Animated.View>
    </View>
  );
});
