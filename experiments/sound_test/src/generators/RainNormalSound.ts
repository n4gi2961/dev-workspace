/**
 * ============================================================
 * Rain Normal Sound Generator - 通常の雨音生成器
 * ============================================================
 *
 * 【科学的背景】
 * 風の音は自然界で最も普遍的な環境音の一つ。
 * ゆっくりとしたうねりが1/fゆらぎに近く、リラックス効果がある。
 *
 * 【実装原理】
 * 1. ホワイトノイズをベースに使用
 * 2. バンドパスフィルター(300-800Hz)で風らしい帯域を抽出
 * 3. 非常にゆっくりしたLFO(0.1Hz)でうねりを表現
 *
 * 【パラメータ】
 * - バンドパス中心周波数: 500Hz
 * - Q値: 0.5
 * - LFO周波数: 0.1Hz（10秒周期）
 * - LFO深度: 0.4
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, BiquadFilterNode, GainNode, OscillatorNode
 *
 * 【使用例】
 * ```typescript
 * const wind = new RainNormalSoundGenerator(audioContext, masterGain);
 * wind.start();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class RainNormalSoundGenerator implements SoundGenerator {
  private audioContext: AudioContext;
  private destinationNode: AudioNode;
  private gainNode: GainNode;
  private lfoGain: GainNode;
  private lfo: OscillatorNode | null = null;
  private filter: BiquadFilterNode;
  private sourceNode: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer;
  private playing: boolean = false;
  private volume: number = 0.5;

  private static readonly BUFFER_DURATION = 2;
  private static readonly FADE_TIME_CONSTANT = 0.015;
  private static readonly BANDPASS_FREQUENCY = 500;
  private static readonly BANDPASS_Q = 0.5;
  private static readonly LFO_FREQUENCY = 0.1;
  private static readonly LFO_DEPTH = 0.4;
  private static readonly MAX_VOLUME = 0.3;

  constructor(audioContext: AudioContext, destinationNode: AudioNode) {
    this.audioContext = audioContext;
    this.destinationNode = destinationNode;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.destinationNode);

    this.lfoGain = this.audioContext.createGain();
    this.lfoGain.connect(this.gainNode);

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = RainNormalSoundGenerator.BANDPASS_FREQUENCY;
    this.filter.Q.value = RainNormalSoundGenerator.BANDPASS_Q;
    this.filter.connect(this.lfoGain);

    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * RainNormalSoundGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  start(): void {
    if (this.playing) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.noiseBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.filter);

    const scaledVolume = this.volume * RainNormalSoundGenerator.MAX_VOLUME;
    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = RainNormalSoundGenerator.LFO_FREQUENCY;
    const lfoGainNode = this.audioContext.createGain();
    lfoGainNode.gain.value = RainNormalSoundGenerator.LFO_DEPTH * scaledVolume;
    this.lfo.connect(lfoGainNode);
    lfoGainNode.connect(this.lfoGain.gain);

    this.lfoGain.gain.value = scaledVolume * (1 - RainNormalSoundGenerator.LFO_DEPTH);
    this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, RainNormalSoundGenerator.FADE_TIME_CONSTANT);

    this.sourceNode.start();
    this.lfo.start();
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;
    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, RainNormalSoundGenerator.FADE_TIME_CONSTANT);
    const stopTime = this.audioContext.currentTime + RainNormalSoundGenerator.FADE_TIME_CONSTANT * 5;
    this.sourceNode?.stop(stopTime);
    this.lfo?.stop(stopTime);
    this.sourceNode = null;
    this.lfo = null;
    this.playing = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playing) {
      const scaledVolume = this.volume * RainNormalSoundGenerator.MAX_VOLUME;
      this.lfoGain.gain.setTargetAtTime(scaledVolume * (1 - RainNormalSoundGenerator.LFO_DEPTH), this.audioContext.currentTime, RainNormalSoundGenerator.FADE_TIME_CONSTANT);
    }
  }

  getVolume(): number { return this.volume; }
  isPlaying(): boolean { return this.playing; }
}
