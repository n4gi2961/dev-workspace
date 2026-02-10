'use client';

interface FourPointStarProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * 4-pointed star filled icon matching the star stack 3D geometry
 * Creates a filled star with 4 outer points and 4 inner concave points
 */
export const FourPointStar = ({
  size = 14,
  className = '',
  color = 'currentColor'
}: FourPointStarProps) => {
  // Star geometry based on starGeometry.ts
  const outerRadius = 0.85;
  const innerRadius = 0.35;
  const center = 1;

  // Create the star path
  // 4 outer points at 0, 90, 180, 270 degrees
  // 4 inner points at 45, 135, 225, 315 degrees
  const points: string[] = [];

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2; // Start from top
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }

  const pathData = `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 2 2"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={pathData} />
    </svg>
  );
};
