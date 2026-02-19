import React from 'react';
import { Tabs } from 'expo-router';

import { useI18n } from '../../../contexts/i18n';
import { TabBar } from '../../../components/ui/TabBar';

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs?.home || 'Home',
          tabBarIconName: 'house',
        } as Record<string, unknown>}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: t.tabs?.timer || 'Timer',
          tabBarIconName: 'timer',
        } as Record<string, unknown>}
      />
      <Tabs.Screen
        name="ambient"
        options={{
          title: t.tabs?.focus || 'Focus',
          tabBarIconName: 'zap',
        } as Record<string, unknown>}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs?.profile || 'Profile',
          tabBarIconName: 'user',
        } as Record<string, unknown>}
      />
      <Tabs.Screen
        name="debug"
        options={{
          title: 'Debug',
          tabBarIconName: 'bug',
        } as Record<string, unknown>}
      />
    </Tabs>
  );
}
