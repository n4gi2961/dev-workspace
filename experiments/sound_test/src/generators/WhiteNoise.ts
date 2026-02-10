/**
 * ============================================================
 * White Noise Generator - ホワイトノイズ生成器
 * ============================================================
 *
 * 【科学的背景】
 * ホワイトノイズは全周波数帯域で均等なパワーを持つ音声信号。
 * 名前は可視光の「白色光」が全ての波長を含むことに由来する。
 *
 * - 周波数特性: フラット（全帯域で0dB）
 * - 音の印象: シャープな「シュー」という音
 * - 用途: 環境騒音のマスキング、ADHDの人の集中力向上
 *
 * ⚠️ 注意: ADHDでない人には逆効果の可能性あり（パフォーマンス低下）
 *
 * 【実装原理】
 * 1. AudioBufferに-1.0〜1.0のランダム値を書き込む
 * 2. AudioBufferSourceNodeでループ再生
 * 3. 2秒のバッファでメモリ効率を確保
 *
 * 【アルゴリズム】
 * ```
 * for each sample:
 *   output = Math.random() * 2 - 1
 * ```
 *
 * 【依存関係】
 * - import: AudioEngine, SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, AudioBufferSourceNode, GainNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { WhiteNoiseGenerator } from './WhiteNoise';
 *
 * const engine = AudioEngine.getInstance();
 * const whiteNoise = new WhiteNoiseGenerator(engine.getContext(), engine.getMasterGain());
 *
 * whiteNoise.start();
 * whiteNoise.setVolume(0.3);
 * // ...
 * whiteNoise.stop();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class WhiteNoiseGenerator implements SoundGenerator {
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
   * ホワイトノイズバッファを生成
   * 完全にランダムな値を各サンプルに書き込む
   */
  private createNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * WhiteNoiseGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // ホワイトノイズ生成: 各サンプルに-1.0〜1.0のランダム値
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
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
      this.volume * WhiteNoiseGenerator.MAX_VOLUME,
      this.audioContext.currentTime,
      WhiteNoiseGenerator.FADE_TIME_CONSTANT
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
      WhiteNoiseGenerator.FADE_TIME_CONSTANT
    );

    // フェードアウト完了後に停止
    const stopTime = this.audioContext.currentTime + WhiteNoiseGenerator.FADE_TIME_CONSTANT * 5;
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
        this.volume * WhiteNoiseGenerator.MAX_VOLUME,
        this.audioContext.currentTime,
        WhiteNoiseGenerator.FADE_TIME_CONSTANT
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
