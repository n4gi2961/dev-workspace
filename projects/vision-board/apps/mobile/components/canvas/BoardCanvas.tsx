import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackground } from '../../constants/boardBackgrounds';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  SharedValue,
  runOnJS,
  withDecay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Move } from 'lucide-react-native';
import { useI18n } from '../../contexts/i18n';
import { CanvasNode, type CanvasMode } from './CanvasNode';
import type { OverlayData } from './NodeOverlay';
import { NodeToolbar } from './NodeToolbar';
import { TextEditor } from './TextEditor';
import type { Node } from '../../hooks/useNodes';
import type { Routine } from '@vision-board/shared/lib';

// --- Viewport persistence helpers ---
interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

const VIEWPORT_PREFIX = 'viewport_';

// --- Module-level memory cache for instant board switching ---
const viewportMemoryCache = new Map<string, ViewportState>();

export async function preloadBoardViewports(boardIds: string[]): Promise<void> {
  const toLoad = boardIds.filter((id) => !viewportMemoryCache.has(id));
  if (toLoad.length === 0) return;
  await Promise.all(
    toLoad.map(async (id) => {
      try {
        const raw = await AsyncStorage.getItem(VIEWPORT_PREFIX + id);
        if (raw) viewportMemoryCache.set(id, JSON.parse(raw));
      } catch {}
    }),
  );
}

async function loadViewport(boardId: string): Promise<ViewportState | null> {
  try {
    const raw = await AsyncStorage.getItem(VIEWPORT_PREFIX + boardId);
    if (raw) return JSON.parse(raw) as ViewportState;
  } catch { /* ignore */ }
  return null;
}

async function saveViewport(boardId: string, state: ViewportState): Promise<void> {
  viewportMemoryCache.set(boardId, state);
  try {
    await AsyncStorage.setItem(VIEWPORT_PREFIX + boardId, JSON.stringify(state));
  } catch { /* ignore */ }
}

interface BoardCanvasProps {
  boardId: string | null;
  nodes: Node[];
  loading: boolean;
  selectedNodeId: string | null;
  mode: CanvasMode;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNode: (nodeId: string, updates: Partial<Node>) => void;
  onDeleteNode: (nodeId: string) => void;
  onBringToFront: (nodeId: string) => void;
  onBringForward: (nodeId: string) => void;
  onSendBackward: (nodeId: string) => void;
  onSendToBack: (nodeId: string) => void;
  onOpenPage?: (nodeId: string) => void;
  // Overlay props (view mode)
  overlayNodeIds?: Set<string>;
  overlayDataMap?: Record<string, OverlayData>;
  onToggleNodeOverlay?: (nodeId: string) => void;
  onOverlayToggleRoutine?: (nodeId: string, routine: Routine) => void;
  onOverlayStartTimer?: (routine: Routine) => void;
  today?: string;
  showZoomIndicator?: boolean;
  onLongPressNode?: (nodeId: string) => void;
  onDoubleTapCanvas?: () => void;
  backgroundType?: string;
  onSaveViewport?: (viewport: { scale: number; translateX: number; translateY: number }) => void;
  onTextEditorVisibleChange?: (visible: boolean) => void;
}

export const CANVAS_WIDTH = 4800;
export const CANVAS_HEIGHT = 2700;
const TAB_BAR_CONTENT_HEIGHT = 78;

export interface BoardCanvasRef {
  getViewportCenter: () => { x: number; y: number };
  openTextEditor: () => void;
  isTextEditorOpen: () => boolean;
}

// Zoom indicator component
function ZoomIndicator({ scale, bottomOffset }: { scale: SharedValue<number>; bottomOffset: number }) {
  const [zoomPercent, setZoomPercent] = useState(16);

  useAnimatedReaction(
    () => Math.round(scale.value * 100),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setZoomPercent)(current);
      }
    },
  );

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 16,
        backgroundColor: 'rgba(31,41,55,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        zIndex: 50,
      }}
    >
      <Text className="text-white text-sm font-medium">
        {zoomPercent}%
      </Text>
    </View>
  );
}

export const BoardCanvas = forwardRef<BoardCanvasRef, BoardCanvasProps>(
  function BoardCanvas({
    boardId,
    nodes,
    loading,
    selectedNodeId,
    mode,
    onSelectNode,
    onUpdateNode,
    onDeleteNode,
    onBringToFront,
    onBringForward,
    onSendBackward,
    onSendToBack,
    onOpenPage,
    overlayNodeIds,
    overlayDataMap,
    onToggleNodeOverlay,
    onOverlayToggleRoutine,
    onOverlayStartTimer,
    today,
    showZoomIndicator,
    onLongPressNode,
    onDoubleTapCanvas,
    backgroundType,
    onSaveViewport,
    onTextEditorVisibleChange,
  }, ref) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

    // Stable no-op callbacks for view mode (prevents React.memo invalidation)
    const NOOP_SELECT = useCallback((_: string) => { }, []);
    const NOOP_VOID = useCallback(() => { }, []);
    const NOOP_DRAG = useCallback((_id: string, _x: number, _y: number) => { }, []);
    const NOOP_RESIZE = useCallback((_id: string, _w: number, _h: number, _x: number, _y: number) => { }, []);
    const NOOP_DOUBLE_TAP = useCallback((_id: string) => { }, []);

    // Editor state
    const [editorType, setEditorType] = useState<'text' | null>(null);

    // Notify parent when text editor visibility changes
    useEffect(() => {
      onTextEditorVisibleChange?.(editorType === 'text');
    }, [editorType, onTextEditorVisibleChange]);

    // Minimum scale: canvas must always fill the screen
    const minScale = Math.max(screenWidth / CANVAS_WIDTH, screenHeight / CANVAS_HEIGHT);

    // Canvas transform values
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // --- Viewport persistence ---
    const prevBoardIdRef = useRef<string | null>(null);
    const viewportLoadedRef = useRef(false);
    const onSaveViewportRef = useRef(onSaveViewport);
    onSaveViewportRef.current = onSaveViewport;

    // Helper: capture current viewport state (called from JS thread via runOnJS)
    const getCurrentViewport = useCallback((): ViewportState => ({
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value,
    }), [scale, translateX, translateY]);

    // Save viewport for a given boardId
    const persistViewport = useCallback((id: string) => {
      const vp = getCurrentViewport();
      saveViewport(id, vp);
      onSaveViewportRef.current?.(vp);
    }, [getCurrentViewport]);

    // Reset viewport to canvas center at 100% zoom
    const resetToCenter = useCallback(() => {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    }, [scale, translateX, translateY]);

    // Load viewport when boardId changes (memory cache first for instant switch)
    useEffect(() => {
      const prev = prevBoardIdRef.current;
      // Save previous board's viewport
      if (prev && prev !== boardId) {
        persistViewport(prev);
      }
      prevBoardIdRef.current = boardId;
      viewportLoadedRef.current = false;

      if (!boardId) return;

      // Try synchronous memory cache first
      const memVp = viewportMemoryCache.get(boardId);
      if (memVp) {
        const clampedScale = Math.min(Math.max(memVp.scale, minScale), 3);
        scale.value = clampedScale;
        translateX.value = memVp.translateX;
        translateY.value = memVp.translateY;
        viewportLoadedRef.current = true;
        return;
      }

      // Fallback to AsyncStorage (for boards not yet preloaded)
      loadViewport(boardId).then((vp) => {
        if (viewportLoadedRef.current) return;
        if (vp) {
          const clampedScale = Math.min(Math.max(vp.scale, minScale), 3);
          scale.value = clampedScale;
          translateX.value = vp.translateX;
          translateY.value = vp.translateY;
          viewportMemoryCache.set(boardId, vp);
        } else {
          // New board: center at 100% zoom
          resetToCenter();
        }
        viewportLoadedRef.current = true;
      });
    }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Save viewport when app goes to background
    useEffect(() => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'background' || state === 'inactive') {
          if (boardId) persistViewport(boardId);
        }
      });
      return () => sub.remove();
    }, [boardId, persistViewport]);

    // Expose viewport center to parent (for placing nodes at screen center)
    useImperativeHandle(ref, () => ({
      getViewportCenter: () => ({
        x: CANVAS_WIDTH / 2 - translateX.value / scale.value,
        y: CANVAS_HEIGHT / 2 - translateY.value / scale.value,
      }),
      openTextEditor: () => {
        setEditorType('text');
        // Scroll to show the selected node above the editor
        const selNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
        if (selNode) scrollToShowNode(selNode);
      },
      isTextEditorOpen: () => editorType === 'text',
    }));

    const selectedNode = selectedNodeId
      ? nodes.find((n) => n.id === selectedNodeId) ?? null
      : null;

    // Canvas tap to deselect
    const handleCanvasDeselect = useCallback(() => {
      onSelectNode(null);
      setEditorType(null);
    }, [onSelectNode]);

    // Double-tap on canvas background to toggle all overlays
    const handleCanvasDoubleTap = useCallback(() => {
      if (mode === 'view' && onDoubleTapCanvas) {
        onDoubleTapCanvas();
      }
    }, [mode, onDoubleTapCanvas]);

    // Node drag end → update position
    const handleDragEnd = useCallback(
      (nodeId: string, x: number, y: number) => {
        onUpdateNode(nodeId, { x: Math.round(x), y: Math.round(y) });
      },
      [onUpdateNode],
    );

    // Node resize end → update dimensions and position
    const handleResizeEnd = useCallback(
      (nodeId: string, width: number, height: number, x: number, y: number) => {
        onUpdateNode(nodeId, {
          width: Math.round(width),
          height: Math.round(height),
          x: Math.round(x),
          y: Math.round(y),
        });
      },
      [onUpdateNode],
    );

    // Scroll canvas so that the selected text node is visible above the editor modal
    // The modal takes roughly the bottom 45% of the screen; target the node at ~30% from top
    const scrollToShowNode = useCallback(
      (node: Node) => {
        const targetScreenY = screenHeight * 0.25;
        const nodeCenterY = node.y + node.height / 2;
        const currentScreenY =
          screenHeight / 2 + translateY.value + (nodeCenterY - CANVAS_HEIGHT / 2) * scale.value;
        const diff = targetScreenY - currentScreenY;
        if (Math.abs(diff) > 20) {
          translateY.value = withTiming(translateY.value + diff, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
        }
      },
      [screenHeight, scale, translateY],
    );

    // Double-tap node → open text editor (for text nodes only)
    const handleDoubleTap = useCallback(
      (nodeId: string) => {
        if (mode !== 'edit') return;
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        onSelectNode(nodeId);
        if (node.type === 'text') {
          setEditorType('text');
          scrollToShowNode(node);
        }
      },
      [mode, nodes, onSelectNode, scrollToShowNode],
    );

    // Delete with confirmation
    const handleDelete = useCallback(() => {
      if (!selectedNodeId) return;
      Alert.alert(
        '削除の確認',
        'このノードを削除しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => {
              onDeleteNode(selectedNodeId);
              setEditorType(null);
            },
          },
        ],
      );
    }, [selectedNodeId, onDeleteNode]);

    // Open editor from toolbar (text editor only)
    const handleEditFromToolbar = useCallback(() => {
      if (!selectedNode) return;
      if (selectedNode.type === 'text') {
        setEditorType('text');
      }
    }, [selectedNode]);

    // Close editor
    const handleCloseEditor = useCallback(() => {
      setEditorType(null);
    }, []);

    // Pinch gesture for zoom (focal-point based)
    const pinchGesture = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        // Dampen zoom speed to 50% for finer control
        const dampedScale = 1 + (event.scale - 1) * 0.5;
        const newScale = Math.min(Math.max(savedScale.value * dampedScale, minScale), 3);

        // Focal point in screen coordinates
        const focalX = event.focalX;
        const focalY = event.focalY;

        // Transform origin = 要素の中心 = (screenWidth/2, screenHeight/2)
        const pointX = (focalX - screenWidth / 2 - savedTranslateX.value) / savedScale.value;
        const pointY = (focalY - screenHeight / 2 - savedTranslateY.value) / savedScale.value;

        // Focal-point anchored translate
        let newTx = focalX - screenWidth / 2 - pointX * newScale;
        let newTy = focalY - screenHeight / 2 - pointY * newScale;

        // Clamp: viewport must stay within canvas bounds
        const maxTx = CANVAS_WIDTH / 2 * newScale - screenWidth / 2;
        const maxTy = CANVAS_HEIGHT / 2 * newScale - screenHeight / 2;
        translateX.value = Math.min(maxTx, Math.max(-maxTx, newTx));
        translateY.value = Math.min(maxTy, Math.max(-maxTy, newTy));
        scale.value = newScale;
      });

    // Pan gesture for canvas movement (single-finger only; two-finger pan is handled by pinch)
    const panGesture = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        // Clamp: viewport must stay within canvas bounds
        const maxTx = CANVAS_WIDTH / 2 * scale.value - screenWidth / 2;
        const maxTy = CANVAS_HEIGHT / 2 * scale.value - screenHeight / 2;
        translateX.value = Math.min(maxTx, Math.max(-maxTx, savedTranslateX.value + event.translationX));
        translateY.value = Math.min(maxTy, Math.max(-maxTy, savedTranslateY.value + event.translationY));
      })
      .onEnd((event) => {
        // Inertial scrolling: canvas glides after finger release
        const maxTx = CANVAS_WIDTH / 2 * scale.value - screenWidth / 2;
        const maxTy = CANVAS_HEIGHT / 2 * scale.value - screenHeight / 2;
        translateX.value = withDecay({
          velocity: event.velocityX,
          deceleration: 0.990,
          clamp: [-maxTx, maxTx],
        });
        translateY.value = withDecay({
          velocity: event.velocityY,
          deceleration: 0.990,
          clamp: [-maxTy, maxTy],
        });
      });

    // Double-tap on canvas background to toggle all overlays
    const canvasDoubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        runOnJS(handleCanvasDoubleTap)();
      });

    // Tap on canvas background to deselect
    const canvasTapGesture = Gesture.Tap()
      .onEnd(() => {
        runOnJS(handleCanvasDeselect)();
      });

    // Combine gestures: double-tap takes priority over single tap
    const composedGesture = Gesture.Race(
      Gesture.Exclusive(canvasDoubleTapGesture, canvasTapGesture),
      Gesture.Simultaneous(pinchGesture, panGesture),
    );

    const canvasStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    // No board selected placeholder
    if (!boardId) {
      return (
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <View className="items-center">
            <View className="w-20 h-20 bg-gray-800 rounded-2xl items-center justify-center mb-4">
              <Move size={40} color="#6B7280" />
            </View>
            <Text className="text-gray-400 text-lg font-medium mb-2">
              {t.canvas?.selectBoard || 'ボードを選択してください'}
            </Text>
            <Text className="text-gray-500 text-sm text-center px-8">
              {t.canvas?.selectBoardHint || '左上のメニューからボードを選択'}
            </Text>
          </View>
        </View>
      );
    }

    // Loading state
    if (loading) {
      return (
        <View className="flex-1 bg-gray-900 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    const bg = getBackground(backgroundType);

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: bg.color || '#111827' }}>
          {/* GestureDetector wraps a full-screen View so focalX/Y are in screen coords */}
          <GestureDetector gesture={composedGesture}>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Animated.View
                style={[
                  {
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    position: 'absolute',
                    left: screenWidth / 2 - CANVAS_WIDTH / 2,
                    top: screenHeight / 2 - CANVAS_HEIGHT / 2,
                  },
                  canvasStyle,
                ]}
              >
                {/* Background pattern layer */}
                {bg.pattern && (
                  <Image
                    source={bg.pattern}
                    style={{
                      position: 'absolute',
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      top: 0,
                      left: 0,
                    }}
                    resizeMode="repeat"
                    pointerEvents="none"
                  />
                )}

                {/* Canvas boundary - corner markers */}
                {([
                  { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2 },
                  { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2 },
                  { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2 },
                  { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2 },
                ] as const).map((cornerStyle, i) => (
                  <View
                    key={i}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 48,
                      height: 48,
                      borderColor: '#374151',
                      ...cornerStyle,
                    }}
                  />
                ))}

                {/* Render nodes */}
                {nodes.map((node) => (
                  <CanvasNode
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    scale={scale}
                    mode={mode}
                    onSelect={mode === 'edit' ? onSelectNode : NOOP_SELECT}
                    onDeselect={mode === 'edit' ? handleCanvasDeselect : NOOP_VOID}
                    onDragEnd={mode === 'edit' ? handleDragEnd : NOOP_DRAG}
                    onResizeEnd={mode === 'edit' ? handleResizeEnd : NOOP_RESIZE}
                    onDoubleTap={mode === 'edit' ? handleDoubleTap : NOOP_DOUBLE_TAP}
                    overlayActive={overlayNodeIds?.has(node.id) ?? false}
                    overlayData={overlayDataMap?.[node.id]}
                    onToggleOverlay={onToggleNodeOverlay}
                    onOverlayToggleRoutine={onOverlayToggleRoutine}
                    onOverlayStartTimer={onOverlayStartTimer}
                    today={today}
                    onLongPress={onLongPressNode}
                  />
                ))}

              </Animated.View>
            </View>
          </GestureDetector>

          {/* Node toolbar (screen-fixed, outside canvas) */}
          {mode === 'edit' && selectedNode && editorType !== 'text' && (
            <NodeToolbar
              node={selectedNode}
              scale={scale}
              translateX={translateX}
              translateY={translateY}
              onDelete={handleDelete}
              onBringToFront={() => onBringToFront(selectedNode.id)}
              onBringForward={() => onBringForward(selectedNode.id)}
              onSendBackward={() => onSendBackward(selectedNode.id)}
              onSendToBack={() => onSendToBack(selectedNode.id)}
              onUpdateNode={(updates) => onUpdateNode(selectedNode.id, updates)}
            />
          )}

          {/* Drag hint */}
          {mode === 'edit' && !selectedNodeId && (
            <View className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/70 px-4 py-2 rounded-full">
              <Text className="text-gray-300 text-sm">
                {t.canvas?.dragToMove || 'ドラッグして移動'}
              </Text>
            </View>
          )}

          {/* Zoom indicator (above tab bar) */}
          {showZoomIndicator !== false && (
            <ZoomIndicator scale={scale} bottomOffset={tabBarHeight + 16} />
          )}

          {/* Text Editor (bottom sheet) */}
          {mode === 'edit' && selectedNode && selectedNode.type === 'text' && (
            <TextEditor
              node={selectedNode}
              visible={editorType === 'text'}
              onClose={handleCloseEditor}
              onUpdateNode={(updates) => onUpdateNode(selectedNode.id, updates)}
              onDelete={handleDelete}
            />
          )}
        </View>
      </GestureHandlerRootView>
    );
  },
);
