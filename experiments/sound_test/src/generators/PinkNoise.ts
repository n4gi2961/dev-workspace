/**
 * ============================================================
 * Pink Noise Generator - ピンクノイズ生成器（Paul Kelletアルゴリズム）
 * ============================================================
 *
 * 【科学的背景】
 * ピンクノイズ（1/fノイズ）は周波数が高くなるごとにパワーが減衰する信号。
 * 自然界に広く存在し、人間の生体リズムと共鳴する特性を持つ。
 *
 * - 周波数特性: -3dB/オクターブ減衰
 * - 音の印象: 滝の音、穏やかな雨のような柔らかい音
 * - 科学的効果: 睡眠改善効果81.9%（ホワイトノイズは33%）
 * - 生理学的意義: 心拍変動、脳波と同じ1/fパターン
 *
 * 【実装原理 - Paul Kelletアルゴリズム】
 * 6つの1次IIRフィルターを並列に使用してホワイトノイズをフィルタリング。
 * 各フィルターは異なる時定数を持ち、合成することでピンクスペクトルを実現。
 *
 * 【アルゴリズム詳細】
 * ```
 * // 6つの係数と状態変数
 * b0 = 0.99886 * b0 + white * 0.0555179
 * b1 = 0.99332 * b1 + white * 0.0750759
 * b2 = 0.96900 * b2 + white * 0.1538520
 * b3 = 0.86650 * b3 + white * 0.3104856
 * b4 = 0.55000 * b4 + white * 0.5329522
 * b5 = -0.7616 * b5 - white * 0.0168980
 * output = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
 * b6 = white * 0.115926
 * ```
 *
 * 【パラメータ】
 * - ゲイン補正: 0.11（出力レベル正規化）
 *
 * 【依存関係】
 * - import: AudioEngine, SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, AudioBufferSourceNode, GainNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { PinkNoiseGenerator } from './PinkNoise';
 *
 * const engine = AudioEngine.getInstance();
 * const pinkNoise = new PinkNoiseGenerator(engine.getContext(), engine.getMasterGain());
 *
 * pinkNoise.start();
 * pinkNoise.setVolume(0.4);
 * // ...
 * pinkNoise.stop();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class PinkNoiseGenerator implements SoundGenerator {
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
  private static readonly GAIN_CORRECTION = 0.11; // Paul Kellet係数の出力補正
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
   * ピンクノイズバッファを生成（Paul Kelletアルゴリズム）
   * ホワイトノイズを6つのIIRフィルターでフィルタリング
   */
  private createNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * PinkNoiseGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kelletアルゴリズムの状態変数
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      // ホワイトノイズ入力
      const white = Math.random() * 2 - 1;

      // Paul Kelletフィルター係数
      // 各係数は異なる減衰率と重みを持つ
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      // 出力合成（ゲイン補正込み）
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * PinkNoiseGenerator.GAIN_CORRECTION;

      // 次のサンプルのための遅延要素
      b6 = white * 0.115926;
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
      this.volume * PinkNoiseGenerator.MAX_VOLUME,
      this.audioContext.currentTime,
      PinkNoiseGenerator.FADE_TIME_CONSTANT
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
      PinkNoiseGenerator.FADE_TIME_CONSTANT
    );

    // フェードアウト完了後に停止
    const stopTime = this.audioContext.currentTime + PinkNoiseGenerator.FADE_TIME_CONSTANT * 5;
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
        this.volume * PinkNoiseGenerator.MAX_VOLUME,
        this.audioContext.currentTime,
        PinkNoiseGenerator.FADE_TIME_CONSTANT
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
