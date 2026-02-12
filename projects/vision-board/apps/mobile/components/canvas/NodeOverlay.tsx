import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Circle, CheckCircle2 } from 'lucide-react-native';
import type { Routine, Milestone } from '@vision-board/shared/lib';
import { parseTimerParts } from '../../lib/parseTimerMinutes';

export interface OverlayData {
  title: string;
  routines: Routine[];
  milestones: Milestone[];
  clearPercent: number;
  hoverFontSize?: string;
}

interface NodeOverlayProps {
  data: OverlayData;
  nodeWidth: number;
  nodeHeight: number;
  cornerRadius?: number;
  today: string;
  onToggleRoutine: (routine: Routine) => void;
  onStartTimer?: (routine: Routine) => void;
}

export function NodeOverlay({
  data,
  nodeWidth,
  nodeHeight,
  cornerRadius = 12,
  today,
  onToggleRoutine,
  onStartTimer,
}: NodeOverlayProps) {
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
        {data.routines.length > 0 && (
          <View style={{ marginBottom: padding }}>
            <Text style={[styles.sectionLabel, { fontSize: labelSize, marginBottom: padding * 0.6 }]}>
              今日できること
            </Text>
            {data.routines.map((routine) => {
              const isChecked = !!routine.history[today];
              const timerParts = onStartTimer ? parseTimerParts(routine.title) : null;
              return (
                <TouchableOpacity
                  key={routine.id}
                  onPress={() => onToggleRoutine(routine)}
                  activeOpacity={0.7}
                  style={[styles.routineItem, { paddingVertical: padding * 0.6, paddingHorizontal: padding * 0.8, marginBottom: 3 }]}
                >
                  {isChecked ? (
                    <CheckCircle2 size={iconSize} color={routine.color} fill={routine.color} />
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
