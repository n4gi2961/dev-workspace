import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  Calendar,
  Check,
  Infinity,
  ShieldOff,
  Cloud,
  LayoutGrid,
  ArrowRightLeft,
  CircleX,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../../components/ui/TopBar';

const FEATURES = [
  {
    Icon: Infinity,
    title: '無制限の画像アップロード',
    desc: '画像とボードを無制限に作成できます',
  },
  {
    Icon: ShieldOff,
    title: '広告なしの没入体験',
    desc: '広告に邪魔されない集中環境',
  },
  {
    Icon: Cloud,
    title: 'マルチデバイス同期',
    desc: 'すべてのデバイスからアクセス可能',
  },
  {
    Icon: LayoutGrid,
    title: 'ボード無制限作成',
    desc: 'ボードをいくつでも作成・管理',
  },
];

export default function PlanManagementScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <TopBar
        title="プランの管理"
        leftIcon="chevron-left"
        onLeftPress={() => router.back()}
        showRight={false}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: insets.bottom + 24 }}
      >
        {/* Current Plan Card */}
        <View
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#3A3A3A',
            padding: 20,
            gap: 16,
          }}
        >
          {/* Plan Header */}
          <View className="flex-row justify-between items-center">
            <Text style={{ color: '#D1D5DB', fontSize: 12, fontWeight: '500' }}>
              現在のプラン
            </Text>
            <View
              className="flex-row items-center"
              style={{
                backgroundColor: '#22C55E20',
                borderRadius: 100,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 6,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
              <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '600' }}>有効</Text>
            </View>
          </View>

          {/* Plan Info */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
              Pro 3ヶ月プラン
            </Text>
            <Text style={{ color: '#D1D5DB', fontSize: 14 }}>
              ¥2,160 / 3ヶ月（¥720/月）
            </Text>
          </View>

          {/* Renewal Row */}
          <View
            className="flex-row items-center"
            style={{
              gap: 8,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#3A3A3A',
            }}
          >
            <Calendar size={14} color="#A1A1AA" />
            <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
              次回更新日: 2026年5月6日
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={{ gap: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            有効な機能
          </Text>
          <View
            style={{
              backgroundColor: '#1F1F1F',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#3A3A3A',
              overflow: 'hidden',
            }}
          >
            {FEATURES.map((feat, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <View style={{ height: 1, backgroundColor: '#3A3A3A' }} />
                )}
                <View className="flex-row items-center" style={{ padding: 16, gap: 14 }}>
                  {/* Icon Background */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: '#22C55E18',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <feat.Icon size={18} color="#22C55E" />
                  </View>
                  {/* Text */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                      {feat.title}
                    </Text>
                    <Text style={{ color: '#D1D5DB', fontSize: 12 }}>
                      {feat.desc}
                    </Text>
                  </View>
                  {/* Check */}
                  <Check size={18} color="#22C55E" />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          {/* Change Plan */}
          <Pressable
            onPress={() => router.push('/(main)/subscription/pricing' as never)}
            className="active:opacity-80"
          >
            <View
              className="flex-row items-center justify-center"
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                gap: 8,
              }}
            >
              <ArrowRightLeft size={18} color="#000000" />
              <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600' }}>
                プランを変更
              </Text>
            </View>
          </Pressable>

          {/* Cancel Plan */}
          <Pressable
            onPress={() => router.push('/(main)/subscription/cancel' as never)}
            className="active:opacity-80"
          >
            <View
              className="flex-row items-center justify-center"
              style={{
                height: 52,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#EF4444',
                gap: 8,
              }}
            >
              <CircleX size={18} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
                プランを解約
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
