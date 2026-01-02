import { useEffect, useRef, useCallback } from 'react';
import { audioManager, AudioSettings, BreathingPhaseType } from '../utils/audioManager';

export const useAudioManager = () => {
  const initializationAttempted = useRef(false);
  const isInitialized = useRef(false);

  const initializeAudio = useCallback(async () => {
    if (initializationAttempted.current) return;
    
    initializationAttempted.current = true;
    
    try {
      const success = await audioManager.initialize();
      isInitialized.current = success;
      
      if (success) {
        console.log('Audio manager initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize audio manager:', error);
    }
  }, []);

  useEffect(() => {
    // ユーザーインタラクションによる初期化
    const handleUserInteraction = () => {
      initializeAudio();
      
      // 一度初期化したらイベントリスナーを削除
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };

    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [initializeAudio]);

  useEffect(() => {
    // ページが非表示になったときにオーディオを一時停止
    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioManager.suspend();
      } else {
        audioManager.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const playTickSound = useCallback((phaseType?: BreathingPhaseType) => {
    if (!isInitialized.current) {
      // 初期化されていない場合は試行
      initializeAudio();
      return;
    }
    
    audioManager.playTickSound(phaseType);
  }, [initializeAudio]);

  const playTransitionSound = useCallback((phaseType: BreathingPhaseType) => {
    if (!isInitialized.current) {
      // 初期化されていない場合は試行
      initializeAudio();
      return;
    }
    
    audioManager.playTransitionSound(phaseType);
  }, [initializeAudio]);

  const updateSettings = useCallback((settings: Partial<AudioSettings>) => {
    audioManager.updateSettings(settings);
  }, []);

  const getSettings = useCallback((): AudioSettings => {
    return audioManager.getSettings();
  }, []);

  const suspend = useCallback(() => {
    audioManager.suspend();
  }, []);

  const resume = useCallback(() => {
    audioManager.resume();
  }, []);

  return {
    playTickSound,
    playTransitionSound,
    updateSettings,
    getSettings,
    suspend,
    resume,
    isInitialized: isInitialized.current
  };
};