export type BreathingPhaseType = 'inhale' | 'hold' | 'exhale';

export interface AudioSettings {
  enabled: boolean;
  volume: number;
  tickVolume: number;
  transitionVolume: number;
}

export class MobileAudioManager {
  private audioContext: AudioContext | null = null;
  private initialized: boolean = false;
  private settings: AudioSettings = {
    enabled: true,
    volume: 0.5,
    tickVolume: 0.3,
    transitionVolume: 0.5
  };

  constructor() {
    this.initialize = this.initialize.bind(this);
    this.playTickSound = this.playTickSound.bind(this);
    this.playTransitionSound = this.playTransitionSound.bind(this);
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // iOSでのサイレントモード対応
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
      return false;
    }
  }

  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  private createOscillator(frequency: number, duration: number, volume: number): void {
    if (!this.audioContext || !this.settings.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const finalVolume = volume * this.settings.volume;
    gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playTickSound(phaseType?: BreathingPhaseType): void {
    if (!this.initialized || !this.settings.enabled) return;
    
    // 各フェーズの最も低い音をティック音として使用
    const tickFrequencies = {
      inhale: 349.23,   // F4（吸うの最も低い音）
      hold: 261.63,     // C4（止めるの最も低い音）
      exhale: 293.66    // D4（吐くの最も低い音）
    };
    
    const frequency = phaseType ? tickFrequencies[phaseType] : 800;
    this.createOscillator(frequency, 0.1, this.settings.tickVolume);
  }

  playTransitionSound(phaseType: BreathingPhaseType): void {
    if (!this.initialized || !this.settings.enabled) return;
    
    const transitionSounds = {
      inhale: [
        { frequency: 349.23, duration: 0.3 }, // F4（低い音）
        { frequency: 440, duration: 0.3 }     // A4（高い音）
      ],
      hold: [
        { frequency: 261.63, duration: 0.4 }, // C4（最も低い音）
        { frequency: 329.63, duration: 0.4 }  // E4（高い音）
      ],
      exhale: [
        { frequency: 293.66, duration: 0.5 }, // D4（低い音）
        { frequency: 369.99, duration: 0.5 }  // F#4（高い音）
      ]
    };

    const sounds = transitionSounds[phaseType];
    
    sounds.forEach((sound, index) => {
      setTimeout(() => {
        this.createOscillator(sound.frequency, sound.duration, this.settings.transitionVolume);
      }, index * 50); // 50ms間隔で重ねる
    });
  }

  suspend(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.initialized = false;
    }
  }
}

export const audioManager = new MobileAudioManager();