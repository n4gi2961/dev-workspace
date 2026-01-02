import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerType, TimerState, PomodoroState } from '../types/timer';
import { TIMER_CONFIGS } from '../constants/timers';
import { AUDIO_FUNCTIONS } from '../utils/audioUtils';
import { useTimerContext } from '../contexts/TimerContext';

interface UseTimerProps {
  type: TimerType;
  customDuration?: number;
  customBreakDuration?: number;
  onComplete?: () => void;
}

export const useTimer = ({ type, customDuration, customBreakDuration, onComplete }: UseTimerProps) => {
  const config = TIMER_CONFIGS[type];
  const { registerTimer, unregisterTimer } = useTimerContext();
  const [state, setState] = useState<TimerState | PomodoroState>(() => {
    const duration = (customDuration || config.defaultDuration) * 60;
    
    if (type === 'pomodoro') {
      return {
        id: type,
        isActive: false,
        timeRemaining: duration,
        totalDuration: duration,
        isPaused: false,
        focusDuration: customDuration || config.defaultDuration,
        breakDuration: customBreakDuration || 5,
        isBreak: false,
        cycle: 1,
        isCompleted: false
      } as PomodoroState;
    }
    
    return {
      id: type,
      isActive: false,
      timeRemaining: duration,
      totalDuration: duration,
      isPaused: false,
      isCompleted: false
    };
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // customDurationが変更されたときにタイマーをリセット
  useEffect(() => {
    if (!state.isActive) {
      const duration = (customDuration || config.defaultDuration) * 60;
      
      setState(prev => {
        if (type === 'pomodoro') {
          return {
            ...prev,
            timeRemaining: duration,
            totalDuration: duration,
            focusDuration: customDuration || config.defaultDuration,
            breakDuration: customBreakDuration || 5,
            isBreak: false,
            cycle: 1
          } as PomodoroState;
        }
        
        return {
          ...prev,
          timeRemaining: duration,
          totalDuration: duration
        };
      });
    }
  }, [customDuration, customBreakDuration, config.defaultDuration, type, state.isActive]);

  const playCompletionSound = useCallback(() => {
    try {
      const audioFunction = AUDIO_FUNCTIONS[config.sound];
      if (audioFunction) {
        audioFunction();
      }
    } catch (error) {
      console.warn('音声再生エラー:', error);
    }
  }, [config.sound]);

  const startTimer = useCallback(() => {
    console.log('🚀 startTimer called for:', type);
    setState(prev => {
      console.log('🔄 setState in startTimer:', { prev, newState: { ...prev, isActive: true, isPaused: false } });
      return { ...prev, isActive: true, isPaused: false, isCompleted: false };
    });
    registerTimer(type);
  }, [type, registerTimer]);

  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const duration = (customDuration || config.defaultDuration) * 60;
    setState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      timeRemaining: duration,
      totalDuration: duration,
      isCompleted: false,
      ...(type === 'pomodoro' && { isBreak: false, cycle: 1, breakDuration: customBreakDuration || 5 })
    }));
  }, [customDuration, customBreakDuration, config.defaultDuration, type]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isActive: false, isPaused: false, isCompleted: false }));
    unregisterTimer(type);
  }, [type, unregisterTimer]);

  useEffect(() => {
    console.log('⚡ useEffect triggered:', { isActive: state.isActive, isPaused: state.isPaused, type });
    if (state.isActive && !state.isPaused) {
      console.log('🎯 Starting interval for:', type);
      intervalRef.current = setInterval(() => {
        console.log('⏰ Interval tick for:', type);
        setState(prev => {
          console.log('📊 Current state:', { timeRemaining: prev.timeRemaining, isActive: prev.isActive, isPaused: prev.isPaused });
          if (prev.timeRemaining <= 1) {
            playCompletionSound();
            
            if (type === 'pomodoro') {
              // ポモドーロタイマーは終了時に一時停止状態にする
              onComplete?.();
              return {
                ...prev,
                isActive: true,
                isPaused: true,
                isCompleted: true,
                timeRemaining: 0
              };
            } else {
              // 他のタイマーは停止
              onComplete?.();
              return {
                ...prev,
                isActive: false,
                timeRemaining: prev.totalDuration,
                isCompleted: false
              };
            }
          }
          
          const newTimeRemaining = prev.timeRemaining - 1;
          console.log('⬇️ Decreasing time:', { from: prev.timeRemaining, to: newTimeRemaining });
          return {
            ...prev,
            timeRemaining: newTimeRemaining
          };
        });
      }, 1000);
    } else {
      console.log('🛑 Clearing interval for:', type, { hasInterval: !!intervalRef.current });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isActive, state.isPaused, type]);

  // 音声関連のクリーンアップは不要（Web Audio APIを使用）

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const progress = ((state.totalDuration - state.timeRemaining) / state.totalDuration) * 100;

  return {
    state,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    formattedTime: formatTime(state.timeRemaining),
    progress,
    config
  };
};