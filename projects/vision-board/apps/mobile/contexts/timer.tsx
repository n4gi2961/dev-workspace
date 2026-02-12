import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import * as Haptics from 'expo-haptics';
import { useNavigation } from './navigation';

// --- Types ---

type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface TimerContextType {
  status: TimerStatus;
  routineId: string | null;
  routineTitle: string;
  routineColor: string;
  totalSeconds: number;
  remainingSeconds: number;
  setupTimer: (
    routine: { id: string; title: string; color: string } | null,
    minutes: number,
  ) => void;
  adjustTime: (deltaMinutes: number) => void;
  start: () => void;
  pause: () => void;
  stop: () => void;
  confirmCompletion: () => void;
  reset: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

const MIN_SECONDS = 60; // 1分
const MAX_SECONDS = 180 * 60; // 180分

// --- Provider ---

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { setTabBarVisible } = useNavigation();

  const [status, setStatus] = useState<TimerStatus>('idle');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineColor, setRoutineColor] = useState('');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Interval management ---

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer completed
          clearTimer();
          setStatus('completed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // --- Tab bar visibility control ---

  useEffect(() => {
    if (status === 'running' || status === 'completed') {
      setTabBarVisible(false);
    } else {
      setTabBarVisible(true);
    }
  }, [status, setTabBarVisible]);

  // --- Actions ---

  const setupTimer = useCallback(
    (
      routine: { id: string; title: string; color: string } | null,
      minutes: number,
    ) => {
      clearTimer();
      const seconds = Math.max(
        MIN_SECONDS,
        Math.min(MAX_SECONDS, minutes * 60),
      );
      setRoutineId(routine?.id ?? null);
      setRoutineTitle(routine?.title ?? 'Focus Timer');
      setRoutineColor(routine?.color ?? '');
      setTotalSeconds(seconds);
      setRemainingSeconds(seconds);
      setStatus('idle');
    },
    [clearTimer],
  );

  const adjustTime = useCallback(
    (deltaMinutes: number) => {
      if (status !== 'idle') return;
      const delta = deltaMinutes * 60;
      setTotalSeconds((prev) => {
        const next = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, prev + delta));
        setRemainingSeconds(next);
        return next;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [status],
  );

  const start = useCallback(() => {
    if (remainingSeconds <= 0) return;
    setStatus('running');
    startInterval();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [remainingSeconds, startInterval]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus('paused');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setRemainingSeconds(totalSeconds);
    setStatus('idle');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [clearTimer, totalSeconds]);

  const confirmCompletion = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setRemainingSeconds(totalSeconds);
  }, [clearTimer, totalSeconds]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setRoutineId(null);
    setRoutineTitle('');
    setRoutineColor('');
    setTotalSeconds(0);
    setRemainingSeconds(0);
  }, [clearTimer]);

  const value = useMemo(
    () => ({
      status,
      routineId,
      routineTitle,
      routineColor,
      totalSeconds,
      remainingSeconds,
      setupTimer,
      adjustTime,
      start,
      pause,
      stop,
      confirmCompletion,
      reset,
    }),
    [
      status,
      routineId,
      routineTitle,
      routineColor,
      totalSeconds,
      remainingSeconds,
      setupTimer,
      adjustTime,
      start,
      pause,
      stop,
      confirmCompletion,
      reset,
    ],
  );

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

// --- Hook ---

export function useTimer(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
