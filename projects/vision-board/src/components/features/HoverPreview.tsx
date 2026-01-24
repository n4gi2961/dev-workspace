'use client';

import { useRef, useCallback } from 'react';
import { Square, Check, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HOVER_FONT_CONFIG } from '@/constants/styles';
import { HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { getTodayString } from '@/lib/utils';
import { FourPointStar } from '@/components/ui/FourPointStar';
import { usePopAnimationMap } from '@/hooks/usePopAnimation';
import { useClearPercent } from '@/hooks/useClearPercent';
import { useBlurRipple } from '@/hooks/useBlurRipple';
import { BlurRippleEffect } from '@/components/ui/BlurRippleEffect';

interface HoverPreviewProps {
  node: any;
  page: any;
  onToggleRoutine: (nodeId: string, routineId: string, date: string) => void;
  fontSize: string;
  textColor: string;
}

export const HoverPreview = ({ node, page, onToggleRoutine, fontSize, textColor }: HoverPreviewProps) => {
  const t = useTranslations('hoverPreview');
  const tCommon = useTranslations('common');
  const todayString = getTodayString();
  const fontConfig = HOVER_FONT_CONFIG[fontSize as keyof typeof HOVER_FONT_CONFIG] || HOVER_FONT_CONFIG[HOVER_FONT_SIZES.MEDIUM];
  const color = textColor === HOVER_TEXT_COLORS.BLACK ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
  const mutedColor = textColor === HOVER_TEXT_COLORS.BLACK ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';

  // Pop animation for routine check
  const { trigger: triggerAnimation, getStyle } = usePopAnimationMap();

  // Blur ripple animation
  const { ripple, trigger: triggerRipple } = useBlurRipple({ duration: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate blur value from clearPercent
  // ルーティンが0個の場合はブラー0px
  const { getBlurValue, calculateAfterToggle } = useClearPercent();
  const clearPercent = node.clearPercent ?? 0;
  const hasRoutines = (page.routines || []).length > 0;
  const blurValue = hasRoutines ? getBlurValue(clearPercent) : 0;

  const todayRoutines = (page.routines || []).map((r: any) => ({
    ...r,
    todayChecked: r.history?.[todayString] || false,
  }));

  const allMilestones = page.milestones || [];

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 overflow-hidden rounded-lg">
      <BlurRippleEffect
        imageSrc={node.src}
        ripple={ripple}
        currentBlur={blurValue}
      />

      <div className="absolute inset-0 pt-10 px-4 pb-4 overflow-y-auto">
        <h3
          className="font-bold mb-3 drop-shadow-lg"
          style={{ fontSize: `${fontConfig.title}px`, color }}
        >
          {page.title || tCommon('untitled')}
        </h3>

        {todayRoutines.length > 0 && (
          <div className="mb-3">
            <p
              className="mb-2"
              style={{ fontSize: `${fontConfig.label}px`, color: mutedColor }}
            >
              {t('todayRoutines')}
            </p>
            <div className="space-y-1">
              {todayRoutines.map((routine: any) => (
                <button
                  key={routine.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger animation only when checking (not unchecking)
                    if (!routine.todayChecked) {
                      triggerAnimation(routine.id);

                      // Trigger blur ripple effect
                      const newClearPercent = calculateAfterToggle(
                        clearPercent,
                        page.routines || [],
                        page.frozenDates || [],
                        routine.id,
                        todayString,
                        true // isChecking
                      );
                      const fromBlur = blurValue;
                      const toBlur = getBlurValue(newClearPercent);
                      triggerRipple(e, containerRef, fromBlur, toBlur, routine.color || '#8b5cf6');
                    }
                    onToggleRoutine(node.id, routine.id, todayString);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 hover:bg-white/10 rounded px-1 py-0.5 transition-colors w-full text-left"
                >
                  <div
                    className="relative flex-shrink-0"
                    style={{
                      width: fontConfig.icon,
                      height: fontConfig.icon,
                      ...getStyle(routine.id),
                    }}
                  >
                    {routine.todayChecked ? (
                      <FourPointStar
                        size={fontConfig.icon}
                        color={routine.color || '#8b5cf6'}
                        className="absolute inset-0"
                      />
                    ) : (
                      <Square
                        style={{
                          width: fontConfig.icon,
                          height: fontConfig.icon,
                          color: routine.color || '#8b5cf6',
                          opacity: 0.5
                        }}
                        className="absolute inset-0"
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: `${fontConfig.text}px`,
                      color: routine.todayChecked ? mutedColor : color,
                      textDecoration: routine.todayChecked ? 'line-through' : 'none'
                    }}
                  >
                    {routine.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {allMilestones.length > 0 && (
          <div>
            <p
              className="mb-2"
              style={{ fontSize: `${fontConfig.label}px`, color: mutedColor }}
            >
              {t('milestones')}
            </p>
            <div className="space-y-1">
              {allMilestones.map((milestone: any) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-2 px-1 py-0.5 ${
                    milestone.completed ? 'opacity-50' : ''
                  }`}
                >
                  {milestone.completed ? (
                    <div
                      className="flex-shrink-0 rounded-full bg-emerald-500/30 flex items-center justify-center"
                      style={{ width: fontConfig.icon, height: fontConfig.icon }}
                    >
                      <Check style={{ width: fontConfig.icon - 4, height: fontConfig.icon - 4 }} className="text-emerald-400" />
                    </div>
                  ) : (
                    <Target style={{ width: fontConfig.icon, height: fontConfig.icon }} className="text-violet-400 flex-shrink-0" />
                  )}
                  <span
                    style={{
                      fontSize: `${fontConfig.text}px`,
                      color: milestone.completed ? mutedColor : color,
                      textDecoration: milestone.completed ? 'line-through' : 'none'
                    }}
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayRoutines.length === 0 && allMilestones.length === 0 && (
          <p style={{ fontSize: `${fontConfig.text}px`, color: mutedColor }}>
            {t('editHint')}
          </p>
        )}
      </div>
    </div>
  );
};
