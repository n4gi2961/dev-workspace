'use client';

import { RippleState } from '@/hooks/useBlurRipple';

interface BlurRippleEffectProps {
  /** 背景画像URL */
  imageSrc: string;
  /** 波紋状態（useBlurRippleから） */
  ripple: RippleState | null;
  /** 現在のブラー値（波紋非活性時に使用） */
  currentBlur: number;
}

/**
 * ブラー波紋エフェクトコンポーネント
 * 波紋活性時は2レイヤー構造で、clip-pathによる円形マスクで遷移を表現
 */
export const BlurRippleEffect = ({
  imageSrc,
  ripple,
  currentBlur,
}: BlurRippleEffectProps) => {
  // 波紋非活性時は通常表示
  if (!ripple) {
    return (
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageSrc})`,
          filter: `blur(${currentBlur}px) brightness(0.6)`,
          transform: 'scale(1.1)',
        }}
      />
    );
  }

  // 波紋活性時は2レイヤー構造 + 白い円形の線
  return (
    <>
      {/* 基底レイヤー: 変更前ブラー */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageSrc})`,
          filter: `blur(${ripple.fromBlur}px) brightness(0.6)`,
          transform: 'scale(1.1)',
        }}
      />

      {/* マスクレイヤー: 変更後ブラー + 円形clip-path */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageSrc})`,
          filter: `blur(${ripple.toBlur}px) brightness(0.6)`,
          transform: 'scale(1.1)',
          clipPath: `circle(${ripple.radius}% at ${ripple.origin.x}% ${ripple.origin.y}%)`,
          willChange: 'clip-path',
        }}
      />

      {/* 円形の線（ルーティンカラー） */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <circle
          cx={`${ripple.origin.x}%`}
          cy={`${ripple.origin.y}%`}
          r={`${ripple.radius}%`}
          fill="none"
          stroke={ripple.color}
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
      </svg>
    </>
  );
};
