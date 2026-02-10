/**
 * ============================================================
 * Rain Sound Generator - 雨音生成器
 * ============================================================
 *
 * 【科学的背景】
 * 雨音はYouTubeで約3.99億回再生を記録する人気環境音。
 * 予測可能な反復パターンが脳の警戒状態を解き、リラックスを促進。
 *
 * - 周波数特性: 中〜高周波が支配的、ローパスで柔らかく
 * - 音の印象: 穏やかな雨が窓を打つ音
 * - 効果: リラックス、集中、睡眠導入
 *
 * 【実装原理】
 * 1. ホワイトノイズをベースに使用
 * 2. ローパスフィルター(800-1500Hz)で高周波をカット
 * 3. LFO(0.1-0.3Hz)で音量を緩やかに変調し、雨の強弱を表現
 *
 * 【パラメータ】
 * - ローパスカットオフ: 1000Hz
 * - LFO周波数: 0.2Hz（5秒周期）
 * - LFO深度: 0.3（30%の音量変動）
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, BiquadFilterNode, GainNode, OscillatorNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { RainSoundGenerator } from './RainSound';
 *
 * const engine = AudioEngine.getInstance();
 * const rain = new RainSoundGenerator(engine.getContext(), engine.getMasterGain());
 * rain.start();
 * rain.setVolume(0.5);
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class RainSoundGenerator implements SoundGenerator {
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
  private static readonly LOWPASS_FREQUENCY = 1000;
  private static readonly LFO_FREQUENCY = 0.2;
  private static readonly LFO_DEPTH = 0.3;
  private static readonly MAX_VOLUME = 0.4;

  constructor(audioContext: AudioContext, destinationNode: AudioNode) {
    this.audioContext = audioContext;
    this.destinationNode = destinationNode;

    // ノードチェーン: Source -> Filter -> LfoGain -> GainNode -> Destination
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.destinationNode);

    this.lfoGain = this.audioContext.createGain();
    this.lfoGain.connect(this.gainNode);

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = RainSoundGenerator.LOWPASS_FREQUENCY;
    this.filter.Q.value = 1;
    this.filter.connect(this.lfoGain);

    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * RainSoundGenerator.BUFFER_DURATION;
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

    // LFOで音量変調
    const scaledVolume = this.volume * RainSoundGenerator.MAX_VOLUME;
    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = RainSoundGenerator.LFO_FREQUENCY;
    const lfoGainNode = this.audioContext.createGain();
    lfoGainNode.gain.value = RainSoundGenerator.LFO_DEPTH * scaledVolume;
    this.lfo.connect(lfoGainNode);
    lfoGainNode.connect(this.lfoGain.gain);

    this.lfoGain.gain.value = scaledVolume * (1 - RainSoundGenerator.LFO_DEPTH);
    this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, RainSoundGenerator.FADE_TIME_CONSTANT);

    this.sourceNode.start();
    this.lfo.start();
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;
    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, RainSoundGenerator.FADE_TIME_CONSTANT);
    const stopTime = this.audioContext.currentTime + RainSoundGenerator.FADE_TIME_CONSTANT * 5;
    this.sourceNode?.stop(stopTime);
    this.lfo?.stop(stopTime);
    this.sourceNode = null;
    this.lfo = null;
    this.playing = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playing) {
      const scaledVolume = this.volume * RainSoundGenerator.MAX_VOLUME;
      this.lfoGain.gain.setTargetAtTime(scaledVolume * (1 - RainSoundGenerator.LFO_DEPTH), this.audioContext.currentTime, RainSoundGenerator.FADE_TIME_CONSTANT);
    }
  }

  getVolume(): number { return this.volume; }
  isPlaying(): boolean { return this.playing; }
}
