import { useState, useCallback, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// --- Types ---

export interface RippleState {
  originX: number;
  originY: number;
  color: string;
}

// --- Hook (animations only — clearPercent is managed by the screen) ---

export function useFocusEffects(
  screenWidth: number,
  screenHeight: number,
) {
  // --- Ripple (SVG ring only) ---
  const rippleRadius = useSharedValue(0);
  const [rippleState, setRippleState] = useState<RippleState | null>(null);

  const clearRipple = useCallback(() => {
    setRippleState(null);
  }, []);

  const triggerRipple = useCallback(
    (touchX: number, touchY: number, color: string) => {
      setRippleState({ originX: touchX, originY: touchY, color });

      const maxR = Math.sqrt(screenWidth ** 2 + screenHeight ** 2);
      rippleRadius.value = 0;
      rippleRadius.value = withTiming(
        maxR,
        { duration: 600, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(clearRipple)();
        },
      );
    },
    [screenWidth, screenHeight, rippleRadius, clearRipple],
  );

  // --- Meteor ---
  const meteorProgress = useSharedValue(0);
  const meteorActive = useSharedValue(0);
  const [meteorColor, setMeteorColor] = useState('#fbbf24');
  const meteorStartOffset = useRef(0);

  const triggerMeteor = useCallback(
    (color: string) => {
      setMeteorColor(color);
      meteorStartOffset.current = Math.random() * 20 - 10;
      meteorProgress.value = 0;
      meteorActive.value = 1;
      meteorProgress.value = withTiming(
        1,
        { duration: 1000, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            meteorActive.value = 0;
          }
        },
      );

      // 強化ハプティクス: ~1800ms（リップル600msの3倍）— 減衰パターン
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 650);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 950);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 1250);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 1550);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 1800);
    },
    [meteorProgress, meteorActive],
  );

  return {
    // Ripple
    rippleRadius,
    rippleState,
    triggerRipple,

    // Meteor
    meteorProgress,
    meteorActive,
    meteorColor,
    meteorStartOffset: meteorStartOffset.current,
    triggerMeteor,
  };
}
