// 異なる完了音を生成するユーティリティ
export const createAudioContext = () => {
  if (typeof window !== 'undefined' && window.AudioContext) {
    return new AudioContext();
  }
  return null;
};

// ポモドーロ完了音（ベル音）
export const playPomodoroSound = () => {
  const audioContext = createAudioContext();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // ベル音のような響き
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 1);
};

// 水飲み完了音（水滴音）
export const playWaterSound = () => {
  const audioContext = createAudioContext();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 水滴のような音
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// スタンド完了音（チャイム音）
export const playStandSound = () => {
  const audioContext = createAudioContext();
  if (!audioContext) return;

  const playTone = (frequency: number, startTime: number, duration: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.15, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // チャイムのような和音
  const currentTime = audioContext.currentTime;
  playTone(523, currentTime, 0.5); // C5
  playTone(659, currentTime + 0.1, 0.5); // E5
  playTone(784, currentTime + 0.2, 0.5); // G5
};

export const AUDIO_FUNCTIONS: Record<string, () => void> = {
  pomodoro_complete: playPomodoroSound,
  water_reminder: playWaterSound,
  stand_reminder: playStandSound,
};