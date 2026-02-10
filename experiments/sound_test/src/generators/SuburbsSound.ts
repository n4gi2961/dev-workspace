/**
 * ============================================================
 * Suburbs Sound Generator - 郊外の環境音生成器
 * ============================================================
 *
 * 【科学的背景】
 * 雨音はYouTubeで約3.99億回再生を記録する人気環境音。
 * ピンクノイズ（1/fノイズ）特性を持ち、「穏やかな雨のような
 * 柔らかく自然な音響」を生成する。
 *
 * - 周波数特性: -3dB/オクターブ減衰（ピンクノイズ）
 * - 音の印象: 屋根に降る雨、遠くの雨音、雨の日の室内
 * - 効果: リラックス、睡眠導入（睡眠改善効果81.9%）
 *
 * 【実装原理】
 * 1. ピンクノイズをベースに使用（Paul Kelletアルゴリズム）
 *    → 自然な1/fゆらぎで人間の生体リズムと共鳴
 * 2. ローパスフィルター（800Hz）で高周波をカット
 *    → 雨粒のシャープさを抑え、低音の包み込む感覚を強調
 * 3. LFO（0.15Hz）で緩やかな強弱
 *    → 雨脚の自然な変化を表現
 *
 * 【パラメータ】
 * - ベース: ピンクノイズ（Paul Kellet係数、ゲイン0.11）
 * - ローパスカットオフ: 800Hz（推奨範囲の下限）
 * - LFO周波数: 0.15Hz（約6.7秒周期）
 * - LFO深度: 0.25（25%の音量変動）
 * - 最大音量係数: 0.4（100%時に40%出力）
 *
 * 【依存関係】
 * - import: SoundGenerator from '../core/AudioEngine'
 * - Web Audio API: AudioContext, AudioBuffer, AudioBufferSourceNode,
 *                  BiquadFilterNode, GainNode, OscillatorNode
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from '../core/AudioEngine';
 * import { SuburbsSoundGenerator } from './RainSound002';
 *
 * const engine = AudioEngine.getInstance();
 * const rain = new SuburbsSoundGenerator(engine.getContext(), engine.getMasterGain());
 *
 * rain.start();
 * rain.setVolume(0.5); // 表示50% → 実出力20%
 * // ...
 * rain.stop();
 * ```
 * ============================================================
 */

import { SoundGenerator } from '../core/AudioEngine';

export class SuburbsSoundGenerator implements SoundGenerator {
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
  // 定数（調整可能なパラメータ）
  // ============================================================

  /** バッファ長（秒）- 長いほどループ感が減るがメモリ消費増 */
  private static readonly BUFFER_DURATION = 2;

  /** フェード時定数（秒）- クリック音防止 */
  private static readonly FADE_TIME_CONSTANT = 0.015;

  /** ローパスカットオフ周波数（Hz）- 低いほど低音重視 */
  private static readonly LOWPASS_FREQUENCY = 800;

  /** ローパスQ値 - 高いとカットオフ付近が強調される */
  private static readonly LOWPASS_Q = 0.7;

  /** LFO周波数（Hz）- 雨脚の変化速度 */
  private static readonly LFO_FREQUENCY = 0.15;

  /** LFO深度（0-1）- 音量変動の大きさ */
  private static readonly LFO_DEPTH = 0.25;

  /** 最大音量係数 - スライダー100%時の実出力 */
  private static readonly MAX_VOLUME = 0.4;

  /** ピンクノイズのゲイン補正（Paul Kellet係数用） */
  private static readonly PINK_NOISE_GAIN = 0.11;

  constructor(audioContext: AudioContext, destinationNode: AudioNode) {
    this.audioContext = audioContext;
    this.destinationNode = destinationNode;

    // ============================================================
    // オーディオグラフ構築
    // Source(PinkNoise) -> Lowpass -> LfoGain -> GainNode -> Destination
    // ============================================================

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.destinationNode);

    this.lfoGain = this.audioContext.createGain();
    this.lfoGain.connect(this.gainNode);

    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = SuburbsSoundGenerator.LOWPASS_FREQUENCY;
    this.filter.Q.value = SuburbsSoundGenerator.LOWPASS_Q;
    this.filter.connect(this.lfoGain);

    // ピンクノイズバッファを生成
    this.noiseBuffer = this.createPinkNoiseBuffer();
  }

  /**
   * ピンクノイズバッファを生成（Paul Kelletアルゴリズム）
   *
   * ピンクノイズは周波数が高くなるごとにパワーが3dB/オクターブ減衰。
   * 6つの1次IIRフィルターを並列に使用してホワイトノイズをフィルタリング。
   */
  private createPinkNoiseBuffer(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * SuburbsSoundGenerator.BUFFER_DURATION;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kelletアルゴリズムの状態変数
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      // ホワイトノイズ入力
      const white = Math.random() * 2 - 1;

      // Paul Kelletフィルター係数
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      // 出力合成（ゲイン補正込み）
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362)
                * SuburbsSoundGenerator.PINK_NOISE_GAIN;

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
    this.sourceNode.connect(this.filter);

    // LFOで音量変調
    const scaledVolume = this.volume * SuburbsSoundGenerator.MAX_VOLUME;

    this.lfo = this.audioContext.createOscillator();
    this.lfo.frequency.value = SuburbsSoundGenerator.LFO_FREQUENCY;

    this.lfoGainControl = this.audioContext.createGain();
    this.lfoGainControl.gain.value = SuburbsSoundGenerator.LFO_DEPTH * scaledVolume;
    this.lfo.connect(this.lfoGainControl);
    this.lfoGainControl.connect(this.lfoGain.gain);

    // ベース音量（LFO変動の中心値）
    this.lfoGain.gain.value = scaledVolume * (1 - SuburbsSoundGenerator.LFO_DEPTH);

    // フェードイン
    this.gainNode.gain.setTargetAtTime(
      1,
      this.audioContext.currentTime,
      SuburbsSoundGenerator.FADE_TIME_CONSTANT
    );

    this.sourceNode.start();
    this.lfo.start();
    this.playing = true;
  }

  /**
   * 再生停止
   */
  stop(): void {
    if (!this.playing) return;

    // フェードアウト
    this.gainNode.gain.setTargetAtTime(
      0,
      this.audioContext.currentTime,
      SuburbsSoundGenerator.FADE_TIME_CONSTANT
    );

    // フェードアウト完了後に停止
    const stopTime = this.audioContext.currentTime + SuburbsSoundGenerator.FADE_TIME_CONSTANT * 5;
    this.sourceNode?.stop(stopTime);
    this.lfo?.stop(stopTime);

    this.sourceNode = null;
    this.lfo = null;
    this.lfoGainControl = null;
    this.playing = false;
  }

  /**
   * 音量設定
   * @param volume 0.0 ~ 1.0（表示値、実出力はMAX_VOLUMEで制限）
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.playing) {
      const scaledVolume = this.volume * SuburbsSoundGenerator.MAX_VOLUME;

      this.lfoGain.gain.setTargetAtTime(
        scaledVolume * (1 - SuburbsSoundGenerator.LFO_DEPTH),
        this.audioContext.currentTime,
        SuburbsSoundGenerator.FADE_TIME_CONSTANT
      );

      if (this.lfoGainControl) {
        this.lfoGainControl.gain.setTargetAtTime(
          SuburbsSoundGenerator.LFO_DEPTH * scaledVolume,
          this.audioContext.currentTime,
          SuburbsSoundGenerator.FADE_TIME_CONSTANT
        );
      }
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
