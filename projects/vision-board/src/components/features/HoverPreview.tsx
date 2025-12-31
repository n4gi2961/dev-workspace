import { CheckSquare, Square, Check, Target } from 'lucide-react';
import { HOVER_FONT_CONFIG } from '@/constants/styles';
import { HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { getTodayString } from '@/lib/utils';

interface HoverPreviewProps {
  node: any;
  page: any;
  onToggleRoutine: (nodeId: string, routineId: string, date: string) => void;
  darkMode: boolean;
  fontSize: string;
  textColor: string;
}

export const HoverPreview = ({ node, page, onToggleRoutine, darkMode, fontSize, textColor }: HoverPreviewProps) => {
  const todayString = getTodayString();
  const fontConfig = HOVER_FONT_CONFIG[fontSize] || HOVER_FONT_CONFIG[HOVER_FONT_SIZES.MEDIUM];
  const color = textColor === HOVER_TEXT_COLORS.BLACK ? '#000000' : '#ffffff';
  const mutedColor = textColor === HOVER_TEXT_COLORS.BLACK ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';

  const todayRoutines = (page.routines || []).map((r: any) => ({
    ...r,
    todayChecked: r.history?.[todayString] || false,
  }));

  const allMilestones = page.milestones || [];

  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${node.src})`,
          filter: 'blur(8px) brightness(0.4)',
          transform: 'scale(1.1)',
        }}
      />

      <div className="absolute inset-0 p-4 overflow-y-auto">
        <h3
          className="font-bold mb-3 drop-shadow-lg"
          style={{ fontSize: `${fontConfig.title}px`, color }}
        >
          {page.title || '無題'}
        </h3>

        {todayRoutines.length > 0 && (
          <div className="mb-3">
            <p
              className="mb-2"
              style={{ fontSize: `${fontConfig.label}px`, color: mutedColor }}
            >
              今日のルーティン
            </p>
            <div className="space-y-1">
              {todayRoutines.map((routine: any) => (
                <button
                  key={routine.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRoutine(node.id, routine.id, todayString);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 hover:bg-white/10 rounded px-1 py-0.5 transition-colors w-full text-left"
                >
                  {routine.todayChecked ? (
                    <CheckSquare style={{ width: fontConfig.icon, height: fontConfig.icon }} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Square style={{ width: fontConfig.icon, height: fontConfig.icon, color: mutedColor }} className="flex-shrink-0" />
                  )}
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
              マイルストーン
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
            ダブルクリックで編集
          </p>
        )}
      </div>
    </div>
  );
};
