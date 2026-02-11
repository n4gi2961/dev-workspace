import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Crown, Infinity, Sparkles, ShieldOff, Cloud, Rocket, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionSuccessModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const FEATURES = [
  { Icon: Infinity, text: '無制限のボードと画像' },
  { Icon: Sparkles, text: 'AIビジョン生成' },
  { Icon: ShieldOff, text: '広告なしの没入体験' },
  { Icon: Cloud, text: 'あらゆるデバイスからアクセス' },
];

export function SubscriptionSuccessModal({ visible, onDismiss }: SubscriptionSuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#00000099' }}>
        {/* Close Button */}
        <Pressable
          onPress={onDismiss}
          style={{
            position: 'absolute',
            top: 172,
            right: 30,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FFFFFF15',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <X size={32} color="#AAAAAA" />
        </Pressable>

        {/* Card */}
        <LinearGradient
          colors={['#1F1F1F', '#1A1A2E']}
          style={{
            width: 340,
            borderRadius: 24,
            paddingTop: 32,
            paddingHorizontal: 24,
            paddingBottom: 24,
            gap: 20,
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: '#CEA96840',
          }}
        >
          {/* Crown Icon Circle */}
          <LinearGradient
            colors={['#FFD700', '#CEA968']}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Crown size={40} color="#1F1F1F" />
          </LinearGradient>

          {/* Title Section */}
          <View style={{ gap: 8, alignItems: 'center', width: '100%' }}>
            <Text style={{ color: '#FFD700', fontSize: 24, fontWeight: '800' }}>
              Proメンバーへようこそ！
            </Text>
            <Text style={{ color: '#A8A8A8', fontSize: 14 }}>
              すべてのPro機能がアンロック
            </Text>
          </View>

          {/* Divider */}
          <View style={{ width: '100%', height: 1, backgroundColor: '#FFFFFF15' }} />

          {/* Feature List */}
          <View style={{ gap: 14, width: '100%', paddingHorizontal: 8 }}>
            {FEATURES.map((feat, i) => (
              <View key={i} className="flex-row items-center" style={{ gap: 12 }}>
                <feat.Icon size={20} color="#FFD700" />
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>
                  {feat.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={{ width: '100%', height: 1, backgroundColor: '#FFFFFF15' }} />

          {/* CTA Button */}
          <Pressable onPress={onDismiss} className="active:opacity-80" style={{ width: '100%' }}>
            <LinearGradient
              colors={['#5A2B87', '#7B3FA0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                height: 52,
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Rocket size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                さっそく始めましょう
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Close Text */}
          <Pressable onPress={onDismiss}>
            <Text style={{ color: '#666666', fontSize: 12 }}>あとで</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}
