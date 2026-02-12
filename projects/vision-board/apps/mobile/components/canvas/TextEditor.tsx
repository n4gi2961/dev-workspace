import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { LucideIcon } from '../ui/LucideIcon';
import { colors } from '../../constants/Colors';
import type { Node } from '../../hooks/useNodes';
import { TEXT_FONTS } from './NodeToolbar';

interface TextEditorProps {
  node: Node;
  visible: boolean;
  onClose: () => void;
  onUpdateNode: (updates: Partial<Node>) => void;
  onDelete: () => void;
}

const FONT_SIZE_OPTIONS = [14, 18, 24, 32, 48, 64];

const COLOR_ROWS = [
  ['#FFFFFF', '#9E9E9E', '#1C1C1E', '#00BCD4', '#E91E8C', '#9C27B0'],
  ['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#009688'],
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
    translateY.value = withTiming(visible ? 0 : 400, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    if (visible) {
      setText(node.content || '');
      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 200);
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
          fontFamily: node.fontFamily,
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

      {/* Font family selection */}
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
        フォント
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {TEXT_FONTS.map((font) => {
          const isActive = (node.fontFamily || undefined) === font.value;
          return (
            <Pressable
              key={font.label}
              onPress={() => onUpdateNode({ fontFamily: font.value })}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isActive ? colors.accent.primary : '#2C2C2E',
                borderWidth: isActive ? 0 : 1,
                borderColor: '#3A3A3C',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontFamily: font.value,
                }}
              >
                {font.preview}
              </Text>
              <Text
                style={{
                  color: isActive ? '#E0E0E0' : '#9CA3AF',
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {font.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Color selection — 12 colors in 2 rows */}
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
        テキスト色
      </Text>
      <View style={{ gap: 10, marginBottom: 20 }}>
        {COLOR_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((c) => {
              const isActive = (node.color || '#FFFFFF').toUpperCase() === c.toUpperCase();
              return (
                <Pressable
                  key={c}
                  onPress={() => onUpdateNode({ color: c })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: isActive ? 3 : c === '#1C1C1E' ? 1 : 0,
                    borderColor: isActive ? colors.accent.primary : '#555555',
                  }}
                />
              );
            })}
          </View>
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
