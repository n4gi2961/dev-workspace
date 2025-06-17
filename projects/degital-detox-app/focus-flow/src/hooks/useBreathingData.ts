import { useState, useEffect, useCallback } from 'react';
import { 
  BreathingSessionData, 
  BreathingStatistics 
} from '../constants/breathing';
import { 
  initializeBreathingStatistics,
  validateSessionData,
  getStorageKey,
  calculateNewAverage,
  updateStreakCount,
  updatePatternPreference,
  updateWeeklyProgress,
  calculateFocusScoreContribution
} from '../utils/breathingCalculations';

interface UseBreathingDataReturn {
  sessions: BreathingSessionData[];
  statistics: BreathingStatistics;
  isLoading: boolean;
  saveSession: (sessionData: BreathingSessionData) => Promise<boolean>;
  loadSessions: () => Promise<BreathingSessionData[]>;
  loadStatistics: () => Promise<BreathingStatistics>;
  updateFocusScore: (contribution: number) => Promise<void>;
  clearAllData: () => Promise<void>;
  exportData: () => string;
}

export const useBreathingData = (): UseBreathingDataReturn => {
  const [sessions, setSessions] = useState<BreathingSessionData[]>([]);
  const [statistics, setStatistics] = useState<BreathingStatistics>(initializeBreathingStatistics());
  const [isLoading, setIsLoading] = useState(true);

  // LocalStorageから呼吸セッションデータを読み込み
  const loadSessions = useCallback(async (): Promise<BreathingSessionData[]> => {
    try {
      const key = getStorageKey('sessions');
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        return [];
      }

      const parsedData = JSON.parse(storedData);
      const validSessions = parsedData.filter((session: any) => validateSessionData(session));
      
      setSessions(validSessions);
      return validSessions;
    } catch (error) {
      console.error('Failed to load breathing sessions:', error);
      return [];
    }
  }, []);

  // LocalStorageから統計データを読み込み
  const loadStatistics = useCallback(async (): Promise<BreathingStatistics> => {
    try {
      const key = getStorageKey('statistics');
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        const initialStats = initializeBreathingStatistics();
        setStatistics(initialStats);
        return initialStats;
      }

      const parsedStats = JSON.parse(storedData);
      setStatistics(parsedStats);
      return parsedStats;
    } catch (error) {
      console.error('Failed to load breathing statistics:', error);
      const initialStats = initializeBreathingStatistics();
      setStatistics(initialStats);
      return initialStats;
    }
  }, []);

  // セッションデータを保存
  const saveSession = useCallback(async (sessionData: BreathingSessionData): Promise<boolean> => {
    try {
      if (!validateSessionData(sessionData)) {
        console.error('Invalid session data:', sessionData);
        return false;
      }

      // セッション一覧を更新
      const updatedSessions = [...sessions, sessionData];
      setSessions(updatedSessions);
      
      const sessionsKey = getStorageKey('sessions');
      localStorage.setItem(sessionsKey, JSON.stringify(updatedSessions));

      // 統計を更新
      await updateUserStatistics(sessionData);

      // 集中力スコアに貢献
      const focusContribution = calculateFocusScoreContribution(sessionData);
      await updateFocusScore(focusContribution);

      return true;
    } catch (error) {
      console.error('Failed to save breathing session:', error);
      return false;
    }
  }, [sessions]);

  // ユーザー統計を更新
  const updateUserStatistics = useCallback(async (sessionData: BreathingSessionData) => {
    try {
      const currentStats = statistics;
      
      const updatedStats: BreathingStatistics = {
        totalSessions: currentStats.totalSessions + 1,
        totalMeditationTime: currentStats.totalMeditationTime + sessionData.duration,
        averageSessionLength: calculateNewAverage(
          currentStats.averageSessionLength, 
          sessionData.duration, 
          currentStats.totalSessions + 1
        ),
        preferredPattern: updatePatternPreference(
          { [currentStats.preferredPattern]: 1 }, 
          sessionData.pattern
        ),
        streakDays: updateStreakCount(currentStats.lastSessionDate),
        weeklyProgress: updateWeeklyProgress(currentStats.weeklyProgress, sessionData),
        lastSessionDate: new Date().toISOString(),
      };

      setStatistics(updatedStats);
      
      const statsKey = getStorageKey('statistics');
      localStorage.setItem(statsKey, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Failed to update user statistics:', error);
    }
  }, [statistics]);

  // 集中力スコアを更新（AppContextと統合）
  const updateFocusScore = useCallback(async (contribution: number): Promise<void> => {
    try {
      // TODO: AppContextの集中力スコア更新機能と統合
      console.log(`Focus score contribution: +${contribution} points`);
      
      // LocalStorageに集中力スコア履歴を保存
      const focusScoreKey = getStorageKey('focus_contributions');
      const existingContributions = JSON.parse(
        localStorage.getItem(focusScoreKey) || '[]'
      );
      
      const newContribution = {
        timestamp: new Date().toISOString(),
        points: contribution,
        source: 'breathing_meditation',
      };
      
      const updatedContributions = [...existingContributions, newContribution];
      localStorage.setItem(focusScoreKey, JSON.stringify(updatedContributions));
    } catch (error) {
      console.error('Failed to update focus score:', error);
    }
  }, []);

  // 全データをクリア
  const clearAllData = useCallback(async (): Promise<void> => {
    try {
      const keys = ['sessions', 'statistics', 'focus_contributions'];
      keys.forEach(key => {
        localStorage.removeItem(getStorageKey(key));
      });
      
      setSessions([]);
      setStatistics(initializeBreathingStatistics());
    } catch (error) {
      console.error('Failed to clear breathing data:', error);
    }
  }, []);

  // データをエクスポート
  const exportData = useCallback((): string => {
    try {
      const exportData = {
        sessions,
        statistics,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export breathing data:', error);
      return '{}';
    }
  }, [sessions, statistics]);

  // 初期データ読み込み
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadSessions(),
          loadStatistics(),
        ]);
      } catch (error) {
        console.error('Failed to initialize breathing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [loadSessions, loadStatistics]);

  return {
    sessions,
    statistics,
    isLoading,
    saveSession,
    loadSessions,
    loadStatistics,
    updateFocusScore,
    clearAllData,
    exportData,
  };
};