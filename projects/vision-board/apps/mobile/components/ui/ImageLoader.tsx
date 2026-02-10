import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from './LucideIcon';

interface ImageLoaderProps {
  width?: number;
  height?: number;
}

export function ImageLoader({ width = 160, height = 160 }: ImageLoaderProps) {
  return (
    <View
      className="rounded-2xl overflow-hidden items-center justify-center"
      style={{ width, height, backgroundColor: '#1A1D2E' }}
    >
      {/* Shimmer overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Icon circle */}
      <View className="w-14 h-14 rounded-full items-center justify-center bg-white/[0.03]">
        <LucideIcon name="image" size={28} color="rgba(255,255,255,0.12)" />
      </View>
    </View>
  );
}
