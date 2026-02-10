/**
 * ============================================================
 * Rain Sound Generator 003 - 土砂降りの「ザー」音生成器
 * ============================================================
 *
 * 【科学的背景】
 * 強い雨（土砂降り）は持続的な「ザー」という音が特徴。
 * ホワイトノイズに近いが、自然な雨らしさを出すために
 * 高周波を若干抑え、微細な変動を加える。
 *
 * - 周波数特性: ホワイトノイズベース + 軽いローパス
 * - 音の印象: 土砂降り、激しい雨、ザーッという持続音
 * - 用途: 集中、環境音マスキング、睡眠
 *
 * 【実装原理】
 * 1. ホワイトノイズをベースに使用
 *    → 「ザー」という明るく持続的な音の基盤
 * 2. ローパスフィルター（3000Hz）で超高周波のみカット
 *    → シャープすぎず自然な雨音に
 * 3. 軽いLFO（0.08Hz）で微細な変動
 *    → 雨脚の自然なゆらぎを表現（あまり目立たない程度）
 *
 * 【パラメータ】
 * - ベース: ホワイトノイズ
 * - ローパスカットオフ: 3000Hz（高周波は残す）
 * - LFO周波数: 0.08Hz（約12秒周期、控えめ）
 * - LFO深度: 0.1（10%、ほぼ一定の音量）
 * - 最大音量係数: 0.3
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, BiquadFilterNode, GainNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { RainSound003Generator } from './RainSound003';
 *
 * const engine = AudioEngine.getInstance();
 * const heavyRain = new RainSound003Generator(engine.getContext(), engine.getMasterGain());
 *
 * heavyRain.start();
 * heavyRain.setVolume(0.5);
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class RainSound003Generator implements SoundGenerator {
  private audioContext: AudioContext;
  private destinationNode: AudioNode;
  private gainNode: GainNode;
  private lfoGain: GainNode;
  private lfo: OscillatorNode | null = null;
  private lfoGainControl: GainNode | null = null;
  private filter: BiquadFilterNode;
  private sourceNode: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer;
  private playing: boolean = false;
  private volume: number = 0.5;

  // ============================================================
  // 定数
  // ============================================================

  private static readonly BUFFER_DURATION = 2;
  private static readonly FADE_TIME_CONSTANT = 0.015;

  /** ローパスカットオフ - 高めで「ザー」感を残す */
  private static readonly LOWPASS_FREQUENCY = 3000;
  private static readonly LOWPASS_Q = 0.5;

  /** LFO - 控えめで持続的な音に */
  private static readonly LFO_FREQUENCY = 0.08;
  private static readonly LFO_DEPTH = 0.1;

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
    this.filter.type = 'lowpass';
    this.filter.frequency.value = RainSound003Generator.LOWPASS_FREQUENCY;
    this.filter.Q.value = RainSound003Generator.LOWPASS_Q;
    this.filter.connect(this.lfoGain);

    this.noiseBuffer = this.createWhiteNoiseBuffer();
  }

  /**
   * ホワイトノイズバッファを生成
   */
  private createWhiteNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * RainSound003Generator.BUFFER_DURATION;
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

    const scaledVolume = this.volume * RainSound003Generator.MAX_VOLUME;

    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = RainSound003Generator.LFO_FREQUENCY;

    this.lfoGainControl = this.audioContext.createGain();
    this.lfoGainControl.gain.value = RainSound003Generator.LFO_DEPTH * scaledVolume;
    this.lfo.connect(this.lfoGainControl);
    this.lfoGainControl.connect(this.lfoGain.gain);

    this.lfoGain.gain.value = scaledVolume * (1 - RainSound003Generator.LFO_DEPTH);

    this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, RainSound003Generator.FADE_TIME_CONSTANT);

    this.sourceNode.start();
    this.lfo.start();
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;

    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, RainSound003Generator.FADE_TIME_CONSTANT);
    const stopTime = this.audioContext.currentTime + RainSound003Generator.FADE_TIME_CONSTANT * 5;
    this.sourceNode?.stop(stopTime);
    this.lfo?.stop(stopTime);

    this.sourceNode = null;
    this.lfo = null;
    this.lfoGainControl = null;
    this.playing = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.playing) {
      const scaledVolume = this.volume * RainSound003Generator.MAX_VOLUME;
      this.lfoGain.gain.setTargetAtTime(
        scaledVolume * (1 - RainSound003Generator.LFO_DEPTH),
        this.audioContext.currentTime,
        RainSound003Generator.FADE_TIME_CONSTANT
      );
      if (this.lfoGainControl) {
        this.lfoGainControl.gain.setTargetAtTime(
          RainSound003Generator.LFO_DEPTH * scaledVolume,
          this.audioContext.currentTime,
          RainSound003Generator.FADE_TIME_CONSTANT
        );
      }
    }
  }

  getVolume(): number { return this.volume; }
  isPlaying(): boolean { return this.playing; }
}
