import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Infinity, ShieldOff, Cloud, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../../components/ui/TopBar';
import { SubscriptionSuccessModal } from '../../../components/subscription/SubscriptionSuccessModal';

type PlanId = '1month' | '3month' | '12month';

const VALUE_PROPS = [
  { icon: Infinity, text: '無制限の画像とボード でさらに自由に' },
  { icon: ShieldOff, text: 'ノイズのない、没入体験' },
  { icon: Cloud, text: 'あらゆるデバイスからアクセス' },
];

const PLANS = [
  {
    id: '1month' as PlanId,
    name: '1ヶ月',
    price: '¥800',
    priceFontSize: 24,
    nameFontSize: 16,
    nameColor: '#A8A8A8',
    height: 87,
    bg: '#1F1F1F',
    borderColor: '#3A3A3A',
    borderWidth: 1,
  },
  {
    id: '3month' as PlanId,
    name: '3ヶ月プラン',
    price: '¥1,440',
    priceFontSize: 36,
    nameFontSize: 18,
    nameColor: '#FFFFFF',
    height: 175,
    isGradient: true,
    borderColor: '#F72585',
    borderWidth: 2.5,
    sublines: ['初回3ヶ月', '4か月目以降 ¥2,160 | ¥720/月'],
    badge: { text: '初回1か月分無料！', bg: '#FFD700', textColor: '#000000' },
  },
  {
    id: '12month' as PlanId,
    name: '12ヶ月プラン',
    price: '¥6,400',
    priceFontSize: 24,
    nameFontSize: 14,
    nameColor: '#A8A8A8',
    height: 130,
    bg: '#1F1F1F',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    sublines: ['初回12ヶ月', '1年目以降 ¥7,680 | ¥640/月'],
    badge: { text: '初回2か月分無料！', bg: '#4CAF50', textColor: '#FFFFFF' },
  },
];

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('3month');
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePurchase = () => {
    // モック: 成功モーダルを表示
    setShowSuccess(true);
  };

  const handleSuccessDismiss = () => {
    setShowSuccess(false);
    router.back();
  };

  const ctaText = selectedPlan === '1month'
    ? '1ヶ月プランを開始（¥800）'
    : selectedPlan === '3month'
      ? '3ヶ月プランを開始（初回¥1,440）'
      : '12ヶ月プランを開始（¥6,400）';

  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <TopBar
        title="Pro機能のロック解除"
        leftIcon="chevron-left"
        onLeftPress={() => router.back()}
        showRight={false}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: insets.bottom + 24 }}
      >
        {/* Value Props */}
        <View
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: 16,
            borderWidth: 3,
            borderColor: '#CEA968',
            padding: 15,
            gap: 12,
            justifyContent: 'center',
          }}
        >
          {VALUE_PROPS.map((prop, i) => (
            <View key={i} className="flex-row items-center" style={{ gap: 8, padding: 12 }}>
              <prop.icon size={20} color="#CEA968" />
              <Text style={{ color: '#CEA968', fontSize: 14, fontWeight: '600' }}>{prop.text}</Text>
            </View>
          ))}
          <View className="items-center" style={{ padding: 12 }}>
            <Sparkles size={20} color="#CEA968" />
          </View>
        </View>

        {/* Plan Cards */}
        <View style={{ gap: 16 }}>
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const cardContent = (
              <Pressable
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                style={{
                  borderRadius: 16,
                  borderWidth: plan.borderWidth,
                  borderColor: isSelected ? plan.borderColor : '#3A3A3A',
                  height: plan.height,
                  padding: plan.id === '3month' ? 24 : 20,
                  justifyContent: 'center',
                  gap: 12,
                  overflow: 'hidden',
                }}
              >
                {/* 3month gradient background */}
                {plan.isGradient && (
                  <LinearGradient
                    colors={['#7B3FA0', '#5A2B87', '#3D1A6E']}
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                    }}
                  />
                )}
                {!plan.isGradient && (
                  <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: plan.bg,
                  }} />
                )}

                {/* Header row with badge */}
                <View className="flex-row justify-between items-end" style={{ gap: 8 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: plan.nameColor, fontSize: plan.nameFontSize, fontWeight: plan.id === '3month' ? '700' : '600' }}>
                      {plan.name}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: plan.priceFontSize, fontWeight: '700' }}>
                      {plan.price}
                    </Text>
                    {plan.sublines?.map((line, idx) => (
                      <Text key={idx} style={{
                        color: idx === 0 ? '#D1D5DB' : '#A8A8A8',
                        fontSize: idx === 0 ? 14 : 10,
                      }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                  {plan.badge && (
                    <View style={{
                      backgroundColor: plan.badge.bg,
                      borderRadius: plan.id === '3month' ? 12 : 8,
                      paddingHorizontal: plan.id === '3month' ? 12 : 8,
                      paddingVertical: plan.id === '3month' ? 4 : 3,
                      height: 29,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: plan.badge.textColor, fontSize: 12, fontWeight: '700' }}>
                        {plan.badge.text}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
            return cardContent;
          })}
        </View>

        {/* CTA Button */}
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Pressable onPress={handlePurchase} className="active:opacity-80" style={{ width: '100%' }}>
            <LinearGradient
              colors={['#7B3FA0', '#5A2B87', '#4A2070']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 56,
                borderRadius: 100,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{ctaText}</Text>
            </LinearGradient>
          </Pressable>
          <Text style={{ color: '#D1D5DB', fontSize: 12 }}>いつでもキャンセル可能</Text>
        </View>
      </ScrollView>

      <SubscriptionSuccessModal
        visible={showSuccess}
        onDismiss={handleSuccessDismiss}
      />
    </View>
  );
}
