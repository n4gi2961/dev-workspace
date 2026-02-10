/**
 * ============================================================
 * AudioEngine - Web Audio API コアエンジン
 * ============================================================
 *
 * 【概要】
 * Web Audio APIのAudioContextを管理し、全ての音声生成器で
 * 共有するための基盤モジュール。シングルトンパターンで実装。
 *
 * 【機能】
 * - AudioContextのライフサイクル管理
 * - マスターゲインノードによる全体音量制御
 * - ユーザーインタラクション後の自動resume
 *
 * 【依存関係】
 * - Web Audio API: AudioContext, GainNode
 * - 外部ライブラリ不要
 *
 * 【使用例】
 * ```typescript
 * import { AudioEngine } from './core/AudioEngine';
 *
 * const engine = AudioEngine.getInstance();
 * const ctx = engine.getContext();
 * const masterGain = engine.getMasterGain();
 *
 * // 音声ノードを接続
 * oscillator.connect(masterGain);
 *
 * // マスター音量を設定
 * engine.setMasterVolume(0.5);
 * ```
 * ============================================================
 */

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext;
  private masterGain: GainNode;

  private constructor() {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.5; // デフォルト50%
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * AudioContextを取得
   */
  getContext(): AudioContext {
    return this.audioContext;
  }

  /**
   * マスターゲインノードを取得（全音声の出力先）
   */
  getMasterGain(): GainNode {
    return this.masterGain;
  }

  /**
   * マスター音量を設定
   * @param volume 0.0 ~ 1.0
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setTargetAtTime(
      clampedVolume,
      this.audioContext.currentTime,
      0.015 // 15msの時定数でスムーズな変化
    );
  }

  /**
   * マスター音量を取得
   */
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /**
   * AudioContextが停止している場合は再開
   * ユーザーインタラクション後に呼び出す必要がある
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * AudioContextの状態を取得
   */
  getState(): AudioContextState {
    return this.audioContext.state;
  }
}

/**
 * ============================================================
 * SoundGenerator - 音声生成器の基底インターフェース
 * ============================================================
 *
 * 【概要】
 * 全ての音声生成器が実装すべきインターフェース。
 * 統一されたAPIで音声の制御を可能にする。
 *
 * 【使用例】
 * ```typescript
 * class MyGenerator implements SoundGenerator {
 *   start(): void { ... }
 *   stop(): void { ... }
 *   setVolume(volume: number): void { ... }
 *   getVolume(): number { ... }
 *   isPlaying(): boolean { ... }
 * }
 * ```
 * ============================================================
 */
export interface SoundGenerator {
  /** 再生開始 */
  start(): void;
  /** 再生停止 */
  stop(): void;
  /** 音量設定 (0.0 ~ 1.0) */
  setVolume(volume: number): void;
  /** 現在の音量を取得 */
  getVolume(): number;
  /** 再生中かどうか */
  isPlaying(): boolean;
}
