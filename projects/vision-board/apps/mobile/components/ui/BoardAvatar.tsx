import { View } from 'react-native';

interface BoardAvatarProps {
  color?: string;
  size?: number;
}

export function BoardAvatar({ color = '#5865f2', size = 108 }: BoardAvatarProps) {
  const thumbW = Math.round(size * 0.42);
  const thumbH = Math.round(size * 0.30);
  const margin = Math.round(size * 0.056);
  const gap = Math.round(size * 0.047);

  return (
    <View
      className="rounded-xl overflow-hidden"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {/* Thumbnail grid (2x2) */}
      <View className="absolute" style={{ top: margin, left: margin }}>
        <View style={{ width: thumbW, height: thumbH, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.09)' }} />
      </View>
      <View className="absolute" style={{ top: margin, left: margin + thumbW + gap }}>
        <View style={{ width: thumbW, height: thumbH, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.09)' }} />
      </View>
      <View className="absolute" style={{ top: margin + thumbH + gap, left: margin }}>
        <View style={{ width: thumbW, height: thumbH, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      </View>
      <View className="absolute" style={{ top: margin + thumbH + gap, left: margin + thumbW + gap }}>
        <View style={{ width: thumbW, height: thumbH, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      </View>

      {/* Text lines */}
      <View
        className="absolute rounded-sm"
        style={{
          bottom: margin + 14,
          left: margin,
          width: Math.round(size * 0.37),
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      <View
        className="absolute rounded-sm"
        style={{
          bottom: margin + 4,
          left: margin,
          width: Math.round(size * 0.56),
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      />
    </View>
  );
}
