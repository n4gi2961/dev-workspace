/**
 * ============================================================
 * Wind Sound Generator - 風音生成器
 * ============================================================
 *
 * 【科学的背景】
 * 海の波音はYouTubeで約1.51億回再生を記録。
 * 約12秒周期の押し寄せるリズムが呼吸と同期し深いリラックスを促す。
 *
 * 【実装原理】
 * 1. ブラウンノイズをベースに使用（深い低音）
 * 2. ローパスフィルター(400Hz)でさらに柔らかく
 * 3. 約12秒周期(0.08Hz)のLFOで波の押し寄せを表現
 *
 * 【パラメータ】
 * - ローパスカットオフ: 400Hz
 * - LFO周波数: 0.08Hz（約12秒周期）
 * - LFO深度: 0.6（大きな音量変動で波を表現）
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, BiquadFilterNode, GainNode, OscillatorNode
 *
 * 【使用例】
 * ```typescript
 * const waves = new WindSoundGenerator(audioContext, masterGain);
 * waves.start();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class WindSoundGenerator implements SoundGenerator {
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
  private static readonly LOWPASS_FREQUENCY = 400;
  private static readonly LFO_FREQUENCY = 0.08;
  private static readonly LFO_DEPTH = 0.6;

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
    this.filter.frequency.value = WindSoundGenerator.LOWPASS_FREQUENCY;
    this.filter.connect(this.lfoGain);

    this.noiseBuffer = this.createBrownNoiseBuffer();
  }

  private createBrownNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * WindSoundGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    return buffer;
  }

  start(): void {
    if (this.playing) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.noiseBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.filter);

    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = WindSoundGenerator.LFO_FREQUENCY;
    const lfoGainNode = this.audioContext.createGain();
    lfoGainNode.gain.value = WindSoundGenerator.LFO_DEPTH * this.volume;
    this.lfo.connect(lfoGainNode);
    lfoGainNode.connect(this.lfoGain.gain);

    this.lfoGain.gain.value = this.volume * (1 - WindSoundGenerator.LFO_DEPTH);
    this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, WindSoundGenerator.FADE_TIME_CONSTANT);

    this.sourceNode.start();
    this.lfo.start();
    this.playing = true;
  }

  stop(): void {
    if (!this.playing) return;
    this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, WindSoundGenerator.FADE_TIME_CONSTANT);
    const stopTime = this.audioContext.currentTime + WindSoundGenerator.FADE_TIME_CONSTANT * 5;
    this.sourceNode?.stop(stopTime);
    this.lfo?.stop(stopTime);
    this.sourceNode = null;
    this.lfo = null;
    this.playing = false;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playing) {
      this.lfoGain.gain.setTargetAtTime(this.volume * (1 - WindSoundGenerator.LFO_DEPTH), this.audioContext.currentTime, WindSoundGenerator.FADE_TIME_CONSTANT);
    }
  }

  getVolume(): number { return this.volume; }
  isPlaying(): boolean { return this.playing; }
}
