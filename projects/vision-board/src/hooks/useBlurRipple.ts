'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 波紋エフェクトの状態
 */
export interface RippleState {
  /** 波紋が活性中かどうか */
  isActive: boolean;
  /** クリック位置（パーセンテージ） */
  origin: { x: number; y: number };
  /** 現在の円の半径（パーセンテージ、0-150） */
  radius: number;
  /** 変更前のブラー値 */
  fromBlur: number;
  /** 変更後のブラー値 */
  toBlur: number;
  /** 波紋の色 */
  color: string;
}

/**
 * 波紋エフェクトのオプション
 */
export interface BlurRippleOptions {
  /** アニメーション時間（ms）デフォルト: 1000 */
  duration?: number;
}

/**
 * 波紋エフェクトフックの戻り値
 */
export interface UseBlurRippleReturn {
  /** 現在の波紋状態 */
  ripple: RippleState | null;
  /** 波紋をトリガー */
  trigger: (
    event: React.MouseEvent,
    containerRef: React.RefObject<HTMLElement | null>,
    fromBlur: number,
    toBlur: number,
    color: string
  ) => void;
}

/**
 * ease-out cubic イージング関数
 * 序盤で大きく進み、終盤で自然に減速
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * ブラー値変化時の波紋エフェクトフック
 * クリック位置から円形に広がり、内側が新しいブラー値になる
 */
export function useBlurRipple(options: BlurRippleOptions = {}): UseBlurRippleReturn {
  const { duration = 1000 } = options;

  const [ripple, setRipple] = useState<RippleState | null>(null);
  const animationRef = useRef<number | null>(null);

  const trigger = useCallback(
    (
      event: React.MouseEvent,
      containerRef: React.RefObject<HTMLElement | null>,
      fromBlur: number,
      toBlur: number,
      color: string
    ) => {
      // 既存アニメーションをキャンセル
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // クリック位置を相対座標（%）に変換
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        // 0% -> 150%（画面全体をカバー）
        const radius = eased * 150;

        setRipple({
          isActive: true,
          origin: { x, y },
          radius,
          fromBlur,
          toBlur,
          color,
        });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // アニメーション完了
          setRipple(null);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [duration]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { ripple, trigger };
}
