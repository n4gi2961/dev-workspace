/**
 * ============================================================
 * Binaural Beat Generator - バイノーラルビート生成器
 * ============================================================
 *
 * 【科学的背景】
 * バイノーラルビートは左右の耳に異なる周波数を提示し、
 * 脳内でビート音を知覚させる技術。脳波同調を促す可能性がある。
 *
 * 【周波数帯と効果】
 * - デルタ波 (0.5-4Hz): 深い睡眠
 * - シータ波 (4-7Hz): 瞑想、創造性
 * - アルファ波 (8-12Hz): リラックス、軽い瞑想
 * - ベータ波 (13-30Hz): 集中、注意力
 * - ガンマ波 (30-100Hz): 高度な認知処理
 *
 * ⚠️ 注意: ヘッドフォン必須、最低6分以上の使用推奨
 *
 * 【実装原理】
 * 1. 左チャンネル: ベース周波数のサイン波
 * 2. 右チャンネル: ベース周波数+ビート周波数のサイン波
 * 3. StereoPannerNodeで左右に完全分離
 *
 * 【パラメータ】
 * - ベース周波数: 200Hz（デフォルト、知覚しやすい範囲）
 * - ビート周波数: 10Hz（デフォルト、アルファ波）
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: OscillatorNode, StereoPannerNode, GainNode
 *
 * 【使用例】
 * ```typescript
 * const binaural = new BinauralBeatGenerator(audioContext, masterGain);
 * binaural.setFrequencies(400, 10); // 400Hz base, 10Hz alpha beat
 * binaural.start();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export type BinauralPreset = 'focus' | 'relax' | 'sleep';

export class BinauralBeatGenerator implements SoundGenerator {
  private audioContext: AudioContext;
  private destinationNode: AudioNode;
  private gainNode: GainNode;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftPan: StereoPannerNode;
  private rightPan: StereoPannerNode;
  private playing: boolean = false;
  private volume: number = 0.5;
  private baseFrequency: number = 200;
  private beatFrequency: number = 10;

  private static readonly FADE_TIME_CONSTANT = 0.015;
  private static readonly MAX_VOLUME = 0.05; // 最大音量係数（100%時に5%出力）

  static readonly PRESETS: Record<BinauralPreset, { base: number; beat: number; label: string }> = {
    focus: { base: 200, beat: 18, label: 'Focus (β 18Hz)' },
    relax: { base: 200, beat: 10, label: 'Relax (α 10Hz)' },
    sleep: { base: 200, beat: 3, label: 'Sleep (δ 3Hz)' },
  };

  constructor(audioContext: AudioContext, destinationNode: AudioNode) {
    this.audioContext = audioContext;
    this.destinationNode = destinationNode;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.destinationNode);

    this.leftPan = this.audioContext.createStereoPanner();
    this.leftPan.pan.value = -1;
    this.leftPan.connect(this.gainNode);

    this.rightPan = this.audioContext.createStereoPanner();
    this.rightPan.pan.value = 1;
    this.rightPan.connect(this.gainNode);
  }

  setFrequencies(baseFreq: number, beatFreq: number): void {
    this.baseFrequency = baseFreq;
    this.beatFrequency = beatFreq;
    if (this.playing && this.leftOsc && this.rightOsc) {
      this.leftOsc.frequency.setTargetAtTime(baseFreq, this.audioContext.currentTime, 0.1);
      this.rightOsc.frequency.setTargetAtTime(baseFreq + beatFreq, this.audioContext.currentTime, 0.1);
    }
  }

  setPreset(preset: BinauralPreset): void {
    const p = BinauralBeatGenerator.PRESETS[preset];
    this.setFrequencies(p.base, p.beat);
  }

  getBaseFrequency(): number { return this.baseFrequency; }
  getBeatFrequency(): number { return this.beatFrequency; }

  start(): void {
    if (this.playing) return;

    this.leftOsc = this.audioContext.createOscillator();
    this.leftOsc.type = 'sine';
    this.leftOsc.frequency.value = this.baseFrequency;
    this.leftOsc.connect(this.leftPan);

    this.rightOsc = this.audioContext.createOscillator();
    this.rightOsc.type = 'sine';
    this.rightOsc.frequency.value = this.baseFrequency + this.beatFrequency;
    this.rightOsc.connect(this.rightPan);

    this.gainNode.gain.setTargetAtTime(this.volume * BinauralBeatGenerator.MAX_VOLUME, this.audioContext.currentTime, BinauralBeatGenerator.FADE_TIME_CONSTANT);

    this.leftOsc.start();
    this.rightOsc.start();
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;
    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, BinauralBeatGenerator.FADE_TIME_CONSTANT);
    const stopTime = this.audioContext.currentTime + BinauralBeatGenerator.FADE_TIME_CONSTANT * 5;
    this.leftOsc?.stop(stopTime);
    this.rightOsc?.stop(stopTime);
    this.leftOsc = null;
    this.rightOsc = null;
    this.playing = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playing) {
      this.gainNode.gain.setTargetAtTime(this.volume * BinauralBeatGenerator.MAX_VOLUME, this.audioContext.currentTime, BinauralBeatGenerator.FADE_TIME_CONSTANT);
    }
  }

  getVolume(): number { return this.volume; }
  isPlaying(): boolean { return this.playing; }
}
