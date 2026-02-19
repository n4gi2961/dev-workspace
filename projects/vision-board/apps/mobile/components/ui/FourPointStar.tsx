import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FourPointStarProps {
  size: number;
  color: string;
  strokeWidth?: number;
}

/**
 * 四芒星（4-pointed star）アウトラインアイコン
 * ルーティンチェック済み状態で使用
 */
export function FourPointStar({ size, color, strokeWidth = 1.8 }: FourPointStarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
