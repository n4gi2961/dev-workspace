import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { LucideIcon } from '../ui/LucideIcon';
import { colors } from '../../constants/Colors';
import type { Node } from '../../hooks/useNodes';

interface ImageEditorProps {
  node: Node;
  visible: boolean;
  onClose: () => void;
  onUpdateNode: (updates: Partial<Node>) => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
}

const SIZE_PRESETS = [
  { label: 'L', width: 400, height: 400 },
  { label: 'M', width: 250, height: 250 },
  { label: 'S', width: 150, height: 150 },
];

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
];

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
      {title}
    </Text>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  color = '#FFFFFF',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 4,
        opacity: pressed ? 0.6 : 1,
        minWidth: 56,
      })}
    >
      <LucideIcon name={icon} size={20} color={color} />
      <Text style={{ color, fontSize: 10 }}>{label}</Text>
    </Pressable>
  );
}

export function ImageEditor({
  node,
  visible,
  onClose,
  onUpdateNode,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
}: ImageEditorProps) {
  const translateY = useSharedValue(visible ? 0 : 300);

  React.useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 300, {
      damping: 20,
      stiffness: 150,
    });
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1C1C1E',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 12,
          paddingBottom: 32,
          paddingHorizontal: 20,
          zIndex: 200,
        },
        animatedStyle,
      ]}
    >
      {/* Drag handle */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#4A4A4C' }} />
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>画像の編集</Text>
        <Pressable onPress={onClose}>
          <LucideIcon name="x" size={22} color="#9CA3AF" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Aspect Ratio */}
        <SectionTitle title="アスペクト比" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {ASPECT_RATIOS.map((ratio) => (
            <Pressable
              key={ratio.label}
              onPress={() => {
                if (ratio.value) {
                  const newWidth = node.width;
                  const newHeight = Math.round(newWidth / ratio.value);
                  onUpdateNode({ width: newWidth, height: newHeight });
                }
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: '#2C2C2E',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{ratio.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Size Presets */}
        <SectionTitle title="サイズ" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {SIZE_PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => onUpdateNode({ width: preset.width, height: preset.height })}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: '#2C2C2E',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Layer Operations */}
        <SectionTitle title="レイヤー" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
          <ActionButton icon="arrow-up-to-line" label="最前面" onPress={onBringToFront} />
          <ActionButton icon="arrow-up" label="前面" onPress={onBringForward} />
          <ActionButton icon="arrow-down" label="背面" onPress={onSendBackward} />
          <ActionButton icon="arrow-down-to-line" label="最背面" onPress={onSendToBack} />
        </View>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: '#2C2C2E',
          }}
        >
          <LucideIcon name="trash-2" size={18} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontSize: 14, fontWeight: '500' }}>削除</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
