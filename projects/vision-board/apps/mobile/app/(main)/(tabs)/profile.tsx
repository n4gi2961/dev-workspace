import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Trophy, CalendarDays, Flame, Zap, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../contexts/i18n';
import { BlurView } from 'expo-blur';
import { TopBar } from '../../../components/ui/TopBar';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { t } = useI18n();

  const initials = user?.email?.charAt(0).toUpperCase() || '?';
  const displayName = user?.user_metadata?.display_name || 'User';
  const email = user?.email || '';

  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <TopBar
        title="Profile"
        showLeft={false}
        showRight={true}
        rightIcon="menu"
        onRightPress={() => router.push('/(main)/settings' as never)}
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* User Card */}
        <View
          className="rounded-2xl p-2.5 gap-2"
          style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
        >
          <View className="flex-row items-center gap-2">
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: '#0095F6' }}
            >
              <Text className="text-white text-lg font-semibold">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold">{displayName}</Text>
              <Text className="text-xs" style={{ color: '#8E8E93' }}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-2 mt-3.5">
          <View
            className="flex-1 items-center rounded-xl py-2.5"
            style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
          >
            <Text className="text-lg font-bold" style={{ color: '#0095F6' }}>12</Text>
            <Text className="text-xs font-medium" style={{ color: '#8E8E93' }}>Boards</Text>
          </View>
          <View
            className="flex-1 items-center rounded-xl py-2.5"
            style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
          >
            <Text className="text-lg font-bold" style={{ color: '#FFD60A' }}>348</Text>
            <Text className="text-xs font-medium" style={{ color: '#8E8E93' }}>Stars</Text>
          </View>
          <View
            className="flex-1 items-center rounded-xl py-2.5"
            style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
          >
            <Text className="text-lg font-bold" style={{ color: '#32D74B' }}>27</Text>
            <Text className="text-xs font-medium" style={{ color: '#8E8E93' }}>Day Streak</Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View className="mt-3.5 gap-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-1.5">
              <Flame size={16} color="#FFD60A" />
              <Text className="text-white font-semibold">This Week</Text>
            </View>
            <Text className="text-xs font-medium" style={{ color: '#8E8E93' }}>5/7 days</Text>
          </View>
          <View className="flex-row justify-between">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const completed = i < 5;
              return (
                <View key={day} className="items-center gap-1.5 flex-1">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: completed ? '#0095F6' : '#2C2C2E',
                    }}
                  >
                    {completed && <Zap size={14} color="#FFFFFF" />}
                  </View>
                  <Text className="text-[10px]" style={{ color: '#8E8E93' }}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top 3 Routines */}
        <View
          className="mt-3.5 rounded-2xl p-3.5"
          style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
        >
          <Text className="text-base font-bold text-center mb-3" style={{ color: '#FFFFFF' }}>
            Top 3
          </Text>
          <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
            <View style={{ gap: 8 }}>
              {[
                { name: 'ランニング', color: '#FF6B6B', stars: 42, streak: 12 },
                { name: '読書', color: '#4ECDC4', stars: 35, streak: 8 },
                { name: '瞑想', color: '#45B7D1', stars: 28, streak: 15 },
              ].map((item, i) => {
                const rankColors = ['#FFD60A', '#C0C0C0', '#CD7F32'];
                return (
                  <View key={item.name} className="flex-row items-center gap-2">
                    <Text className="font-bold" style={{ color: rankColors[i], width: 16, fontSize: 14 }}>
                      {i + 1}
                    </Text>
                    <View className="flex-1 py-2 px-1">
                      <Text
                        className="font-bold"
                        style={{ color: item.color, fontSize: 13, textDecorationLine: 'underline' }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View
                      className="items-center rounded-xl py-2 px-1"
                      style={{ width: 72, borderWidth: 1.5, borderColor: '#3A3A3A' }}
                    >
                      <Text className="font-bold" style={{ color: '#FFD60A', fontSize: 16 }}>{item.stars}</Text>
                      <Text className="font-medium" style={{ color: '#8E8E93', fontSize: 10 }}>Stars</Text>
                    </View>
                    <View
                      className="items-center rounded-xl py-2 px-1"
                      style={{ width: 72, borderWidth: 1.5, borderColor: '#3A3A3A' }}
                    >
                      <Text className="font-bold" style={{ color: '#f74b4b', fontSize: 16 }}>{item.streak}</Text>
                      <Text className="font-medium" style={{ color: '#8E8E93', fontSize: 10 }}>Streak</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            {/* Blur + PREMIUM overlay */}
            <BlurView
              intensity={40}
              tint="dark"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 12,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <View
                className="flex-row items-center gap-1.5 py-2 px-5 rounded-full"
                style={{ borderWidth: 1.5, borderColor: '#F59E0B', backgroundColor: '#1C1C1E' }}
              >
                <Lock size={14} color="#F59E0B" />
                <Text className="font-bold text-sm" style={{ color: '#F59E0B' }}>PREMIUM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Level Section */}
        <View
          className="mt-3.5 rounded-2xl p-3.5 gap-2.5"
          style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Zap size={16} color="#0095F6" />
              <Text className="text-white font-semibold">Lv. 5</Text>
            </View>
            <Text className="text-sm font-semibold" style={{ color: '#FFD60A' }}>Explorer</Text>
          </View>
          {/* Progress bar */}
          <View className="h-2 rounded-full" style={{ backgroundColor: '#2C2C2E' }}>
            <View className="h-2 rounded-full w-[62%]" style={{ backgroundColor: '#0095F6' }} />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs font-medium" style={{ color: '#8E8E93' }}>1,240 / 2,000 XP</Text>
            <Text className="text-xs" style={{ color: '#48484A' }}>Next: Lv. 6 Visionary</Text>
          </View>
        </View>

        {/* Achievements */}
        <View className="mt-3.5 gap-2">
          <View className="flex-row items-center gap-1.5">
            <Trophy size={18} color="#FFD60A" />
            <Text className="text-white font-semibold text-base">Achievements</Text>
          </View>
          <View className="flex-row gap-2">
            {[
              { icon: '7', label: '7-Day\nStreak' },
              { icon: '100', label: '100\nStars' },
              { icon: 'F', label: 'First\nBoard' },
            ].map((ach) => (
              <View
                key={ach.label}
                className="flex-1 items-center rounded-xl py-2.5 px-1.5 gap-2"
                style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <Text className="text-white font-bold">{ach.icon}</Text>
                </View>
                <Text
                  className="text-[10px] text-center"
                  style={{ color: '#8E8E93' }}
                >
                  {ach.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Activity Summary */}
        <View
          className="mt-3.5 rounded-2xl p-3 gap-1.5"
          style={{ borderWidth: 1.5, borderColor: '#3A3A3A' }}
        >
          <View className="flex-row items-center gap-1.5 mb-1">
            <CalendarDays size={18} color="#0095F6" />
            <Text className="text-white font-semibold text-base">Activity Summary</Text>
          </View>
          {[
            { label: 'Joined', value: '2025.04.12', color: '#FFFFFF' },
            { label: 'Total Check-ins', value: '186 days', color: '#FFFFFF' },
            { label: 'Best Streak', value: '42 days', color: '#FFD60A' },
            { label: 'Completion Rate', value: '87%', color: '#32D74B' },
          ].map((row) => (
            <View key={row.label} className="flex-row justify-between py-0.5">
              <Text className="text-xs" style={{ color: '#8E8E93' }}>{row.label}</Text>
              <Text className="text-xs font-medium" style={{ color: row.color }}>{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
