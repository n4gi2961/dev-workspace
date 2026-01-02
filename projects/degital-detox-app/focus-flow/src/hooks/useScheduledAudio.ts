import { useEffect, useRef, useMemo } from 'react';
import { BreathingPattern } from '../constants/breathing';
import { BreathingAudioScheduler } from '../utils/breathingAudioScheduler';
import { useAudioManager } from './useAudioManager';

interface UseScheduledAudioProps {
  pattern: BreathingPattern;
  sessionDuration: number;
  elapsedTime: number;
  isActive: boolean;
  audioEnabled: boolean;
}

export const useScheduledAudio = ({
  pattern,
  sessionDuration,
  elapsedTime,
  isActive,
  audioEnabled
}: UseScheduledAudioProps) => {
  const { playTickSound, playTransitionSound } = useAudioManager();
  const lastProcessedTime = useRef<number>(-1);
  const schedulerRef = useRef<BreathingAudioScheduler | null>(null);

  // スケジューラーの初期化と更新
  const scheduler = useMemo(() => {
    const newScheduler = new BreathingAudioScheduler(pattern, sessionDuration);
    schedulerRef.current = newScheduler;
    return newScheduler;
  }, [pattern, sessionDuration]);

  // 経過時間に基づく音声再生
  useEffect(() => {
    if (!isActive || !audioEnabled || !scheduler) return;

    // 同じ時間を重複処理しないようにチェック
    if (elapsedTime <= lastProcessedTime.current) return;

    // 前回処理した時間から現在時間まで、未処理の音声イベントを処理
    const startTime = Math.max(0, lastProcessedTime.current + 1);
    
    for (let time = startTime; time <= elapsedTime; time++) {
      const audioEvent = scheduler.getScheduleForTime(time);
      
      if (audioEvent) {
        if (audioEvent.type === 'tick') {
          playTickSound(audioEvent.phaseType);
        } else if (audioEvent.type === 'transition') {
          playTransitionSound(audioEvent.phaseType);
        }
      }
    }

    lastProcessedTime.current = elapsedTime;
  }, [elapsedTime, isActive, audioEnabled, scheduler, playTickSound, playTransitionSound]);

  // セッション状態リセット時の処理
  useEffect(() => {
    if (!isActive) {
      lastProcessedTime.current = -1;
    }
  }, [isActive]);

  // 現在のフェーズタイプを取得
  const getCurrentPhaseType = () => {
    if (!scheduler) return 'inhale';
    return scheduler.getCurrentPhaseType(elapsedTime);
  };

  return {
    getCurrentPhaseType,
    scheduler
  };
};