'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Pop animation configuration options
 * React Native compatible - uses requestAnimationFrame for web,
 * can be adapted to Reanimated for React Native
 */
export interface PopAnimationOptions {
  /** Total animation duration in ms (default: 400) */
  duration?: number;
  /** Maximum scale factor (default: 1.4) */
  scaleMax?: number;
  /** Maximum rotation in degrees (default: 10) */
  rotationMax?: number;
}

export interface PopAnimationStyle {
  transform: string;
  opacity: number;
}

export interface PopAnimationReturn {
  /** Whether animation is currently playing */
  isAnimating: boolean;
  /** Current animation style to apply */
  style: PopAnimationStyle;
  /** Trigger the animation */
  trigger: () => void;
}

// Keyframe definitions for the pop animation
// Format: [time (0-1), scale, rotation, opacity]
const KEYFRAMES: [number, number, number, number][] = [
  [0.0, 1.0, 0, 1.0],      // Start
  [0.2, 1.4, -10, 0.9],    // Pop up + rotate left
  [0.4, 0.9, 10, 1.0],     // Squish + rotate right
  [0.6, 1.15, -5, 1.0],    // Bounce back
  [0.8, 0.95, 3, 1.0],     // Small squish
  [1.0, 1.0, 0, 1.0],      // End
];

/**
 * Interpolate between keyframes
 */
function interpolate(progress: number, keyframes: typeof KEYFRAMES): { scale: number; rotation: number; opacity: number } {
  // Find the two keyframes to interpolate between
  let prevFrame = keyframes[0];
  let nextFrame = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (progress >= keyframes[i][0] && progress <= keyframes[i + 1][0]) {
      prevFrame = keyframes[i];
      nextFrame = keyframes[i + 1];
      break;
    }
  }

  // Calculate local progress between the two keyframes
  const segmentDuration = nextFrame[0] - prevFrame[0];
  const localProgress = segmentDuration > 0
    ? (progress - prevFrame[0]) / segmentDuration
    : 0;

  // Ease-out interpolation
  const eased = 1 - Math.pow(1 - localProgress, 3);

  return {
    scale: prevFrame[1] + (nextFrame[1] - prevFrame[1]) * eased,
    rotation: prevFrame[2] + (nextFrame[2] - prevFrame[2]) * eased,
    opacity: prevFrame[3] + (nextFrame[3] - prevFrame[3]) * eased,
  };
}

/**
 * Custom hook for pop animation effect
 * Designed for React Native compatibility - uses requestAnimationFrame
 * which can be replaced with Reanimated's useFrameCallback
 */
export function usePopAnimation(options: PopAnimationOptions = {}): PopAnimationReturn {
  const { duration = 400, scaleMax = 1.4, rotationMax = 10 } = options;

  const [isAnimating, setIsAnimating] = useState(false);
  const [style, setStyle] = useState<PopAnimationStyle>({
    transform: 'scale(1) rotate(0deg)',
    opacity: 1,
  });

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate scaled keyframes based on options
  const scaledKeyframes = useRef<typeof KEYFRAMES>(
    KEYFRAMES.map(([time, scale, rotation, opacity]) => [
      time,
      1 + (scale - 1) * (scaleMax - 1) / 0.4, // Scale relative to default max
      rotation * (rotationMax / 10), // Scale rotation relative to default
      opacity,
    ])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);

    const { scale, rotation, opacity } = interpolate(progress, scaledKeyframes.current);

    setStyle({
      transform: `scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`,
      opacity,
    });

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
      setStyle({
        transform: 'scale(1) rotate(0deg)',
        opacity: 1,
      });
    }
  }, [duration]);

  const trigger = useCallback(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Reset and start new animation
    startTimeRef.current = 0;
    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  return {
    isAnimating,
    style,
    trigger,
  };
}

/**
 * Hook to manage multiple pop animations (e.g., for a list of items)
 * Each item can have its own animation state
 */
export function usePopAnimationMap(options: PopAnimationOptions = {}) {
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [styles, setStyles] = useState<Map<string, PopAnimationStyle>>(new Map());
  const animationsRef = useRef<Map<string, {
    rafId: number | null;
    startTime: number;
  }>>(new Map());

  const { duration = 400, scaleMax = 1.4, rotationMax = 10 } = options;

  const scaledKeyframes = useRef<typeof KEYFRAMES>(
    KEYFRAMES.map(([time, scale, rotation, opacity]) => [
      time,
      1 + (scale - 1) * (scaleMax - 1) / 0.4,
      rotation * (rotationMax / 10),
      opacity,
    ])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach((anim) => {
        if (anim.rafId) cancelAnimationFrame(anim.rafId);
      });
    };
  }, []);

  const trigger = useCallback((id: string) => {
    // Cancel existing animation for this id
    const existing = animationsRef.current.get(id);
    if (existing?.rafId) {
      cancelAnimationFrame(existing.rafId);
    }

    const animate = (timestamp: number) => {
      const anim = animationsRef.current.get(id);
      if (!anim) return;

      if (anim.startTime === 0) {
        anim.startTime = timestamp;
      }

      const elapsed = timestamp - anim.startTime;
      const progress = Math.min(elapsed / duration, 1);

      const { scale, rotation, opacity } = interpolate(progress, scaledKeyframes.current);

      setStyles(prev => {
        const newMap = new Map(prev);
        newMap.set(id, {
          transform: `scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`,
          opacity,
        });
        return newMap;
      });

      if (progress < 1) {
        anim.rafId = requestAnimationFrame(animate);
      } else {
        setAnimatingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        setStyles(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
        animationsRef.current.delete(id);
      }
    };

    // Start animation
    animationsRef.current.set(id, { rafId: null, startTime: 0 });
    setAnimatingIds(prev => new Set(prev).add(id));

    const anim = animationsRef.current.get(id)!;
    anim.rafId = requestAnimationFrame(animate);
  }, [duration]);

  const getStyle = useCallback((id: string): PopAnimationStyle => {
    return styles.get(id) || { transform: 'scale(1) rotate(0deg)', opacity: 1 };
  }, [styles]);

  const isAnimating = useCallback((id: string): boolean => {
    return animatingIds.has(id);
  }, [animatingIds]);

  return {
    trigger,
    getStyle,
    isAnimating,
  };
}
