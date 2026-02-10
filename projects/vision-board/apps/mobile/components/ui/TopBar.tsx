import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from './LucideIcon';

interface TopBarProps {
  title?: string;
  leftIcon?: string;
  onLeftPress?: () => void;
  showLeft?: boolean;
  rightIcon?: string;
  rightIconColor?: string;
  onRightPress?: () => void;
  showRight?: boolean;
  titleAlign?: 'center' | 'start';
}

export function TopBar({
  title = '',
  leftIcon = 'menu',
  onLeftPress,
  showLeft = true,
  rightIcon = 'sparkles',
  rightIconColor = '#FFFFFF',
  onRightPress,
  showRight = true,
  titleAlign = 'center',
}: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-4"
      style={{ paddingTop: insets.top, height: insets.top + 56 }}
    >
      {/* Left button */}
      <View className="w-12 h-12 items-center justify-center">
        {showLeft && (
          <Pressable
            onPress={onLeftPress}
            className="w-12 h-12 items-center justify-center active:opacity-70"
          >
            <LucideIcon name={leftIcon} size={28} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Center title */}
      <View
        className={`flex-1 h-11 justify-center ${
          titleAlign === 'center' ? 'items-center' : 'items-start'
        }`}
      >
        {title ? (
          <Text className="text-xl font-semibold text-white">{title}</Text>
        ) : null}
      </View>

      {/* Right button */}
      <View className="w-12 h-12 items-center justify-center">
        {showRight && (
          <Pressable
            onPress={onRightPress}
            className="w-12 h-12 items-center justify-center active:opacity-70"
          >
            <LucideIcon name={rightIcon} size={28} color={rightIconColor} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
