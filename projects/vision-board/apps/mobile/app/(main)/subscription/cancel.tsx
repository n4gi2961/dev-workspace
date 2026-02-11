import React from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Infinity, ShieldOff, Cloud, LayoutGrid, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../../components/ui/TopBar';

const LOSE_FEATURES = [
  {
    Icon: Infinity,
    iconColor: '#EF4444',
    bgColor: '#EF444420',
    title: '無制限の画像アップロード',
    desc: '無料プランでは5枚までに制限されます',
  },
  {
    Icon: ShieldOff,
    iconColor: '#F59E0B',
    bgColor: '#F59E0B20',
    title: '広告なしの没入体験',
    desc: '無料プランでは広告が表示されます',
  },
  {
    Icon: Cloud,
    iconColor: '#3B82F6',
    bgColor: '#3B82F620',
    title: 'マルチデバイス同期',
    desc: 'このデバイスのみでの利用になります',
  },
  {
    Icon: LayoutGrid,
    iconColor: '#A855F7',
    bgColor: '#A855F720',
    title: 'ボード無制限作成',
    desc: '無料プランでは1ボードまでに制限されます',
  },
];

export default function CancelSubscriptionScreen() {
  const insets = useSafeAreaInsets();

  const handleCancel = () => {
    Alert.alert(
      'プランの解約',
      '本当に解約しますか？現在の請求期間終了後、無料プランに切り替わります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解約する',
          style: 'destructive',
          onPress: () => {
            // モック: 解約処理
            Alert.alert('解約完了', 'プランの解約が完了しました。', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#121212' }}>
      <TopBar
        title="プランの解約"
        leftIcon="chevron-left"
        onLeftPress={() => router.back()}
        showRight={false}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: insets.bottom + 24 }}
      >
        {/* Current Plan Card (Compact) */}
        <View
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#3A3A3A',
            padding: 20,
            gap: 12,
          }}
        >
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
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
            Pro 3ヶ月プラン
          </Text>
          <Text style={{ color: '#D1D5DB', fontSize: 12 }}>
            次回更新日: 2026年5月6日
          </Text>
        </View>

        {/* Features You'll Lose */}
        <View style={{ gap: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            解約後に利用できなくなる機能
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
            {LOSE_FEATURES.map((feat, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <View style={{ height: 1, backgroundColor: '#3A3A3A' }} />
                )}
                <View className="flex-row items-center" style={{ padding: 16, gap: 14 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: feat.bgColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <feat.Icon size={18} color={feat.iconColor} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                      {feat.title}
                    </Text>
                    <Text style={{ color: '#D1D5DB', fontSize: 12 }}>
                      {feat.desc}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Info Box */}
        <View
          className="flex-row"
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: 12,
            padding: 16,
            gap: 12,
          }}
        >
          <Info size={20} color="#D1D5DB" />
          <Text style={{ color: '#D1D5DB', fontSize: 12, lineHeight: 18, flex: 1 }}>
            解約しても、現在の請求期間（2026年5月6日）まではすべてのPro機能をご利用いただけます。その後、無料プランに切り替わります。
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 12 }}>
          {/* Keep Plan */}
          <Pressable onPress={() => router.back()} className="active:opacity-80">
            <View
              className="items-center justify-center"
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600' }}>
                プランを継続する
              </Text>
            </View>
          </Pressable>

          {/* Cancel Plan */}
          <Pressable onPress={handleCancel} className="active:opacity-80">
            <View
              className="items-center justify-center"
              style={{
                height: 52,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#EF4444',
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
                解約する
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Footer Note */}
        <Text style={{ color: '#A1A1AA', fontSize: 12, textAlign: 'center' }}>
          ご不明な点はサポートまでお問い合わせください
        </Text>
      </ScrollView>
    </View>
  );
}
