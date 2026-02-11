import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Info, Crown, LogOut, X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../contexts/i18n';
import { useTheme } from '../../contexts/theme';
import { TopBar } from '../../components/ui/TopBar';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { locale, setLocale, supportedLocales } = useI18n();
  const { themeMode, setThemeMode, themeModes } = useTheme();
  const insets = useSafeAreaInsets();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const currentLocaleName = supportedLocales.find((l) => l.code === locale)?.name || 'English';
  const currentThemeLabel = themeModes.find((m) => m.value === themeMode)?.label || 'System';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <TopBar
        title="Settings"
        leftIcon="chevron-left"
        onLeftPress={() => router.back()}
        showRight={false}
      />

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ gap: 24, paddingBottom: 100 }}>
        {/* Settings Section */}
        <View className="gap-4">
          <Text className="text-xl font-semibold text-white">Settings</Text>
          <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}>
            {/* Language */}
            <Pressable
              onPress={() => setLanguageModalVisible(true)}
              className="flex-row items-center justify-between p-4"
            >
              <View>
                <Text className="text-base font-medium text-white">Language</Text>
                <Text className="text-sm" style={{ color: '#8E8E93' }}>{currentLocaleName}</Text>
              </View>
              <ChevronRight size={20} color="#48484A" />
            </Pressable>

            <View className="h-px mx-4" style={{ backgroundColor: '#3A3A3A' }} />

            {/* Theme */}
            <Pressable
              onPress={() => setThemeModalVisible(true)}
              className="flex-row items-center justify-between p-4"
            >
              <View>
                <Text className="text-base font-medium text-white">Theme</Text>
                <Text className="text-sm" style={{ color: '#8E8E93' }}>{currentThemeLabel}</Text>
              </View>
              <ChevronRight size={20} color="#48484A" />
            </Pressable>
          </View>
        </View>

        {/* Help & Support */}
        <Pressable className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-row items-center gap-3">
            <Info size={22} color="#8E8E93" />
            <Text className="text-base font-medium text-white">Help & Support</Text>
          </View>
          <ChevronRight size={20} color="#48484A" />
        </Pressable>

        {/* Subscription Button */}
        <Pressable onPress={() => router.push('/(main)/subscription/pricing' as never)} className="active:opacity-80">
          <LinearGradient
            colors={['#5A2B87', '#7B3FA0']}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 52,
              borderRadius: 12,
            }}
          >
            <Crown size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>サブスクリプションを管理</Text>
          </LinearGradient>
        </Pressable>

        {/* Logout Button */}
        <Pressable onPress={handleLogout} className="active:opacity-80">
          <LinearGradient
            colors={['#f74b4b', '#ef5b5b']}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 52,
              borderRadius: 12,
            }}
          >
            <LogOut size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Logout</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl" style={{ backgroundColor: '#1F1F1F' }}>
            <View className="flex-row justify-between items-center px-4 py-4 border-b" style={{ borderColor: '#3A3A3A' }}>
              <Text className="text-lg font-semibold text-white">Language</Text>
              <Pressable onPress={() => setLanguageModalVisible(false)}>
                <X size={24} color="#8E8E93" />
              </Pressable>
            </View>
            <ScrollView className="max-h-80">
              {supportedLocales.map((lang) => (
                <Pressable
                  key={lang.code}
                  className="flex-row items-center px-4 py-4"
                  style={{ borderBottomWidth: 0.5, borderColor: '#3A3A3A' }}
                  onPress={async () => {
                    await setLocale(lang.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <Text className="flex-1 text-white text-base">{lang.name}</Text>
                  {locale === lang.code && <Check size={24} color="#0095F6" />}
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl" style={{ backgroundColor: '#1F1F1F' }}>
            <View className="flex-row justify-between items-center px-4 py-4 border-b" style={{ borderColor: '#3A3A3A' }}>
              <Text className="text-lg font-semibold text-white">Theme</Text>
              <Pressable onPress={() => setThemeModalVisible(false)}>
                <X size={24} color="#8E8E93" />
              </Pressable>
            </View>
            {themeModes.map((mode) => (
              <Pressable
                key={mode.value}
                className="flex-row items-center px-4 py-4"
                style={{ borderBottomWidth: 0.5, borderColor: '#3A3A3A' }}
                onPress={async () => {
                  await setThemeMode(mode.value);
                  setThemeModalVisible(false);
                }}
              >
                <Text className="flex-1 text-white text-base">{mode.label}</Text>
                {themeMode === mode.value && <Check size={24} color="#0095F6" />}
              </Pressable>
            ))}
            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
