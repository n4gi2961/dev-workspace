import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { LucideIcon } from '../ui/LucideIcon';
import type { Node } from '../../hooks/useNodes';

const CANVAS_WIDTH = 9600;
const CANVAS_HEIGHT = 5400;
const TOOLBAR_WIDTH = 320;
const TOOLBAR_HEIGHT = 45;
const TOOLBAR_GAP = 12;

type PopupType = 'shape' | 'layers' | 'size' | null;

interface NodeToolbarProps {
  node: Node;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  onEdit: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onUpdateNode: (updates: Partial<Node>) => void;
  onOpenPage?: (nodeId: string) => void;
}

const SHAPE_OPTIONS: { label: string; ratio: number | null }[] = [
  { label: 'FREE', ratio: null },
  { label: 'ORIGINAL', ratio: null },
  { label: 'PORT', ratio: 3 / 4 },
  { label: 'SQUARE', ratio: 1 },
  { label: 'LAND', ratio: 4 / 3 },
];

const SIZE_PRESETS = [
  { label: 'Large', width: 400, height: 400 },
  { label: 'Medium', width: 250, height: 250 },
  { label: 'Small', width: 150, height: 150 },
];

const LAYER_ITEMS = [
  { label: '最前面に移動', action: 'bringToFront' },
  { label: '前面に移動', action: 'bringForward' },
  { label: '背面に移動', action: 'sendBackward' },
  { label: '最背面に移動', action: 'sendToBack' },
] as const;

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

function ToolbarTextButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 1,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
        A
      </Text>
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>
        A
      </Text>
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

export function NodeToolbar({
  node,
  scale,
  translateX,
  translateY,
  onEdit,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onUpdateNode,
  onOpenPage,
}: NodeToolbarProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [activePopup, setActivePopup] = useState<PopupType>(null);

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

  const handleLayerAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'bringToFront':
          onBringToFront();
          break;
        case 'bringForward':
          onBringForward();
          break;
        case 'sendBackward':
          onSendBackward();
          break;
        case 'sendToBack':
          onSendToBack();
          break;
      }
      closePopup();
    },
    [onBringToFront, onBringForward, onSendBackward, onSendToBack, closePopup],
  );

  const handleShapeSelect = useCallback(
    (ratio: number | null) => {
      if (ratio !== null) {
        const newHeight = Math.round(node.width / ratio);
        onUpdateNode({ height: newHeight });
      }
      closePopup();
    },
    [node.width, onUpdateNode, closePopup],
  );

  const handleSizeSelect = useCallback(
    (width: number, height: number) => {
      onUpdateNode({ width, height });
      closePopup();
    },
    [onUpdateNode, closePopup],
  );

  // Screen-fixed positioning: convert node canvas coords to screen space
  const toolbarStyle = useAnimatedStyle(() => {
    const nodeBottomCenterX = node.x + node.width / 2;
    const nodeBottomY = node.y + node.height;
    const nodeTopY = node.y;

    let screenX =
      screenWidth / 2 +
      translateX.value +
      (nodeBottomCenterX - CANVAS_WIDTH / 2) * scale.value -
      TOOLBAR_WIDTH / 2;
    let screenY =
      screenHeight / 2 +
      translateY.value +
      (nodeBottomY - CANVAS_HEIGHT / 2) * scale.value +
      TOOLBAR_GAP;

    // Clamp horizontal: keep toolbar within screen
    screenX = Math.max(8, Math.min(screenWidth - TOOLBAR_WIDTH - 8, screenX));

    // If toolbar goes off bottom, place it above the node instead
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
      {/* Toolbar bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#2C2C2E',
          borderRadius: 24,
          height: TOOLBAR_HEIGHT,
          width: TOOLBAR_WIDTH,
          paddingHorizontal: 14,
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <ToolbarIconButton
          name="square-pen"
          size={24}
          onPress={node.type === 'image' && onOpenPage
            ? () => onOpenPage(node.id)
            : onEdit}
        />
        <Separator />
        <ToolbarTextButton onPress={() => togglePopup('size')} />
        <ToolbarIconButton
          name="square"
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
      </View>

      {/* Shape select popup */}
      {activePopup === 'shape' && (
        <View style={{ marginTop: 8 }}>
          <View
            style={{
              backgroundColor: '#2C2C2E',
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              gap: 6,
              justifyContent: 'space-between',
            }}
          >
            {SHAPE_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => handleShapeSelect(option.ratio)}
                style={({ pressed }) => ({
                  width: 52,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderWidth: 2,
                    borderColor:
                      option.label === 'FREE' ? '#3B82F6' : '#666666',
                    borderRadius: 4,
                  }}
                />
                <Text
                  style={{
                    color:
                      option.label === 'FREE' ? '#3B82F6' : '#9CA3AF',
                    fontSize: 10,
                    fontWeight: '500',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Layer operations popup */}
      {activePopup === 'layers' && (
        <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <View style={{ gap: 10, width: 191 }}>
            {LAYER_ITEMS.map((item) => (
              <Pressable
                key={item.action}
                onPress={() => handleLayerAction(item.action)}
                style={({ pressed }) => ({
                  backgroundColor: '#2C2C2E',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: pressed ? 0.6 : 1,
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

      {/* Size presets popup */}
      {activePopup === 'size' && (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {SIZE_PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() =>
                  handleSizeSelect(preset.width, preset.height)
                }
                style={({ pressed }) => ({
                  backgroundColor: '#2C2C2E',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flex: 1,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}
