import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffects } from '../../hooks/useFocusEffects';
import { MeteorEffect } from '../focus/MeteorEffect';
import { colors } from '../../constants/Colors';

interface TimerCompletionOverlayProps {
  routineTitle: string;
  routineColor: string;
  completedTitle: string;
  tapToConfirmLabel: string;
  onConfirm: () => void;
}

export const TimerCompletionOverlay = React.memo(function TimerCompletionOverlay({
  routineTitle,
  routineColor,
  completedTitle,
  tapToConfirmLabel,
  onConfirm,
}: TimerCompletionOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const effects = useFocusEffects(screenWidth, screenHeight);
  const [confirmed, setConfirmed] = React.useState(false);

  const handleConfirm = React.useCallback(() => {
    if (confirmed) return;
    setConfirmed(true);

    // Meteor effect
    effects.triggerMeteor(routineColor || '#fbbf24');

    // Delay then complete
    setTimeout(() => {
      onConfirm();
    }, 1500);
  }, [confirmed, routineColor, effects, onConfirm]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Title */}
      <Text
        style={{
          fontSize: 32,
          fontWeight: '700',
          color: colors.text.primary,
          marginBottom: 12,
        }}
      >
        {completedTitle}
      </Text>

      {/* Routine name */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '500',
          color: colors.text.secondary,
          marginBottom: 48,
          textAlign: 'center',
          paddingHorizontal: 32,
        }}
      >
        {routineTitle}
      </Text>

      {/* Check button */}
      <TouchableOpacity
        onPress={handleConfirm}
        activeOpacity={0.7}
        disabled={confirmed}
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: confirmed
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CheckCircle2
          size={80}
          color={confirmed ? routineColor : colors.accent.primary}
          fill={confirmed ? routineColor : 'transparent'}
        />
      </TouchableOpacity>

      {/* Hint */}
      {!confirmed && (
        <Text
          style={{
            fontSize: 14,
            color: colors.text.tertiary,
            marginTop: 24,
          }}
        >
          {tapToConfirmLabel}
        </Text>
      )}

      {/* Meteor Effect Layer */}
      <MeteorEffect
        meteorProgress={effects.meteorProgress}
        meteorActive={effects.meteorActive}
        meteorColor={effects.meteorColor}
        meteorStartOffset={effects.meteorStartOffset}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
      />
    </View>
  );
});
