import { useState, useEffect, useCallback } from 'react';

const DETOX_TIMER_KEY = 'focusflow_detox_timer';

export const useDetoxTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 初期化時にlocalStorageから復元
  useEffect(() => {
    const savedTimer = localStorage.getItem(DETOX_TIMER_KEY);
    if (savedTimer) {
      try {
        const { isActive: savedIsActive, startTime: savedStartTime } = JSON.parse(savedTimer);
        if (savedIsActive && savedStartTime) {
          const savedStart = new Date(savedStartTime);
          const now = new Date();
          const elapsed = now.getTime() - savedStart.getTime();
          setIsActive(true);
          setStartTime(savedStart);
          setElapsedTime(elapsed);
        }
      } catch (e) {
        // エラーが発生した場合は保存データを削除
        localStorage.removeItem(DETOX_TIMER_KEY);
      }
    }
  }, []);

  const startTimer = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    setElapsedTime(0);
    
    // localStorageに保存
    localStorage.setItem(DETOX_TIMER_KEY, JSON.stringify({
      isActive: true,
      startTime: now.toISOString(),
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setStartTime(null);
    
    // localStorageから削除
    localStorage.removeItem(DETOX_TIMER_KEY);
    
    return elapsedTime;
  }, [elapsedTime]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setStartTime(null);
    setElapsedTime(0);
    
    // localStorageから削除
    localStorage.removeItem(DETOX_TIMER_KEY);
  }, []);

  // バックグラウンドでも正確な時間を計測
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && startTime) {
      // 初回実行
      const updateElapsed = () => {
        const now = new Date();
        setElapsedTime(now.getTime() - startTime.getTime());
      };
      
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, startTime]);

  // Page Visibility APIでバックグラウンド対応
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive && startTime) {
        // ページが再表示された時に時間を再計算
        const now = new Date();
        setElapsedTime(now.getTime() - startTime.getTime());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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