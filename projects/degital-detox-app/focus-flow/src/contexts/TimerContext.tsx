import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TimerType } from '../types/timer';

interface TimerContextState {
  activeTimers: Set<TimerType>;
  timerSettings: Record<TimerType, { duration: number; enabled: boolean }>;
}

interface TimerContextActions {
  registerTimer: (type: TimerType) => void;
  unregisterTimer: (type: TimerType) => void;
  updateTimerSetting: (type: TimerType, duration: number, enabled: boolean) => void;
  isTimerActive: (type: TimerType) => boolean;
}

type TimerContextType = TimerContextState & TimerContextActions;

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [activeTimers, setActiveTimers] = useState<Set<TimerType>>(new Set());
  const [timerSettings, setTimerSettings] = useState<Record<TimerType, { duration: number; enabled: boolean }>>({
    pomodoro: { duration: 25, enabled: true },
    water: { duration: 15, enabled: true },
    stand: { duration: 30, enabled: true },
  });

  const registerTimer = (type: TimerType) => {
    setActiveTimers(prev => new Set(prev).add(type));
  };

  const unregisterTimer = (type: TimerType) => {
    setActiveTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(type);
      return newSet;
    });
  };

  const updateTimerSetting = (type: TimerType, duration: number, enabled: boolean) => {
    setTimerSettings(prev => ({
      ...prev,
      [type]: { duration, enabled }
    }));
  };

  const isTimerActive = (type: TimerType) => {
    return activeTimers.has(type);
  };

  const value: TimerContextType = {
    activeTimers,
    timerSettings,
    registerTimer,
    unregisterTimer,
    updateTimerSetting,
    isTimerActive,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimerContext = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
};