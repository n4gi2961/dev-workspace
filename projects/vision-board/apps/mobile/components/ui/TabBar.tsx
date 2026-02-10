import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LucideIcon } from './LucideIcon';
import { colors } from '../../constants/Colors';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Top gradient fade */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)']}
        className="h-4"
      />

      {/* Blur background */}
      <BlurView
        intensity={30}
        tint="dark"
        style={{ paddingBottom: insets.bottom }}
      >
        {/* Top border line */}
        <View className="border-t border-white/[0.06]" />

        {/* Tab items */}
        <View className="flex-row items-center px-2 h-[62px]">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const iconName =
              (options as { tabBarIconName?: string }).tabBarIconName ??
              'circle';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className="flex-1 items-center gap-1 py-2"
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
              >
                <LucideIcon
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  className={`text-xs ${
                    isFocused ? 'font-semibold' : 'font-medium'
                  }`}
                  style={{
                    color: isFocused ? colors.accent.primary : colors.text.tertiary,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
