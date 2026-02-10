import { View, Text, Pressable } from 'react-native';
import { StatusBadge } from './StatusBadge';

interface ListItemProps {
  title: string;
  meta?: string;
  status?: 'none' | 'active' | 'complete';
  onPress?: () => void;
  onStatusPress?: () => void;
}

export function ListItem({
  title,
  meta,
  status = 'none',
  onPress,
  onStatusPress,
}: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 p-4 w-full active:opacity-70"
    >
      {status !== 'none' && (
        <StatusBadge
          variant={status === 'complete' ? 'complete' : 'active'}
          onPress={onStatusPress}
        />
      )}
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-txt-primary">{title}</Text>
        {meta && (
          <Text className="text-xs text-txt-tertiary">{meta}</Text>
        )}
      </View>
    </Pressable>
  );
}
