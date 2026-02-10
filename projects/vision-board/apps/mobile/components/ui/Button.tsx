import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LucideIcon } from './LucideIcon';
import { colors } from '../../constants/Colors';

type ButtonVariant = 'primary' | 'outline' | 'destructive' | 'icon' | 'fullscreen';

interface ButtonProps {
  variant?: ButtonVariant;
  label?: string;
  icon?: string;
  iconColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'flex-row items-center justify-center gap-1.5 rounded-lg p-4 bg-accent-primary',
  outline: 'flex-row items-center gap-1.5 rounded-lg p-4 border border-border',
  destructive: 'flex-row items-center gap-1.5 rounded-lg p-4 bg-destructive',
  icon: 'w-12 h-12 items-center justify-center rounded-full border border-border',
  fullscreen: 'w-11 h-11 items-center justify-center rounded-full overflow-hidden',
};

export function Button({
  variant = 'primary',
  label,
  icon,
  iconColor,
  onPress,
  disabled = false,
  className = '',
}: ButtonProps) {
  const iconSize = variant === 'icon' ? 20 : variant === 'fullscreen' ? 20 : 16;
  const resolvedIconColor = iconColor ?? (variant === 'outline' ? colors.text.primary : '#FFFFFF');

  if (variant === 'fullscreen') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className={`${variantStyles.fullscreen} ${disabled ? 'opacity-50' : 'active:opacity-70'} ${className}`}
      >
        <BlurView intensity={12} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View className="absolute inset-0 bg-white/10" />
        {icon && <LucideIcon name={icon} size={iconSize} color="#FFFFFFCC" />}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${variantStyles[variant]} ${disabled ? 'opacity-50' : 'active:opacity-70'} ${className}`}
    >
      {icon && <LucideIcon name={icon} size={iconSize} color={resolvedIconColor} />}
      {label && (
        <Text className="text-sm font-semibold text-white">
          {label}
        </Text>
      )}
    </Pressable>
  );
}
