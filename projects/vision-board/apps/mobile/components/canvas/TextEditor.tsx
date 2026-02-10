import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { LucideIcon } from '../ui/LucideIcon';
import { colors } from '../../constants/Colors';
import type { Node } from '../../hooks/useNodes';

interface TextEditorProps {
  node: Node;
  visible: boolean;
  onClose: () => void;
  onUpdateNode: (updates: Partial<Node>) => void;
  onDelete: () => void;
}

const FONT_SIZE_OPTIONS = [14, 18, 24, 32, 48, 64];

const COLOR_OPTIONS = [
  '#FFFFFF',
  '#D1D5DB',
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
];

export function TextEditor({
  node,
  visible,
  onClose,
  onUpdateNode,
  onDelete,
}: TextEditorProps) {
  const [text, setText] = useState(node.content || '');
  const inputRef = useRef<TextInput>(null);
  const translateY = useSharedValue(visible ? 0 : 400);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 400, {
      damping: 20,
      stiffness: 150,
    });
    if (visible) {
      setText(node.content || '');
      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, node.content, translateY]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    onUpdateNode({ content: newText });
  };

  const handleFontSizeChange = (delta: number) => {
    const currentSize = node.fontSize || 24;
    const newSize = Math.max(10, Math.min(128, currentSize + delta));
    onUpdateNode({ fontSize: newSize });
  };

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>テキストの編集</Text>
        <Pressable onPress={onClose}>
          <LucideIcon name="x" size={22} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={handleTextChange}
        style={{
          backgroundColor: '#2C2C2E',
          color: '#FFFFFF',
          fontSize: 16,
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
          minHeight: 80,
          textAlignVertical: 'top',
        }}
        multiline
        placeholder="テキストを入力..."
        placeholderTextColor="#6B7280"
      />

      {/* Font size controls */}
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
        フォントサイズ: {node.fontSize || 24}px
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Pressable
          onPress={() => handleFontSizeChange(-2)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: '#2C2C2E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>A-</Text>
        </Pressable>

        {/* Quick size buttons */}
        {FONT_SIZE_OPTIONS.map((size) => (
          <Pressable
            key={size}
            onPress={() => onUpdateNode({ fontSize: size })}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: (node.fontSize || 24) === size ? colors.accent.primary : '#2C2C2E',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{size}</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => handleFontSizeChange(2)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: '#2C2C2E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>A+</Text>
        </Pressable>
      </View>

      {/* Color selection */}
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
        テキスト色
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {COLOR_OPTIONS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onUpdateNode({ color: c })}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c,
              borderWidth: (node.color || '#FFFFFF') === c ? 3 : 1,
              borderColor: (node.color || '#FFFFFF') === c ? colors.accent.primary : '#4A4A4C',
            }}
          />
        ))}
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
    </Animated.View>
  );
}
