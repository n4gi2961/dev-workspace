import React, { useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { NodeOverlay, type OverlayData } from './NodeOverlay';
import type { Node } from '../../hooks/useNodes';
import type { Routine } from '@vision-board/shared/lib';

export type CanvasMode = 'view' | 'edit';

interface CanvasNodeProps {
  node: Node;
  isSelected: boolean;
  scale: SharedValue<number>;
  mode: CanvasMode;
  onSelect: (nodeId: string) => void;
  onDeselect: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onResizeEnd: (nodeId: string, width: number, height: number, x: number, y: number) => void;
  onDoubleTap: (nodeId: string) => void;
  // Overlay props (view mode)
  overlayActive?: boolean;
  overlayData?: OverlayData;
  onToggleOverlay?: (nodeId: string) => void;
  onOverlayToggleRoutine?: (nodeId: string, routine: Routine) => void;
  today?: string;
  onLongPress?: (nodeId: string) => void;
}

// Resize handle positions
type HandlePosition = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr';

function ResizeHandle({
  position,
  nodeWidth,
  nodeHeight,
  scale,
  resizeW,
  resizeH,
  resizeOx,
  resizeOy,
  onResizeEnd,
}: {
  position: HandlePosition;
  nodeWidth: number;
  nodeHeight: number;
  scale: SharedValue<number>;
  resizeW: SharedValue<number>;
  resizeH: SharedValue<number>;
  resizeOx: SharedValue<number>;
  resizeOy: SharedValue<number>;
  onResizeEnd: (dw: number, dh: number, dx: number, dy: number) => void;
}) {
  const isCorner = ['tl', 'tr', 'bl', 'br'].includes(position);
  const handleSize = isCorner ? 24 : 20;
  const hitArea = 32; // Larger hit area for touch

  // Position the handle
  const getPosition = () => {
    const half = handleSize / 2;
    switch (position) {
      case 'tl': return { top: -half, left: -half };
      case 'tr': return { top: -half, right: -half };
      case 'bl': return { bottom: -half, left: -half };
      case 'br': return { bottom: -half, right: -half };
      case 'tm': return { top: -half, left: nodeWidth / 2 - half };
      case 'bm': return { bottom: -half, left: nodeWidth / 2 - half };
      case 'ml': return { top: nodeHeight / 2 - half, left: -half };
      case 'mr': return { top: nodeHeight / 2 - half, right: -half };
    }
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      resizeW.value = 0;
      resizeH.value = 0;
      resizeOx.value = 0;
      resizeOy.value = 0;
    })
    .onUpdate((event) => {
      const dx = event.translationX / scale.value;
      const dy = event.translationY / scale.value;
      let dw = 0, dh = 0, ox = 0, oy = 0;
      if (position.includes('r')) { dw = dx; }
      if (position.includes('l')) { dw = -dx; ox = dx; }
      if (position.includes('b')) { dh = dy; }
      if (position.includes('t')) { dh = -dy; oy = dy; }
      resizeW.value = dw;
      resizeH.value = dh;
      resizeOx.value = ox;
      resizeOy.value = oy;
    })
    .onEnd(() => {
      runOnJS(onResizeEnd)(resizeW.value, resizeH.value, resizeOx.value, resizeOy.value);
    })
    .minDistance(0)
    .hitSlop({ top: hitArea, bottom: hitArea, left: hitArea, right: hitArea });

  const pos = getPosition();

  // Counter-scale so handles stay visually the same size regardless of zoom
  const handleScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: handleSize,
            height: handleSize,
            borderRadius: handleSize / 2,
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: '#3B82F6',
            zIndex: 10,
          },
          pos,
          handleScaleStyle,
        ]}
      />
    </GestureDetector>
  );
}

// --- Node content (shared between view and edit modes) ---

function NodeContent({
  node,
  overlayActive,
  overlayData,
}: {
  node: Node;
  overlayActive?: boolean;
  overlayData?: OverlayData;
}) {
  const blurRadius =
    overlayActive && overlayData
      ? Math.round(12 * (1 - (overlayData.clearPercent ?? 100) / 100))
      : 0;

  return (
    <>
      {node.type === 'image' && (
        node.src ? (
          <Image
            source={{ uri: node.src }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: node.cornerRadius ?? 12,
            }}
            contentFit="cover"
            transition={300}
            blurRadius={blurRadius}
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              borderRadius: node.cornerRadius ?? 12,
              backgroundColor: '#2A2A2A',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="small" color="#666" />
          </View>
        )
      )}
      {node.type === 'text' && (
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: node.fontSize || 24,
              color: node.color || '#FFFFFF',
              fontFamily: node.fontFamily,
            }}
          >
            {node.content || 'テキスト'}
          </Text>
        </View>
      )}
    </>
  );
}

// --- Main component ---

export const CanvasNode = React.memo(function CanvasNode({
  node,
  isSelected,
  scale,
  mode,
  onSelect,
  onDeselect,
  onDragEnd,
  onResizeEnd,
  onDoubleTap,
  overlayActive,
  overlayData,
  onToggleOverlay,
  onOverlayToggleRoutine,
  today,
  onLongPress,
}: CanvasNodeProps) {
  // --- View mode: lightweight rendering ---
  if (mode === 'view') {
    return (
      <Pressable
        onPress={() => {
          if (node.type === 'image' && onToggleOverlay) {
            onToggleOverlay(node.id);
          }
        }}
        onLongPress={() => {
          if (node.type === 'image' && onLongPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPress(node.id);
          }
        }}
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          zIndex: node.zIndex,
        }}
        // GPU rasterization for smooth pan/zoom (disabled when overlay is active for interactivity)
        shouldRasterizeIOS={!overlayActive}
        renderToHardwareTextureAndroid={!overlayActive}
      >
        <NodeContent node={node} overlayActive={overlayActive} overlayData={overlayData} />

        {/* Node overlay */}
        {overlayActive && overlayData && (
          <NodeOverlay
            data={overlayData}
            nodeWidth={node.width}
            nodeHeight={node.height}
            cornerRadius={node.cornerRadius}
            today={today ?? ''}
            onToggleRoutine={(routine) => onOverlayToggleRoutine?.(node.id, routine)}
          />
        )}
      </Pressable>
    );
  }

  // --- Edit mode: full gesture support ---
  return (
    <EditModeNode
      node={node}
      isSelected={isSelected}
      scale={scale}
      onSelect={onSelect}
      onDeselect={onDeselect}
      onDragEnd={onDragEnd}
      onResizeEnd={onResizeEnd}
      onDoubleTap={onDoubleTap}
    />
  );
});

// --- Edit mode sub-component (keeps gesture hooks stable) ---

function EditModeNode({
  node,
  isSelected,
  scale,
  onSelect,
  onDeselect,
  onDragEnd,
  onResizeEnd,
  onDoubleTap,
}: {
  node: Node;
  isSelected: boolean;
  scale: SharedValue<number>;
  onSelect: (nodeId: string) => void;
  onDeselect: () => void;
  onDragEnd: (nodeId: string, x: number, y: number) => void;
  onResizeEnd: (nodeId: string, width: number, height: number, x: number, y: number) => void;
  onDoubleTap: (nodeId: string) => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const posX = useSharedValue(node.x);
  const posY = useSharedValue(node.y);

  // Live resize preview shared values
  const resizeW = useSharedValue(0);
  const resizeH = useSharedValue(0);
  const resizeOx = useSharedValue(0);
  const resizeOy = useSharedValue(0);

  useEffect(() => {
    posX.value = node.x;
    posY.value = node.y;
    // Reset resize deltas when node props update (after resize commit)
    resizeW.value = 0;
    resizeH.value = 0;
    resizeOx.value = 0;
    resizeOy.value = 0;
  }, [node.x, node.y, node.width, node.height]);

  const handleDragEndJS = useCallback(
    (dx: number, dy: number) => {
      posX.value = node.x + dx;
      posY.value = node.y + dy;
      translateX.value = 0;
      translateY.value = 0;
      onDragEnd(node.id, node.x + dx, node.y + dy);
    },
    [node.id, node.x, node.y, onDragEnd, posX, posY, translateX, translateY],
  );

  const handleSelectJS = useCallback(() => {
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleDoubleTapJS = useCallback(() => {
    onDoubleTap(node.id);
  }, [node.id, onDoubleTap]);

  const handleResizeEndCb = useCallback(
    (dw: number, dh: number, dx: number, dy: number) => {
      const newWidth = Math.max(40, node.width + dw);
      const newHeight = Math.max(40, node.height + dh);
      const newX = node.x + dx;
      const newY = node.y + dy;
      onResizeEnd(node.id, newWidth, newHeight, newX, newY);
    },
    [node.id, node.width, node.height, node.x, node.y, onResizeEnd],
  );

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handleSelectJS)();
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTapJS)();
    });

  const panGesture = Gesture.Pan()
    .enabled(isSelected)
    .onUpdate((event) => {
      translateX.value = event.translationX / scale.value;
      translateY.value = event.translationY / scale.value;
    })
    .onEnd(() => {
      runOnJS(handleDragEndJS)(translateX.value, translateY.value);
    })
    .minDistance(5);

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(tapGesture, panGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    left: posX.value + translateX.value + resizeOx.value,
    top: posY.value + translateY.value + resizeOy.value,
    width: Math.max(40, node.width + resizeW.value),
    height: Math.max(40, node.height + resizeH.value),
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            zIndex: node.zIndex,
          },
          animatedStyle,
        ]}
      >
        {/* Selection border */}
        {isSelected && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderWidth: 2,
              borderColor: '#3B82F6',
              borderRadius: (node.cornerRadius ?? 12) + 2,
              zIndex: 5,
            }}
          />
        )}

        <NodeContent node={node} />

        {/* Resize handles (only when selected) */}
        {isSelected && (
          <>
            {(['tl', 'tr', 'bl', 'br', 'tm', 'bm', 'ml', 'mr'] as HandlePosition[]).map(
              (pos) => (
                <ResizeHandle
                  key={pos}
                  position={pos}
                  nodeWidth={node.width}
                  nodeHeight={node.height}
                  scale={scale}
                  resizeW={resizeW}
                  resizeH={resizeH}
                  resizeOx={resizeOx}
                  resizeOy={resizeOy}
                  onResizeEnd={handleResizeEndCb}
                />
              ),
            )}
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
