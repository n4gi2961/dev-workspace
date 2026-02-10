/**
 * ============================================================
 * Brown Noise Generator - ブラウンノイズ生成器（積分ノイズ）
 * ============================================================
 *
 * 【科学的背景】
 * ブラウンノイズ（ブラウニアンノイズ/レッドノイズ）は、
 * ブラウン運動（Brownian motion）に由来する深い低音ノイズ。
 * ホワイトノイズの積分により生成される。
 *
 * - 周波数特性: -6dB/オクターブ減衰（ピンクより急峻）
 * - 音の印象: 海の波、滝、雷の遠い音のような深い音
 * - 用途: リラックス、集中、深い低音が好みの人向け
 * - 科学的エビデンス: 睡眠研究はまだ発展途上
 *
 * 【実装原理 - 積分フィルター】
 * ホワイトノイズを積分処理してブラウンノイズを生成。
 * リーキー積分器（leaky integrator）を使用して発散を防止。
 *
 * 【アルゴリズム】
 * ```
 * // 積分係数
 * const alpha = 0.02;
 * const leak = 1.02;
 *
 * for each sample:
 *   white = random(-1, 1)
 *   lastOut = (lastOut + alpha * white) / leak
 *   output = lastOut * gainCorrection
 * ```
 *
 * 【パラメータ】
 * - 積分係数 (alpha): 0.02 - ノイズの寄与度
 * - リーク係数 (leak): 1.02 - DC成分の発散防止
 * - ゲイン補正: 3.5 - 出力レベル正規化
 *
 * 【依存関係】
 * - import: AudioEngine, SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, AudioBufferSourceNode, GainNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { BrownNoiseGenerator } from './BrownNoise';
 *
 * const engine = AudioEngine.getInstance();
 * const brownNoise = new BrownNoiseGenerator(engine.getContext(), engine.getMasterGain());
 *
 * brownNoise.start();
 * brownNoise.setVolume(0.4);
 * // ...
 * brownNoise.stop();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class BrownNoiseGenerator implements SoundGenerator {
  private audioContext: AudioContext;
  private destinationNode: AudioNode;
  private gainNode: GainNode;
  private sourceNode: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer;
  private playing: boolean = false;
  private volume: number = 0.5;

  // 定数
  private static readonly BUFFER_DURATION = 2; // 2秒のバッファ
  private static readonly FADE_TIME_CONSTANT = 0.015; // 15msのフェード
  private static readonly INTEGRATION_ALPHA = 0.02; // 積分係数
  private static readonly LEAK_COEFFICIENT = 1.02; // リーク係数
  private static readonly GAIN_CORRECTION = 3.5; // 出力ゲイン補正
  private static readonly MAX_VOLUME = 0.1; // 最大音量係数（100%時に10%出力）

  constructor(audioContext: AudioContext, destinationNode: AudioNode) {
    this.audioContext = audioContext;
    this.destinationNode = destinationNode;

    // ゲインノードを作成
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.destinationNode);

    // ノイズバッファを生成
    this.noiseBuffer = this.createNoiseBuffer();
  }

  /**
   * ブラウンノイズバッファを生成（積分フィルター）
   * ホワイトノイズをリーキー積分器で処理
   */
  private createNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * BrownNoiseGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // 積分器の状態変数
    let lastOut = 0;

    for (let i = 0; i < bufferSize; i++) {
      // ホワイトノイズ入力
      const white = Math.random() * 2 - 1;

      // リーキー積分: (前回出力 + α×入力) / leak
      // リーク係数により低周波のDC成分蓄積を防止
      lastOut = (lastOut + BrownNoiseGenerator.INTEGRATION_ALPHA * white) / BrownNoiseGenerator.LEAK_COEFFICIENT;

      // ゲイン補正して出力
      data[i] = lastOut * BrownNoiseGenerator.GAIN_CORRECTION;
    }

    return buffer;
  }

  /**
   * 再生開始
   */
  start(): void {
    if (this.playing) return;

    // ソースノードを作成
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.noiseBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.gainNode);

    // フェードインで再生開始
    this.gainNode.gain.setTargetAtTime(
      this.volume * BrownNoiseGenerator.MAX_VOLUME,
      this.audioContext.currentTime,
      BrownNoiseGenerator.FADE_TIME_CONSTANT
    );

    this.sourceNode.start();
    this.playing = true;
  }

  /**
   * 再生停止
   */
  stop(): void {
    if (!this.playing || !this.sourceNode) return;

    // フェードアウト
    this.gainNode.gain.setTargetAtTime(
      0,
      this.audioContext.currentTime,
      BrownNoiseGenerator.FADE_TIME_CONSTANT
    );

    // フェードアウト完了後に停止
    const stopTime = this.audioContext.currentTime + BrownNoiseGenerator.FADE_TIME_CONSTANT * 5;
    this.sourceNode.stop(stopTime);
    this.sourceNode = null;
    this.playing = false;
  }

  /**
   * 音量設定
   * @param volume 0.0 ~ 1.0
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playing) {
      this.gainNode.gain.setTargetAtTime(
        this.volume * BrownNoiseGenerator.MAX_VOLUME,
        this.audioContext.currentTime,
        BrownNoiseGenerator.FADE_TIME_CONSTANT
      );
    }
  }

  /**
   * 現在の音量を取得
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 再生中かどうか
   */
  isPlaying(): boolean {
    return this.playing;
  }
}
