import { useCallback, useRef } from 'react';
import { TimerType } from '../types/timer';

interface TimerControl {
  start: () => void;
  pause: () => void;
  stop: () => void;
}

export const useBulkTimerControl = () => {
  const timerRefs = useRef<Record<TimerType, TimerControl | null>>({
    pomodoro: null,
    water: null,
    stand: null,
  });

  const registerTimerControl = useCallback((type: TimerType, control: TimerControl) => {
    timerRefs.current[type] = control;
  }, []);

  const unregisterTimerControl = useCallback((type: TimerType) => {
    timerRefs.current[type] = null;
  }, []);

  const bulkStart = useCallback((selectedTimers: TimerType[]) => {
    selectedTimers.forEach(type => {
      const control = timerRefs.current[type];
      if (control) {
        control.start();
      }
    });
  }, []);

  const bulkPause = useCallback((selectedTimers: TimerType[]) => {
    selectedTimers.forEach(type => {
      const control = timerRefs.current[type];
      if (control) {
        control.pause();
      }
    });
  }, []);

  const bulkStop = useCallback((selectedTimers: TimerType[]) => {
    selectedTimers.forEach(type => {
      const control = timerRefs.current[type];
      if (control) {
        control.stop();
      }
    });
  }, []);

  return {
    registerTimerControl,
    unregisterTimerControl,
    bulkStart,
    bulkPause,
    bulkStop,
  };
};