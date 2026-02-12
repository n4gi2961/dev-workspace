import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Timer, Play, Pause, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayString } from '@vision-board/shared/lib';
import { useTimer } from '../../../contexts/timer';
import { useNavigation } from '../../../contexts/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useRoutines } from '../../../hooks/useRoutines';
import { useI18n } from '../../../contexts/i18n';
import { CircularTimer } from '../../../components/timer/CircularTimer';
import { TimerCompletionOverlay } from '../../../components/timer/TimerCompletionOverlay';
import { colors } from '../../../constants/Colors';

// --- Time adjustment button ---

function AdjustButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        width: 60,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// --- Main Screen ---

export default function TimerScreen() {
  const {
    status,
    routineId,
    routineTitle,
    routineColor,
    totalSeconds,
    remainingSeconds,
    setupTimer,
    adjustTime,
    start,
    pause,
    stop,
    confirmCompletion,
  } = useTimer();
  const { selectedBoardId } = useNavigation();
  const { user } = useAuth();
  const { toggleRoutineCheck } = useRoutines(
    selectedBoardId,
    user?.id ?? null,
  );
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => getTodayString(), []);

  const handleConfirmCompletion = useCallback(async () => {
    // Auto-check the routine
    if (routineId) {
      await toggleRoutineCheck(routineId, today);
    }
    confirmCompletion();
  }, [routineId, toggleRoutineCheck, today, confirmCompletion]);

  // Auto-setup default 15min timer when no timer is configured
  useEffect(() => {
    if (totalSeconds === 0 && status === 'idle') {
      setupTimer(null, 15);
    }
  }, [totalSeconds, status, setupTimer]);

  // --- Completed state ---
  if (status === 'completed') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <TimerCompletionOverlay
          routineTitle={routineTitle}
          routineColor={routineColor}
          completedTitle={t.timer?.completed?.title || 'Complete!'}
          tapToConfirmLabel={
            t.timer?.completed?.tapToConfirm || 'Tap to confirm'
          }
          onConfirm={handleConfirmCompletion}
        />
      </View>
    );
  }

  // --- Idle / Running / Paused ---
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        alignItems: 'center',
        paddingTop: insets.top + 40,
      }}
    >
      {/* Routine title */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '500',
          color: colors.text.secondary,
          textAlign: 'center',
          paddingHorizontal: 32,
          marginBottom: 48,
        }}
        numberOfLines={2}
      >
        {routineTitle}
      </Text>

      {/* Circular timer */}
      <CircularTimer
        totalSeconds={totalSeconds}
        remainingSeconds={remainingSeconds}
        status={status}
        color={routineColor || colors.accent.primary}
      />

      {/* Controls area */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {status === 'idle' && (
          <>
            {/* Time adjustment buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginBottom: 40,
              }}
            >
              <AdjustButton label="-5" onPress={() => adjustTime(-5)} />
              <AdjustButton label="-1" onPress={() => adjustTime(-1)} />
              <AdjustButton label="+1" onPress={() => adjustTime(1)} />
              <AdjustButton label="+5" onPress={() => adjustTime(5)} />
            </View>

            {/* Start button */}
            <TouchableOpacity
              onPress={start}
              activeOpacity={0.7}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: routineColor || colors.accent.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play
                size={32}
                color="#FFFFFF"
                fill="#FFFFFF"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 14,
                color: colors.text.tertiary,
                marginTop: 12,
              }}
            >
              {t.timer?.idle?.start || 'Start'}
            </Text>
          </>
        )}

        {status === 'running' && (
          <View style={{ flexDirection: 'row', gap: 32 }}>
            {/* Pause */}
            <TouchableOpacity
              onPress={pause}
              activeOpacity={0.7}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pause size={28} color={colors.text.primary} fill={colors.text.primary} />
            </TouchableOpacity>

            {/* Stop */}
            <TouchableOpacity
              onPress={stop}
              activeOpacity={0.7}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(239,68,68,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Square size={24} color={colors.destructive} fill={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}

        {status === 'paused' && (
          <View style={{ flexDirection: 'row', gap: 32 }}>
            {/* Resume */}
            <TouchableOpacity
              onPress={start}
              activeOpacity={0.7}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: routineColor || colors.accent.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play
                size={28}
                color="#FFFFFF"
                fill="#FFFFFF"
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            {/* Stop */}
            <TouchableOpacity
              onPress={stop}
              activeOpacity={0.7}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(239,68,68,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Square size={24} color={colors.destructive} fill={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
