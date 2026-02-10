import React from 'react';
import { View, Text } from 'react-native';
import { Moon } from 'lucide-react-native';
import { useColorScheme } from '../../../contexts/theme';
import { useI18n } from '../../../contexts/i18n';
import { TopBar } from '../../../components/navigation/TopBar';

export default function AmbientScreen() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* TopBar without Hamburger Menu */}
      <TopBar />

      {/* Coming Soon Content */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className={`w-24 h-24 rounded-full items-center justify-center mb-6 ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <Moon size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </View>
        <Text className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
          Coming Soon
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center leading-6">
          Ambient Mode will display your vision board images one by one,
          allowing you to check off routines as you visualize your goals.
        </Text>
      </View>
    </View>
  );
}
