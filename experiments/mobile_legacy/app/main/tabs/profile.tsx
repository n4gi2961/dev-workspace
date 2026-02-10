import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import {
  Languages,
  Sun,
  Moon,
  Smartphone,
  Bell,
  Info,
  LogOut,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../contexts/i18n';
import { useTheme } from '../../../contexts/theme';
import { TopBar } from '../../../components/navigation/TopBar';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { locale, t, setLocale, supportedLocales } = useI18n();
  const { themeMode, setThemeMode, themeModes } = useTheme();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(t.auth.logout, t.common.cancel + '?', [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.auth.logout,
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleLanguageSelect = async (code: typeof locale) => {
    await setLocale(code);
    setLanguageModalVisible(false);
  };

  const handleThemeSelect = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setThemeModalVisible(false);
  };

  const currentLocaleName = supportedLocales.find((l) => l.code === locale)?.name || 'English';
  const currentThemeLabel = themeModes.find((m) => m.value === themeMode)?.label || 'System';

  const getThemeIcon = (mode: ThemeMode, color: string) => {
    switch (mode) {
      case 'light':
        return <Sun size={24} color={color} />;
      case 'dark':
        return <Moon size={24} color={color} />;
      default:
        return <Smartphone size={24} color={color} />;
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* TopBar without Hamburger Menu */}
      <TopBar />

      {/* User Info */}
      <View className="bg-white dark:bg-gray-800 mx-4 mt-4 p-4 rounded-xl">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center">
            <Text className="text-white text-lg font-bold">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-gray-900 dark:text-white font-semibold">
              {user?.user_metadata?.display_name || 'User'}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              {user?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View className="bg-white dark:bg-gray-800 mx-4 mt-4 rounded-xl overflow-hidden">
        {/* Language Selection */}
        <TouchableOpacity
          className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700"
          onPress={() => setLanguageModalVisible(true)}
        >
          <Languages size={24} color="#6B7280" />
          <Text className="flex-1 ml-3 text-gray-900 dark:text-white">
            Language
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 mr-2">
            {currentLocaleName}
          </Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Theme Selection */}
        <TouchableOpacity
          className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700"
          onPress={() => setThemeModalVisible(true)}
        >
          {getThemeIcon(themeMode, '#6B7280')}
          <Text className="flex-1 ml-3 text-gray-900 dark:text-white">
            Theme
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 mr-2">
            {currentThemeLabel}
          </Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700"
          onPress={() => Alert.alert('Coming Soon', 'Notifications coming soon')}
        >
          <Bell size={24} color="#6B7280" />
          <Text className="flex-1 ml-3 text-gray-900 dark:text-white">
            Notifications
          </Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => Alert.alert(t.metadata.title, `${t.metadata.description}\n\nVersion 0.0.1`)}
        >
          <Info size={24} color="#6B7280" />
          <Text className="flex-1 ml-3 text-gray-900 dark:text-white">
            About
          </Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        className="bg-white dark:bg-gray-800 mx-4 mt-4 p-4 rounded-xl flex-row items-center justify-center"
        onPress={handleLogout}
      >
        <LogOut size={24} color="#EF4444" />
        <Text className="ml-2 text-red-500 font-semibold">{t.auth.logout}</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text className="text-center text-gray-400 dark:text-gray-500 mt-8 text-sm">
        Version 0.0.1
      </Text>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl">
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Language
              </Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-80">
              {supportedLocales.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  className={`flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-700 ${
                    locale === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text className="flex-1 text-gray-900 dark:text-white text-base">
                    {lang.name}
                  </Text>
                  {locale === lang.code && (
                    <Check size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View className="h-8" />
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl">
            <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Theme
              </Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View>
              {themeModes.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  className={`flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-700 ${
                    themeMode === mode.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onPress={() => handleThemeSelect(mode.value)}
                >
                  {getThemeIcon(mode.value, themeMode === mode.value ? '#3B82F6' : '#6B7280')}
                  <Text className="flex-1 ml-3 text-gray-900 dark:text-white text-base">
                    {mode.label}
                  </Text>
                  {themeMode === mode.value && (
                    <Check size={24} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </View>
  );
}
