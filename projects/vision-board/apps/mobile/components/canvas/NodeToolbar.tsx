import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Image as RNImage, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { LucideIcon } from '../ui/LucideIcon';
import type { Node } from '../../hooks/useNodes';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './BoardCanvas';

const IMAGE_TOOLBAR_WIDTH = 220;
const TEXT_TOOLBAR_WIDTH = 260;
const TOOLBAR_HEIGHT = 45;
const TOOLBAR_GAP = 12;

type PopupType = 'shape' | 'layers' | 'fontSize' | 'textColor' | 'textSize' | 'fontFamily' | null;

interface NodeToolbarProps {
  node: Node;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onUpdateNode: (updates: Partial<Node>) => void;
}

// --- Image node constants ---

const SHAPE_OPTIONS: { label: string; value: string; ratio: number | null; iconW: number; iconH: number }[] = [
  { label: 'FREE', value: 'free', ratio: null, iconW: 28, iconH: 28 },
  { label: 'ORIG', value: 'original', ratio: null, iconW: 28, iconH: 28 },
  { label: '3:4', value: 'portrait', ratio: 3 / 4, iconW: 24, iconH: 32 },
  { label: '1:1', value: 'square', ratio: 1, iconW: 28, iconH: 28 },
  { label: '4:3', value: 'landscape', ratio: 4 / 3, iconW: 32, iconH: 24 },
];

const OVERLAY_FONT_SIZE_OPTIONS = [
  { label: 'Large', value: 'large' },
  { label: 'Medium', value: 'medium' },
  { label: 'Small', value: 'small' },
];

// --- Text node constants ---

const TEXT_COLORS = [
  ['#FFFFFF', '#9E9E9E', '#1C1C1E', '#00BCD4', '#E91E8C', '#9C27B0'],
  ['#F44336', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#009688'],
];

export const TEXT_FONTS = [
  { label: 'デフォルト', value: undefined as string | undefined, preview: 'あぁ Aa' },
  { label: 'Noto Sans JP', value: 'NotoSansJP_400Regular', preview: 'あぁ Aa' },
  { label: 'Noto Serif JP', value: 'NotoSerifJP_400Regular', preview: 'あぁ Aa' },
  { label: 'M+ Rounded', value: 'MPLUSRounded1c_400Regular', preview: 'あぁ Aa' },
  { label: '丸ゴシック', value: 'ZenMaruGothic_400Regular', preview: 'あぁ Aa' },
  { label: 'SpaceMono', value: 'SpaceMono', preview: 'Aa 123' },
];

const TEXT_SIZE_PRESETS = [14, 18, 24, 32, 48, 64];

// --- Shared constants ---

const LAYER_ITEMS = [
  { label: '最前面に移動', action: 'bringToFront' },
  { label: '前面に移動', action: 'bringForward' },
  { label: '背面に移動', action: 'sendBackward' },
  { label: '最背面に移動', action: 'sendToBack' },
] as const;

// --- Shared sub-components ---

function ToolbarIconButton({
  name,
  size,
  color = '#FFFFFF',
  width = 40,
  onPress,
}: {
  name: string;
  size: number;
  color?: string;
  width?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <LucideIcon name={name} size={size} color={color} />
    </Pressable>
  );
}

function Separator() {
  return (
    <View
      style={{
        width: 1,
        height: 22,
        backgroundColor: '#FFFFFF40',
        alignSelf: 'center',
      }}
    />
  );
}

// --- Image-specific sub-component ---

function OverlayFontSizeButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>
          A
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500', marginLeft: 1 }}>
          A
        </Text>
      </View>
    </Pressable>
  );
}

// --- Text-specific sub-components ---

function ColorCircleButton({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }}
      />
    </Pressable>
  );
}

function FontButton({ fontFamily, onPress }: { fontFamily?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', fontFamily }}>
        あぁ
      </Text>
    </Pressable>
  );
}

function SizeButton({ fontSize, onPress }: { fontSize: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
        {fontSize}
      </Text>
    </Pressable>
  );
}

// =================================================================
// Main component
// =================================================================

export function NodeToolbar({
  node,
  scale,
  translateX,
  translateY,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onUpdateNode,
}: NodeToolbarProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activePopup, setActivePopup] = useState<PopupType>(null);

  const isTextNode = node.type === 'text';
  const toolbarWidth = isTextNode ? TEXT_TOOLBAR_WIDTH : IMAGE_TOOLBAR_WIDTH;

  // Close popup when node changes
  useEffect(() => {
    setActivePopup(null);
  }, [node.id]);

  const togglePopup = useCallback((popup: PopupType) => {
    setActivePopup((prev) => (prev === popup ? null : popup));
  }, []);

  const closePopup = useCallback(() => {
    setActivePopup(null);
  }, []);

  // --- Shared handlers ---

  const handleLayerAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'bringToFront': onBringToFront(); break;
        case 'bringForward': onBringForward(); break;
        case 'sendBackward': onSendBackward(); break;
        case 'sendToBack': onSendToBack(); break;
      }
      closePopup();
    },
    [onBringToFront, onBringForward, onSendBackward, onSendToBack, closePopup],
  );

  // --- Image-specific handlers ---

  const handleShapeSelect = useCallback(
    (value: string, ratio: number | null) => {
      if (value === 'original' && node.src) {
        RNImage.getSize(
          node.src,
          (imgWidth, imgHeight) => {
            const origRatio = imgWidth / imgHeight;
            const updates: Partial<Node> = {
              shape: `orig:${origRatio.toFixed(4)}`,
              height: Math.round(node.width / origRatio),
            };
            onUpdateNode(updates);
          },
          () => {
            const currentRatio = node.width / node.height;
            onUpdateNode({ shape: `orig:${currentRatio.toFixed(4)}` });
          },
        );
        closePopup();
        return;
      }

      let shapeValue: string | undefined;
      if (value === 'free') {
        shapeValue = undefined;
      } else {
        shapeValue = value;
      }
      const updates: Partial<Node> = { shape: shapeValue };
      if (ratio !== null) {
        updates.height = Math.round(node.width / ratio);
      }
      onUpdateNode(updates);
      closePopup();
    },
    [node.width, node.height, node.src, onUpdateNode, closePopup],
  );

  const handleOverlayFontSizeSelect = useCallback(
    (value: string) => {
      onUpdateNode({ hoverFontSize: value });
      closePopup();
    },
    [onUpdateNode, closePopup],
  );

  // --- Text-specific handlers ---

  const handleTextColorSelect = useCallback(
    (color: string) => {
      onUpdateNode({ color });
      closePopup();
    },
    [onUpdateNode, closePopup],
  );

  const handleFontSelect = useCallback(
    (fontFamily: string | undefined) => {
      onUpdateNode({ fontFamily });
      closePopup();
    },
    [onUpdateNode, closePopup],
  );

  const handleTextSizeSelect = useCallback(
    (size: number) => {
      onUpdateNode({ fontSize: size });
      closePopup();
    },
    [onUpdateNode, closePopup],
  );

  const handleTextSizeAdjust = useCallback(
    (delta: number) => {
      const current = node.fontSize || 24;
      const newSize = Math.max(10, Math.min(128, current + delta));
      onUpdateNode({ fontSize: newSize });
    },
    [node.fontSize, onUpdateNode],
  );

  const currentShape = !node.shape ? 'free' : node.shape.startsWith('orig:') ? 'original' : node.shape;

  // Screen-fixed positioning
  const toolbarStyle = useAnimatedStyle(() => {
    const nodeBottomCenterX = node.x + node.width / 2;
    const nodeBottomY = node.y + node.height;
    const nodeTopY = node.y;

    let screenX =
      screenWidth / 2 +
      translateX.value +
      (nodeBottomCenterX - CANVAS_WIDTH / 2) * scale.value -
      toolbarWidth / 2;
    let screenY =
      screenHeight / 2 +
      translateY.value +
      (nodeBottomY - CANVAS_HEIGHT / 2) * scale.value +
      TOOLBAR_GAP;

    screenX = Math.max(8, Math.min(screenWidth - toolbarWidth - 8, screenX));

    if (screenY + TOOLBAR_HEIGHT > screenHeight - 8) {
      screenY =
        screenHeight / 2 +
        translateY.value +
        (nodeTopY - CANVAS_HEIGHT / 2) * scale.value -
        TOOLBAR_HEIGHT - TOOLBAR_GAP;
    }

    return {
      left: screenX,
      top: screenY,
    };
  });

  return (
    <Animated.View
      style={[{ position: 'absolute', zIndex: 9999 }, toolbarStyle]}
    >
      {/* ===== Toolbar bar ===== */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#2C2C2E',
          borderRadius: 24,
          height: TOOLBAR_HEIGHT,
          width: toolbarWidth,
          paddingHorizontal: 14,
          justifyContent: 'space-between',
        }}
      >
        {isTextNode ? (
          <>
            <ColorCircleButton
              color={node.color || '#FFFFFF'}
              onPress={() => togglePopup('textColor')}
            />
            <FontButton
              fontFamily={node.fontFamily}
              onPress={() => togglePopup('fontFamily')}
            />
            <SizeButton
              fontSize={node.fontSize || 24}
              onPress={() => togglePopup('textSize')}
            />
            <ToolbarIconButton
              name="layers"
              size={24}
              onPress={() => togglePopup('layers')}
            />
            <Separator />
            <ToolbarIconButton
              name="trash-2"
              size={20}
              color="#FF3B30"
              onPress={onDelete}
            />
          </>
        ) : (
          <>
            <OverlayFontSizeButton onPress={() => togglePopup('fontSize')} />
            <ToolbarIconButton
              name="crop"
              size={24}
              onPress={() => togglePopup('shape')}
            />
            <ToolbarIconButton
              name="layers"
              size={24}
              onPress={() => togglePopup('layers')}
            />
            <Separator />
            <ToolbarIconButton
              name="trash-2"
              size={20}
              color="#FF3B30"
              onPress={onDelete}
            />
          </>
        )}
      </View>

      {/* ===== TEXT NODE POPUPS ===== */}

      {/* Text color palette */}
      {activePopup === 'textColor' && (
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 14,
              gap: 10,
            }}
          >
            {TEXT_COLORS.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: 'row', gap: 10 }}>
                {row.map((color) => {
                  const isActive = (node.color || '#FFFFFF').toUpperCase() === color.toUpperCase();
                  return (
                    <Pressable
                      key={color}
                      onPress={() => handleTextColorSelect(color)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: color,
                        borderWidth: isActive ? 2.5 : color === '#1C1C1E' ? 1 : 0,
                        borderColor: isActive ? '#3B82F6' : '#555555',
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Font family selector */}
      {activePopup === 'fontFamily' && (
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 8,
              width: 220,
              maxHeight: 260,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {TEXT_FONTS.map((font) => {
                const isActive = (node.fontFamily || undefined) === font.value;
                return (
                  <Pressable
                    key={font.label}
                    onPress={() => handleFontSelect(font.value)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: pressed ? '#3A3A3C' : 'transparent',
                    })}
                  >
                    {isActive && (
                      <LucideIcon name="check" size={16} color="#3B82F6" />
                    )}
                    <View style={{ marginLeft: isActive ? 8 : 24 }}>
                      <Text
                        style={{
                          color: isActive ? '#3B82F6' : '#FFFFFF',
                          fontSize: 15,
                          fontFamily: font.value,
                        }}
                      >
                        {font.preview}
                      </Text>
                      <Text
                        style={{
                          color: isActive ? '#3B82F6' : '#9CA3AF',
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {font.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Text size selector */}
      {activePopup === 'textSize' && (
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 10,
            }}
          >
            {/* +/- adjustment row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => handleTextSizeAdjust(-2)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#3A3A3C',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>−</Text>
              </Pressable>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '600',
                  minWidth: 40,
                  textAlign: 'center',
                }}
              >
                {node.fontSize || 24}
              </Text>
              <Pressable
                onPress={() => handleTextSizeAdjust(2)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#3A3A3C',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>+</Text>
              </Pressable>
            </View>
            {/* Presets row */}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {TEXT_SIZE_PRESETS.map((size) => {
                const isActive = (node.fontSize || 24) === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => handleTextSizeSelect(size)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isActive ? '#3B82F6' : 'transparent',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: isActive ? '#FFFFFF' : '#9CA3AF',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ===== IMAGE NODE POPUPS ===== */}

      {/* Overlay font size popup (image only) */}
      {activePopup === 'fontSize' && (
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 8,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {OVERLAY_FONT_SIZE_OPTIONS.map((option) => {
              const isActive = (node.hoverFontSize || 'medium') === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleOverlayFontSizeSelect(option.value)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: isActive ? '#3B82F6' : 'transparent',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: isActive ? '#FFFFFF' : '#9CA3AF',
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Shape / aspect ratio popup (image only) */}
      {activePopup === 'shape' && (
        <View style={{ marginTop: 8 }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            {SHAPE_OPTIONS.map((option) => {
              const isActive = currentShape === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleShapeSelect(option.value, option.ratio)}
                  style={({ pressed }) => ({
                    width: 52,
                    alignItems: 'center',
                    gap: 6,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {option.value === 'original' ? (
                    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                      <LucideIcon name="image" size={24} color={isActive ? '#3B82F6' : '#666666'} />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: option.iconW,
                        height: option.iconH,
                        borderWidth: 2,
                        borderColor: isActive ? '#3B82F6' : '#666666',
                        borderRadius: 4,
                        ...(option.value === 'free' ? { borderStyle: 'dashed' as const } : {}),
                      }}
                    />
                  )}
                  <Text
                    style={{
                      color: isActive ? '#3B82F6' : '#9CA3AF',
                      fontSize: 10,
                      fontWeight: '500',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ===== SHARED POPUPS ===== */}

      {/* Layer operations popup */}
      {activePopup === 'layers' && (
        <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 8,
              width: 191,
              gap: 4,
            }}
          >
            {LAYER_ITEMS.map((item) => (
              <Pressable
                key={item.action}
                onPress={() => handleLayerAction(item.action)}
                style={({ pressed }) => ({
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: pressed ? '#3A3A3C' : 'transparent',
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}
