import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { useColorScheme } from '../../contexts/theme';

interface TopBarProps {
  showMenuButton?: boolean;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({
  showMenuButton = false,
  onMenuPress,
  rightAction,
}: TopBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fixed height for consistent layout across all tabs
  const BAR_HEIGHT = 44;

  return (
    <View
      className={`flex-row items-center justify-between px-4 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}
      style={{
        paddingTop: insets.top,
        height: insets.top + BAR_HEIGHT,
      }}
    >
      {/* Left: Menu Button or Spacer (same size to maintain layout) */}
      <View className="w-10 h-10 items-center justify-center">
        {showMenuButton && (
          <Pressable
            onPress={onMenuPress}
            className={`p-2 rounded-lg active:opacity-70 ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-100'
            }`}
            accessibilityLabel="Open menu"
            accessibilityRole="button"
          >
            <Menu
              size={24}
              color={isDark ? '#D1D5DB' : '#374151'}
            />
          </Pressable>
        )}
      </View>

      {/* Center: Empty (title removed) */}
      <View className="flex-1" />

      {/* Right: Custom Action or Spacer (same size to maintain layout) */}
      <View className="w-10 h-10 items-center justify-center">
        {rightAction}
      </View>
    </View>
  );
}
