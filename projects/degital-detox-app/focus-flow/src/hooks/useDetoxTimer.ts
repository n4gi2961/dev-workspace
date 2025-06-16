import { useState, useEffect, useCallback } from 'react';

export const useDetoxTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimer = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    setElapsedTime(0);
  }, []);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setStartTime(null);
    return elapsedTime;
  }, [elapsedTime]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setStartTime(null);
    setElapsedTime(0);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        setElapsedTime(now.getTime() - startTime.getTime());
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime]);

  const formatTime = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    isActive,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    startTimer,
    stopTimer,
    resetTimer,
  };
};