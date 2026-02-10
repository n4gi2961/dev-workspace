import { Pressable, View } from 'react-native';
import { LucideIcon } from './LucideIcon';
import { colors } from '../../constants/Colors';

type StatusVariant = 'complete' | 'active' | 'empty';

interface StatusBadgeProps {
  variant?: StatusVariant;
  onPress?: () => void;
}

export function StatusBadge({ variant = 'empty', onPress }: StatusBadgeProps) {
  if (variant === 'complete') {
    return (
      <Pressable onPress={onPress} className="w-6 h-6 rounded-md items-center justify-center">
        <LucideIcon name="check" size={14} color="#FFFFFF" />
      </Pressable>
    );
  }

  if (variant === 'active') {
    return (
      <Pressable
        onPress={onPress}
        className="w-6 h-6 rounded-md items-center justify-center border-2"
        style={{
          borderColor: colors.accent.primary,
          backgroundColor: colors.accent.light,
        }}
      >
        <View
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.accent.primary }}
        />
      </Pressable>
    );
  }

  // empty
  return (
    <Pressable
      onPress={onPress}
      className="w-6 h-6 rounded-md border border-border"
    />
  );
}
