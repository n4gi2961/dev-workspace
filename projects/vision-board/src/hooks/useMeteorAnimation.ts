'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Meteor animation configuration options
 * React Native compatible - uses requestAnimationFrame for web,
 * can be adapted to Reanimated for React Native
 */
export interface MeteorAnimationOptions {
  /** Total animation duration in ms (default: 800) */
  duration?: number;
  /** Random offset range for start position (default: 10) */
  startOffsetRange?: number;
}

export interface MeteorInstance {
  id: string;
  progress: number;
  startOffset: number;
  color: string;
}

export interface MeteorAnimationReturn {
  /** Currently active meteors */
  meteors: MeteorInstance[];
  /** Trigger a new meteor animation */
  trigger: (color?: string) => void;
}

/**
 * Custom hook for meteor (shooting star) animation effect
 * Designed for React Native compatibility - uses requestAnimationFrame
 * which can be replaced with Reanimated's useFrameCallback
 */
export function useMeteorAnimation(options: MeteorAnimationOptions = {}): MeteorAnimationReturn {
  const { duration = 800, startOffsetRange = 10 } = options;

  const [meteors, setMeteors] = useState<MeteorInstance[]>([]);
  const animationsRef = useRef<Map<string, number>>(new Map());
  const idCounter = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach((rafId) => {
        cancelAnimationFrame(rafId);
      });
    };
  }, []);

  const trigger = useCallback((color: string = '#fbbf24') => {
    const id = `meteor-${idCounter.current++}`;
    const startOffset = Math.random() * startOffsetRange * 2 - startOffsetRange;
    const startTime = performance.now();

    // Vibration feedback (if available)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Add new meteor
    setMeteors(prev => [...prev, { id, progress: 0, startOffset, color }]);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setMeteors(prev =>
        prev.map(m => m.id === id ? { ...m, progress: eased * 100 } : m)
      );

      if (progress < 1) {
        const rafId = requestAnimationFrame(animate);
        animationsRef.current.set(id, rafId);
      } else {
        // Remove meteor after animation completes
        animationsRef.current.delete(id);
        setMeteors(prev => prev.filter(m => m.id !== id));
      }
    };

    const rafId = requestAnimationFrame(animate);
    animationsRef.current.set(id, rafId);
  }, [duration, startOffsetRange]);

  return {
    meteors,
    trigger,
  };
}
