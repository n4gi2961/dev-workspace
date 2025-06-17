import { useState, useRef, useCallback, useEffect } from 'react';
import {
  SessionState,
  SESSION_STATES,
  BreathingPattern,
  BreathingSessionData,
} from '../constants/breathing';

interface UseBreathingSessionProps {
  pattern: BreathingPattern;
  duration: number;
  onComplete: (sessionData: BreathingSessionData) => void;
}

interface UseBreathingSessionReturn {
  sessionState: SessionState;
  elapsedTime: number;
  currentPhaseIndex: number;
  totalBreathCount: number;
  countdown: number;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  calculateSessionMetrics: () => SessionMetrics;
  consistencyScore: number;
}

interface SessionMetrics {
  breathsPerMinute: string;
  progressPercentage: number;
  remainingTime: number;
  phaseProgress: number;
  consistencyScore: number;
}

export const useBreathingSession = ({
  pattern,
  duration,
  onComplete,
}: UseBreathingSessionProps): UseBreathingSessionReturn => {
  // セッション状態
  const [sessionState, setSessionState] = useState<SessionState>(SESSION_STATES.IDLE);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [totalBreathCount, setTotalBreathCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(100);

  // タイマー参照
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 呼吸間隔記録（一貫性スコア計算用）
  const breathIntervals = useRef<number[]>([]);
  const lastBreathTime = useRef<number>(0);

  // パターンが変更された時の状態リセット
  useEffect(() => {
    if (sessionState === SESSION_STATES.IDLE) {
      // 進行中のタイマーをクリア
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      
      // 状態をリセット
      setCurrentPhaseIndex(0);
      setTotalBreathCount(0);
      setElapsedTime(0);
      setCountdown(0);
      setConsistencyScore(100);
      breathIntervals.current = [];
      lastBreathTime.current = 0;
    }
  }, [pattern, sessionState]);

  // セッション完了
  const completeSession = useCallback(() => {
    setSessionState(SESSION_STATES.COMPLETED);
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }

    // セッションデータ作成
    const sessionData: BreathingSessionData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      pattern: pattern.name,
      duration: elapsedTime,
      plannedDuration: duration,
      breathCount: totalBreathCount,
      consistencyScore: consistencyScore,
      completionRate: (elapsedTime / duration) * 100,
      metrics: {
        avgBreathsPerMinute: totalBreathCount > 0 ? (totalBreathCount / (elapsedTime / 60)).toFixed(1) : '0',
        totalFocusTime: elapsedTime,
      },
    };

    onComplete(sessionData);
  }, [elapsedTime, duration, totalBreathCount, consistencyScore, pattern, onComplete]);

  // 呼吸フェーズ開始
  const startBreathingPhase = useCallback((phaseIndex: number) => {
    const currentPhase = pattern.phases[phaseIndex];
    if (!currentPhase) return;
    
    setCurrentPhaseIndex(phaseIndex);

    phaseTimerRef.current = setTimeout(() => {
      const nextPhaseIndex = (phaseIndex + 1) % pattern.phases.length;
      
      // 完全なサイクル完了時
      if (nextPhaseIndex === 0) {
        setTotalBreathCount(prev => prev + 1);
        
        // 呼吸間隔記録をインライン実装
        const currentTime = Date.now();
        if (lastBreathTime.current > 0) {
          const interval = currentTime - lastBreathTime.current;
          breathIntervals.current.push(interval);
          
          if (breathIntervals.current.length > 10) {
            breathIntervals.current.shift();
          }
          
          // 一貫性スコア更新をインライン実装
          if (breathIntervals.current.length >= 2) {
            const intervals = breathIntervals.current;
            const mean = intervals.reduce((a, b) => a + b) / intervals.length;
            const variance = intervals.reduce((sum, interval) => {
              return sum + Math.pow(interval - mean, 2);
            }, 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            const score = Math.max(0, 100 - (stdDev / mean * 100));
            setConsistencyScore(Math.round(score));
          }
        }
        lastBreathTime.current = currentTime;
      }

      // セッションがアクティブな場合のみ次のフェーズ開始
      if (sessionTimerRef.current) {
        setCurrentPhaseIndex(nextPhaseIndex);
        startBreathingPhase(nextPhaseIndex);
      }
    }, currentPhase.duration);
  }, [pattern]);

  // セッション開始処理
  const startSession = useCallback(() => {
    setSessionState(SESSION_STATES.PREPARING);
    setElapsedTime(0);
    setTotalBreathCount(0);
    setCurrentPhaseIndex(0);
    setCountdown(3);
    breathIntervals.current = [];
    lastBreathTime.current = 0;

    // 3秒のカウントダウン
    let countdownValue = 3;
    countdownTimerRef.current = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);
      
      if (countdownValue <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        // インライン関数で実際のセッション開始
        setSessionState(SESSION_STATES.ACTIVE);
        setCountdown(0);
        lastBreathTime.current = Date.now();
        
        // セッションタイマー開始
        sessionTimerRef.current = setInterval(() => {
          setElapsedTime(prev => {
            const newElapsed = prev + 1;
            if (newElapsed >= duration) {
              completeSession();
            }
            return newElapsed;
          });
        }, 1000);
        
        // 最初の呼吸フェーズ開始
        startBreathingPhase(0);
      }
    }, 1000);
  }, [duration, startBreathingPhase, completeSession]);



  // セッション一時停止
  const pauseSession = useCallback(() => {
    if (sessionState !== SESSION_STATES.ACTIVE) return;
    
    setSessionState(SESSION_STATES.PAUSED);
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }
  }, [sessionState]);

  // セッション再開
  const resumeSession = useCallback(() => {
    if (sessionState !== SESSION_STATES.PAUSED) return;
    
    setSessionState(SESSION_STATES.ACTIVE);
    
    // セッションタイマー再開
    sessionTimerRef.current = setInterval(() => {
      setElapsedTime(prev => {
        const newElapsed = prev + 1;
        if (newElapsed >= duration) {
          completeSession();
        }
        return newElapsed;
      });
    }, 1000);

    // 現在のフェーズから再開
    startBreathingPhase(currentPhaseIndex);
  }, [sessionState, currentPhaseIndex, duration, startBreathingPhase, completeSession]);

  // セッション停止
  const stopSession = useCallback(() => {
    setSessionState(SESSION_STATES.IDLE);
    setElapsedTime(0);
    setCurrentPhaseIndex(0);
    setTotalBreathCount(0);
    setCountdown(0);
    breathIntervals.current = [];
    
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, []);

  // セッション統計計算
  const calculateSessionMetrics = useCallback((): SessionMetrics => {
    const cycleDuration = pattern.phases.reduce((sum, phase) => sum + phase.duration, 0);
    
    return {
      breathsPerMinute: (60000 / cycleDuration).toFixed(1),
      progressPercentage: duration > 0 ? ((elapsedTime / duration) * 100) : 0,
      remainingTime: duration - elapsedTime,
      phaseProgress: 0, // TODO: 実装
      consistencyScore,
    };
  }, [pattern, duration, elapsedTime, consistencyScore]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return {
    sessionState,
    elapsedTime,
    currentPhaseIndex,
    totalBreathCount,
    countdown,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    calculateSessionMetrics,
    consistencyScore,
  };
};