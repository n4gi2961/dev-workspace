import { Pressable, Text, View } from 'react-native';
import { LucideIcon } from './LucideIcon';

interface FABProps {
  icon?: string;
  onPress?: () => void;
  className?: string;
}

export function FAB({ icon = 'plus', onPress, className = '' }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-14 h-14 rounded-full bg-accent-primary items-center justify-center active:opacity-80 ${className}`}
    >
      <LucideIcon name={icon} size={24} color="#FFFFFF" />
    </Pressable>
  );
}

interface FABMenuItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
}

export function FABMenuItem({ icon, label, onPress }: FABMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 h-11 rounded-xl px-4 py-2.5 active:opacity-70"
      style={{ backgroundColor: '#1F1F2EE0' }}
    >
      <LucideIcon name={icon} size={20} color="#FFFFFF" />
      <Text className="text-sm font-medium text-white">{label}</Text>
    </Pressable>
  );
}
