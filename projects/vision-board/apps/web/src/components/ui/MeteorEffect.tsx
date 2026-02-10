'use client';

import { MeteorInstance } from '@vision-board/shared/hooks';

interface MeteorEffectProps {
  meteors: MeteorInstance[];
}

/**
 * Visual component for meteor (shooting star) effect
 * Renders meteors flowing from top-left to bottom-right
 */
export const MeteorEffect = ({ meteors }: MeteorEffectProps) => {
  if (meteors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {meteors.map((meteor) => {
        // Calculate position based on progress
        // Start: top-left (-10%, -10%)
        // End: bottom-right (110%, 110%)
        const startX = -10 + meteor.startOffset;
        const startY = -10 + meteor.startOffset;
        const endX = 110;
        const endY = 110;

        const currentX = startX + (endX - startX) * (meteor.progress / 100);
        const currentY = startY + (endY - startY) * (meteor.progress / 100);

        // Tail length and opacity based on progress
        const tailLength = Math.min(meteor.progress * 2, 50); // Max 50%
        const opacity = meteor.progress < 80 ? 1 : (100 - meteor.progress) / 20;

        return (
          <div
            key={meteor.id}
            className="absolute"
            style={{
              left: `${currentX}%`,
              top: `${currentY}%`,
              opacity,
            }}
          >
            {/* Meteor head (bright point) */}
            <div
              className="absolute rounded-full"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: meteor.color,
                boxShadow: `0 0 20px 8px ${meteor.color}, 0 0 40px 16px ${meteor.color}10`,
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* Meteor tail (gradient line) */}
            <div
              className="absolute"
              style={{
                width: `${tailLength * 1.5}px`,
                height: '3px',
                background: `linear-gradient(to left, ${meteor.color}, ${meteor.color}80, ${meteor.color}40, transparent)`,
                transform: 'translate(-100%, -50%) rotate(45deg)',
                transformOrigin: 'right center',
              }}
            />

            {/* Secondary sparkle trail */}
            <div
              className="absolute"
              style={{
                width: `${tailLength * 0.8}px`,
                height: '1px',
                background: `linear-gradient(to left, white, ${meteor.color}60, transparent)`,
                transform: 'translate(-100%, -50%) rotate(45deg)',
                transformOrigin: 'right center',
                marginTop: '-2px',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
