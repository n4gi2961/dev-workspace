import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Check, Circle, Layers } from 'lucide-react-native';
import { FourPointStar } from '../ui/FourPointStar';
import type { Routine, RoutineStack, Milestone } from '@vision-board/shared/lib';
import { parseTimerParts } from '../../lib/parseTimerMinutes';

export interface OverlayData {
  title: string;
  routines: Routine[];
  milestones: Milestone[];
  clearPercent: number;
  hoverFontSize?: string;
  stacks?: RoutineStack[];
}

interface NodeOverlayProps {
  data: OverlayData;
  nodeWidth: number;
  nodeHeight: number;
  cornerRadius?: number;
  today: string;
  onToggleRoutine: (routine: Routine, event: GestureResponderEvent) => void;
  onStartTimer?: (routine: Routine) => void;
  onToggleStack?: (stackId: string, positions: Array<{ routineId: string; x: number; y: number; color: string }>) => void;
}

export function NodeOverlay({
  data,
  nodeWidth,
  nodeHeight,
  cornerRadius = 12,
  today,
  onToggleRoutine,
  onStartTimer,
  onToggleStack,
}: NodeOverlayProps) {
  // スタック内ルーティンのチェックアイコンのView ref（位置計測用）
  const iconRefsRef = useRef<Record<string, View | null>>({});

  const completedMilestones = data.milestones.filter((m) => m.completed);
  const pendingMilestones = data.milestones.filter((m) => !m.completed);

  // Scale font sizes based on node size and hoverFontSize setting
  const fontSizeMultiplier = data.hoverFontSize === 'large' ? 1.3 : data.hoverFontSize === 'small' ? 0.7 : 1.0;
  const scaleFactor = Math.max(nodeWidth / 250, 0.6) * fontSizeMultiplier;
  const titleSize = Math.round(18 * scaleFactor);
  const labelSize = Math.round(11 * scaleFactor);
  const routineSize = Math.round(13 * scaleFactor);
  const milestoneSize = Math.round(12 * scaleFactor);
  const iconSize = Math.round(16 * scaleFactor);
  const padding = Math.round(10 * scaleFactor);

  // スタックIDをキーにしたルーティンマップ
  const stackRoutineMap = useMemo(() => {
    const map: Record<string, Routine[]> = {};
    if (!data.stacks) return map;
    for (const stack of data.stacks) {
      map[stack.id] = data.routines
        .filter((r) => r.stackId === stack.id)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
    }
    return map;
  }, [data.routines, data.stacks]);

  // スタック未所属ルーティン
  const standaloneRoutines = useMemo(
    () => data.routines.filter((r) => !r.stackId),
    [data.routines],
  );

  return (
    <View
      style={[
        styles.container,
        { borderRadius: cornerRadius },
      ]}
    >
      {/* Dark scrim */}
      <View style={styles.scrim} pointerEvents="none" />

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Title */}
        {data.title ? (
          <Text
            style={[
              styles.title,
              { fontSize: titleSize, marginBottom: padding * 2 },
            ]}
            numberOfLines={2}
          >
            {data.title}
          </Text>
        ) : null}

        {/* Routines section */}
        {(standaloneRoutines.length > 0 || (data.stacks && data.stacks.length > 0)) && (
          <View style={{ marginBottom: padding }}>
            <Text style={[styles.sectionLabel, { fontSize: labelSize, marginBottom: padding * 0.6 }]}>
              今日できること
            </Text>

            {/* スタック未所属ルーティン */}
            {standaloneRoutines.map((routine) => {
              const isChecked = !!routine.history[today];
              const timerParts = onStartTimer ? parseTimerParts(routine.title) : null;
              return (
                <TouchableOpacity
                  key={routine.id}
                  onPress={(event) => onToggleRoutine(routine, event)}
                  activeOpacity={0.7}
                  style={[styles.routineItem, { paddingVertical: padding * 0.6, paddingHorizontal: padding * 0.8, marginBottom: 3 }]}
                >
                  {isChecked ? (
                    <FourPointStar size={iconSize} color={routine.color} />
                  ) : (
                    <Circle size={iconSize} color="rgba(255,255,255,0.5)" />
                  )}
                  <Text
                    style={[
                      styles.routineText,
                      {
                        fontSize: routineSize,
                        marginLeft: padding * 0.8 + routineSize * 0.5,
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                        opacity: isChecked ? 0.6 : 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {timerParts ? (
                      <>
                        {timerParts.before}
                        <Text
                          onPress={() => onStartTimer!(routine)}
                          style={{ color: '#0095F6', fontWeight: '700' }}
                        >
                          {timerParts.number}
                        </Text>
                        {timerParts.after}
                      </>
                    ) : (
                      routine.title
                    )}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* スタック表示 */}
            {data.stacks?.map((stack) => {
              const stackRoutines = stackRoutineMap[stack.id] ?? [];
              const allChecked = stackRoutines.length > 0 && stackRoutines.every((r) => !!r.history[today]);
              const someChecked = !allChecked && stackRoutines.some((r) => !!r.history[today]);
              const btnSize = Math.round(26 * scaleFactor);
              const stackLabelSize = Math.round(11 * scaleFactor);

              return (
                <View key={stack.id} style={{ marginBottom: padding * 0.5 }}>
                  {/* スタックヘッダー */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: padding * 0.8,
                    height: Math.round(30 * scaleFactor),
                    marginBottom: 2,
                  }}>
                    <Layers size={stackLabelSize} color="#6366F1" style={{ marginRight: 4 }} />
                    <Text
                      style={{
                        flex: 1,
                        color: '#6366F1',
                        fontSize: stackLabelSize,
                        fontWeight: '700',
                      }}
                      numberOfLines={1}
                    >
                      {stack.title || '無題のスタック'}
                    </Text>
                    {/* 一括チェックボタン（3状態） */}
                    <TouchableOpacity
                      onPress={() => {
                        const total = stackRoutines.length;
                        if (total === 0 || !onToggleStack) return;
                        const positions: Array<{ routineId: string; x: number; y: number; color: string }> =
                          new Array(total).fill(null);
                        let done = 0;
                        const onMeasured = () => {
                          done++;
                          if (done === total) onToggleStack(stack.id, positions);
                        };
                        stackRoutines.forEach((routine, i) => {
                          const iconRef = iconRefsRef.current[routine.id];
                          if (iconRef) {
                            iconRef.measureInWindow((x, y, w, h) => {
                              positions[i] = { routineId: routine.id, x: x + w / 2, y: y + h / 2, color: routine.color || '#6366F1' };
                              onMeasured();
                            });
                          } else {
                            positions[i] = { routineId: routine.id, x: 0, y: 0, color: routine.color || '#6366F1' };
                            onMeasured();
                          }
                        });
                      }}
                      activeOpacity={0.7}
                      style={{
                        width: btnSize,
                        height: btnSize,
                        borderRadius: btnSize / 2,
                        backgroundColor: allChecked
                          ? '#6366F1'
                          : someChecked
                          ? '#6366F160'
                          : 'rgba(255,255,255,0.12)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {(allChecked || someChecked) && (
                        <Check size={Math.round(12 * scaleFactor)} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* 縦線 + スタック内ルーティン */}
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{
                      width: 2,
                      backgroundColor: '#6366F140',
                      marginLeft: padding * 0.8 + Math.round(5 * scaleFactor),
                      marginRight: padding * 0.6,
                      borderRadius: 1,
                    }} />
                    <View style={{ flex: 1 }}>
                      {stackRoutines.map((routine) => {
                        const isChecked = !!routine.history[today];
                        const timerParts = onStartTimer ? parseTimerParts(routine.title) : null;
                        return (
                          <TouchableOpacity
                            key={routine.id}
                            onPress={(event) => onToggleRoutine(routine, event)}
                            activeOpacity={0.7}
                            style={[styles.routineItem, { paddingVertical: padding * 0.6, paddingHorizontal: padding * 0.8, marginBottom: 3 }]}
                          >
                            <View ref={(r) => { iconRefsRef.current[routine.id] = r; }}>
                              {isChecked ? (
                                <FourPointStar size={iconSize} color={routine.color} />
                              ) : (
                                <Circle size={iconSize} color="rgba(255,255,255,0.5)" />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.routineText,
                                {
                                  fontSize: routineSize,
                                  marginLeft: padding * 0.8 + routineSize * 0.5,
                                  textDecorationLine: isChecked ? 'line-through' : 'none',
                                  opacity: isChecked ? 0.6 : 1,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {timerParts ? (
                                <>
                                  {timerParts.before}
                                  <Text
                                    onPress={() => onStartTimer!(routine)}
                                    style={{ color: '#0095F6', fontWeight: '700' }}
                                  >
                                    {timerParts.number}
                                  </Text>
                                  {timerParts.after}
                                </>
                              ) : (
                                routine.title
                              )}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Milestones section */}
        {data.milestones.length > 0 && (
          <View>
            <Text style={[styles.sectionLabel, { fontSize: labelSize, marginBottom: padding * 0.6 }]}>
              達成への道のり
            </Text>
            {[...completedMilestones, ...pendingMilestones].map((milestone) => (
              <View
                key={milestone.id}
                style={[styles.milestoneItem, { paddingVertical: padding * 0.5, paddingHorizontal: padding * 0.8 }]}
              >
                {milestone.completed ? (
                  <Check size={iconSize - 2} color="#10B981" />
                ) : (
                  <Circle size={iconSize - 2} color="rgba(255,255,255,0.35)" />
                )}
                <Text
                  style={[
                    styles.milestoneText,
                    {
                      fontSize: milestoneSize,
                      marginLeft: padding * 0.8,
                      color: milestone.completed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {milestone.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scroll: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sectionLabel: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  routineText: {
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  milestoneText: {
    fontWeight: '500',
    flex: 1,
  },
});
