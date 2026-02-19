import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert, ActionSheetIOS, Platform, Pressable, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { getTodayString } from '@vision-board/shared/lib';
import { useClearPercent } from '@vision-board/shared';
import type { Routine } from '@vision-board/shared/lib';
import { useAuth } from '../../../hooks/useAuth';
import { useBoards } from '../../../hooks/useBoards';
import { useNodes } from '../../../hooks/useNodes';
import { usePages } from '../../../hooks/usePages';
import { useRoutines } from '../../../hooks/useRoutines';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { useI18n } from '../../../contexts/i18n';
import { useNavigation } from '../../../contexts/navigation';
import { useTimer } from '../../../contexts/timer';
import { parseTimerMinutes } from '../../../lib/parseTimerMinutes';
import { TopBar } from '../../../components/ui/TopBar';
import { LucideIcon } from '../../../components/ui/LucideIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardCanvas, type BoardCanvasRef } from '../../../components/canvas/BoardCanvas';
import { FABMenu } from '../../../components/canvas/FABMenu';
import { FAB } from '../../../components/ui/FAB';
import { UploadProgress } from '../../../components/ui/UploadProgress';
import { RippleEffect } from '../../../components/focus/RippleEffect';
import { MeteorEffect } from '../../../components/focus/MeteorEffect';
import { useFocusEffects } from '../../../hooks/useFocusEffects';
import type { CanvasMode } from '../../../components/canvas/CanvasNode';
import type { OverlayData } from '../../../components/canvas/NodeOverlay';

const TAB_BAR_CONTENT_HEIGHT = 78;

function showImageSourcePicker(): Promise<'camera' | 'gallery' | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['キャンセル', 'カメラで撮影', 'ライブラリから選択'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) resolve('camera');
          else if (index === 2) resolve('gallery');
          else resolve(null);
        },
      );
    } else {
      Alert.alert(
        '画像を追加',
        '画像のソースを選択してください',
        [
          { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
          { text: 'カメラで撮影', onPress: () => resolve('camera') },
          { text: 'ライブラリから選択', onPress: () => resolve('gallery') },
        ],
      );
    }
  });
}

export default function HomeScreen() {
  const canvasRef = useRef<BoardCanvasRef>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const { user, session } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { toggleDrawer, selectedBoardId, setSelectedBoardId, setTabBarVisible } = useNavigation();
  const { setupTimer } = useTimer();
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('view');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const today = useMemo(() => getTodayString(), []);

  // Ripple effect for routine check on board
  const effects = useFocusEffects(screenWidth, screenHeight);

  // Reset to view mode when board changes
  useEffect(() => {
    setCanvasMode('view');
    setIsFullscreen(false);
    setTabBarVisible(true);
  }, [selectedBoardId, setTabBarVisible]);

  const { boards, createBoard, getBoard, updateBoardSettings, refresh: refreshBoards } = useBoards(user?.id ?? null);
  const {
    nodes,
    loading,
    selectedNodeId,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    refresh: refreshNodes,
  } = useNodes(selectedBoardId, user?.id ?? null, session?.access_token ?? null);

  const {
    isUploading,
    progress,
    pickImage,
    uploadImage,
    syncPendingUploads,
  } = useImageUpload(user?.id ?? null, session?.access_token ?? null);

  // --- Overlay data hooks ---
  const { pages, getPage } = usePages(user?.id ?? null);
  const {
    getRoutinesForNode,
    getStacksForNode,
    toggleRoutineCheck,
    toggleStackCheck,
    isRoutineActiveToday,
    isMeteorWinner,
    reload: reloadRoutines,
  } = useRoutines(selectedBoardId, user?.id ?? null);
  const { recalculate, calculateAfterToggle } = useClearPercent();

  const selectedBoard = selectedBoardId ? getBoard(selectedBoardId) : undefined;

  // --- Image nodes + clearPercent pre-calculation ---
  const imageNodes = useMemo(
    () => nodes.filter((n) => n.type === 'image' && n.src),
    [nodes],
  );

  const imageNodeIds = useMemo(
    () => imageNodes.map((n) => n.id).join(','),
    [imageNodes],
  );

  const clearPercentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const node of imageNodes) {
      const routines = getRoutinesForNode(node.id).filter(isRoutineActiveToday);
      map[node.id] = routines.length === 0 ? 100 : recalculate(routines, []);
    }
    return map;
  }, [imageNodes, getRoutinesForNode, isRoutineActiveToday, recalculate]);

  const [cpOverrides, setCpOverrides] = useState<Record<string, number>>({});

  // Clear overrides when server data refreshes
  useEffect(() => {
    setCpOverrides((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, [clearPercentMap]);

  // Preload pages for all image nodes (skip temp nodes not yet persisted)
  useEffect(() => {
    imageNodes.forEach((node) => {
      if (!node.id.startsWith('temp_') && !pages[node.id]) {
        getPage(node.id);
      }
    });
  }, [imageNodeIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Overlay state management ---
  const [overlayNodeIds, setOverlayNodeIds] = useState<string[]>([]);
  const overlayNodeIdSet = useMemo(() => new Set(overlayNodeIds), [overlayNodeIds]);

  const handleToggleNodeOverlay = useCallback((nodeId: string) => {
    setOverlayNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    );
  }, []);

  // Double-tap canvas: toggle all image overlays at once
  const handleToggleAllOverlays = useCallback(() => {
    const allImageIds = imageNodes.map((n) => n.id);
    if (allImageIds.length === 0) return;
    setOverlayNodeIds((prev) =>
      prev.length > 0 ? [] : allImageIds,
    );
  }, [imageNodes]);

  const overlayDataMap = useMemo(() => {
    const map: Record<string, OverlayData> = {};
    for (const nodeId of overlayNodeIds) {
      const page = pages[nodeId];
      const nodeRoutines = getRoutinesForNode(nodeId).filter(isRoutineActiveToday);
      const node = nodes.find((n) => n.id === nodeId);
      map[nodeId] = {
        title: page?.title || '',
        routines: nodeRoutines,
        milestones: page?.milestones || [],
        clearPercent: cpOverrides[nodeId] ?? clearPercentMap[nodeId] ?? 100,
        hoverFontSize: node?.hoverFontSize,
        stacks: getStacksForNode(nodeId),
      };
    }
    return map;
  }, [overlayNodeIds, pages, getRoutinesForNode, getStacksForNode, isRoutineActiveToday, cpOverrides, clearPercentMap, nodes]);

  // Refs for stable callback access (avoid re-render cascade)
  const cpOverridesRef = useRef(cpOverrides);
  cpOverridesRef.current = cpOverrides;
  const clearPercentMapRef = useRef(clearPercentMap);
  clearPercentMapRef.current = clearPercentMap;
  const overlayDataMapRef = useRef(overlayDataMap);
  overlayDataMapRef.current = overlayDataMap;

  const handleOverlayToggleRoutine = useCallback(
    (nodeId: string, routine: Routine, event: GestureResponderEvent) => {
      const isChecking = !routine.history[today];
      if (isChecking) {
        const currentCp = cpOverridesRef.current[nodeId] ?? clearPercentMapRef.current[nodeId] ?? 100;
        const data = overlayDataMapRef.current[nodeId];
        if (data) {
          const newCp = calculateAfterToggle(
            currentCp, data.routines, [], routine.id, today, true,
          );
          setCpOverrides((prev) => ({ ...prev, [nodeId]: newCp }));
        }

        // Ripple effect from tap position
        const { pageX, pageY } = event.nativeEvent;
        const color = routine.color || '#8b5cf6';
        effects.triggerRipple(pageX, pageY, color);

        // 流星抽選当選時のエフェクト
        if (isMeteorWinner(routine.id)) {
          effects.triggerMeteor(color);
        }
      }
      toggleRoutineCheck(routine.id, today);
    },
    [today, calculateAfterToggle, toggleRoutineCheck, effects, isMeteorWinner],
  );

  const handleOverlayToggleStack = useCallback(
    (nodeId: string, stackId: string, positions: Array<{ routineId: string; x: number; y: number; color: string }>) => {
      const data = overlayDataMapRef.current[nodeId];
      if (!data) return;

      const stackRoutines = data.routines
        .filter((r) => r.stackId === stackId)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
      if (stackRoutines.length === 0) return;

      const allChecked = stackRoutines.every((r) => !!r.history[today]);
      const newChecked = !allChecked;
      const routinesToFire = stackRoutines.filter((r) => !!r.history[today] !== newChecked);

      // 500ms間隔で逐次リップル+流星（各ルーティンのアイコン位置から）
      if (newChecked) {
        routinesToFire.forEach((routine, i) => {
          const pos = positions.find((p) => p.routineId === routine.id);
          setTimeout(() => {
            const color = pos?.color || routine.color || '#6366F1';
            effects.triggerRipple(pos?.x ?? 0, pos?.y ?? 0, color);
            if (isMeteorWinner(routine.id)) effects.triggerMeteor(color);
          }, i * 500);
        });
      }

      toggleStackCheck(stackId, today);
    },
    [today, effects, isMeteorWinner, toggleStackCheck],
  );

  // Refresh data when screen gains focus (tab switch, back navigation)
  useFocusEffect(
    useCallback(() => {
      refreshBoards();
      refreshNodes();
      reloadRoutines();
    }, [refreshBoards, refreshNodes, reloadRoutines]),
  );

  // Sync pending image uploads when network comes back
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncPendingUploads(async (nodeId, publicUrl) => {
          await updateNode(nodeId, { src: publicUrl });
        });
      }
    });
    return () => unsubscribe();
  }, [syncPendingUploads, updateNode]);

  // --- Fullscreen mode ---
  const enterFullscreen = useCallback(() => {
    selectNode(null);
    setIsFullscreen(true);
    setTabBarVisible(false);
  }, [selectNode, setTabBarVisible]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setTabBarVisible(true);
  }, [setTabBarVisible]);

  const takeScreenshot = useCallback(async () => {
    setIsCapturing(true);
    // Wait for next frame so buttons are hidden
    requestAnimationFrame(async () => {
      try {
        const uri = await viewShotRef.current?.capture?.();
        if (uri) {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            Alert.alert('権限エラー', 'カメラロールへのアクセスが許可されていません');
          }
        }
      } catch (err) {
        console.error('Screenshot failed:', err);
      }
      setIsCapturing(false);
    });
  }, []);

  // --- Existing handlers ---
  const handleAddImage = useCallback(async () => {
    if (!selectedBoardId) {
      Alert.alert(
        t.canvas?.selectBoard || 'ボードを選択してください',
        t.canvas?.selectBoardHint || '左上のメニューからボードを選択',
      );
      return;
    }

    const source = await showImageSourcePicker();
    if (!source) return;

    try {
      const asset = await pickImage(source);
      if (!asset) return;

      const aspectRatio = asset.width / asset.height;
      const nodeWidth = 250;
      const nodeHeight = Math.round(nodeWidth / aspectRatio);
      const center = canvasRef.current?.getViewportCenter() ?? { x: 4800, y: 2700 };

      const placeholderNode = await addNode({
        type: 'image',
        x: center.x - nodeWidth / 2,
        y: center.y - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
        zIndex: nodes.length,
        src: asset.uri,
        cornerRadius: 12,
      });

      if (!placeholderNode) return;

      const result = await uploadImage(asset, selectedBoardId, placeholderNode.id);

      if (result.publicUrl) {
        await updateNode(placeholderNode.id, { src: result.publicUrl });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '画像の追加に失敗しました';
      Alert.alert('エラー', message);
    }
  }, [selectedBoardId, t, addNode, updateNode, nodes.length, pickImage, uploadImage]);

  const handleAddText = useCallback(async () => {
    if (!selectedBoardId) {
      Alert.alert(
        t.canvas?.selectBoard || 'ボードを選択してください',
        t.canvas?.selectBoardHint || '左上のメニューからボードを選択',
      );
      return;
    }
    const center = canvasRef.current?.getViewportCenter() ?? { x: 4800, y: 2700 };
    const newNode = await addNode({
      type: 'text',
      x: center.x - 100,
      y: center.y - 30,
      width: 200,
      height: 60,
      zIndex: nodes.length,
      content: '',
      fontSize: 24,
      color: '#FFFFFF',
    });
    if (newNode) {
      selectNode(newNode.id);
      // Wait for selection to propagate, then open text editor
      setTimeout(() => canvasRef.current?.openTextEditor(), 100);
    }
  }, [selectedBoardId, t, addNode, nodes.length, selectNode]);

  const handleDoneEditing = useCallback(() => {
    selectNode(null);
    setCanvasMode('view');
  }, [selectNode]);

  const handleOpenPage = useCallback((nodeId: string) => {
    selectNode(null);
    router.push(`/(main)/page/${nodeId}`);
  }, [selectNode]);

  const handleLongPressNode = useCallback((nodeId: string) => {
    router.push(`/(main)/page/${nodeId}`);
  }, []);

  const handleOverlayStartTimer = useCallback(
    (routine: Routine) => {
      const minutes = parseTimerMinutes(routine.title) || 25;
      setupTimer(
        { id: routine.id, title: routine.title, color: routine.color },
        minutes,
      );
      router.navigate('/(main)/(tabs)/timer');
    },
    [setupTimer],
  );

  const handleSaveViewport = useCallback((viewport: { scale: number; translateX: number; translateY: number }) => {
    if (!selectedBoardId) return;
    updateBoardSettings(selectedBoardId, { viewport });
  }, [selectedBoardId, updateBoardSettings]);

  const handleCreateBoard = useCallback(async () => {
    const newBoard = await createBoard(t.board?.newBoardDefault);
    if (newBoard) {
      setSelectedBoardId(newBoard.id);
    }
  }, [createBoard, t.board?.newBoardDefault, setSelectedBoardId]);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* StatusBar — hide in fullscreen */}
      <StatusBar hidden={isFullscreen} />

      {/* TopBar — hide in fullscreen */}
      {!isFullscreen && (
        <TopBar
          title={selectedBoard?.title || ''}
          leftIcon="menu"
          onLeftPress={toggleDrawer}
          rightIcon="sparkles"
          rightIconColor="#FFD700"
          showRight={!!selectedBoardId}
          onRightPress={() => {
            if (selectedBoardId) {
              router.push(`/(main)/star-stack/${selectedBoardId}` as any);
            }
          }}
        />
      )}

      {/* Canvas + ViewShot wrapper */}
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <BoardCanvas
          ref={canvasRef}
          boardId={selectedBoardId}
          nodes={nodes}
          loading={loading}
          selectedNodeId={selectedNodeId}
          mode={isFullscreen ? 'view' : canvasMode}
          onSelectNode={selectNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onBringToFront={bringToFront}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onSendToBack={sendToBack}
          onOpenPage={handleOpenPage}
          overlayNodeIds={overlayNodeIdSet}
          overlayDataMap={overlayDataMap}
          onToggleNodeOverlay={handleToggleNodeOverlay}
          onOverlayToggleRoutine={handleOverlayToggleRoutine}
          onOverlayToggleStack={handleOverlayToggleStack}
          onOverlayStartTimer={handleOverlayStartTimer}
          today={today}
          showZoomIndicator={!isFullscreen}
          onLongPressNode={handleLongPressNode}
          onDoubleTapCanvas={handleToggleAllOverlays}
          backgroundType={selectedBoard?.background_type}
          onSaveViewport={handleSaveViewport}
          onTextEditorVisibleChange={setIsTextEditorOpen}
        />
      </ViewShot>

      {/* Ripple Effect Layer */}
      {effects.rippleState && (
        <RippleEffect
          rippleState={effects.rippleState}
          rippleRadius={effects.rippleRadius}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      )}

      {/* Meteor Effect Layer */}
      <MeteorEffect
        meteorProgress={effects.meteorProgress}
        meteorActive={effects.meteorActive}
        meteorColor={effects.meteorColor}
        meteorStartOffset={effects.meteorStartOffset}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
      />

      {/* Upload Progress */}
      <UploadProgress visible={isUploading} progress={progress} />

      {/* Normal mode: fullscreen button (left-bottom, above zoom indicator) */}
      {!isFullscreen && selectedBoardId && canvasMode === 'view' && (
        <View style={{ position: 'absolute', left: 16, bottom: tabBarHeight + 16 + 44, zIndex: 50 }}>
          <Pressable
            onPress={enterFullscreen}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(31,41,55,0.8)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <LucideIcon name="maximize" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Fullscreen mode: minimize + screenshot (hidden while capturing) */}
      {isFullscreen && !isCapturing && (
        <>
          {/* Minimize button (bottom-left) */}
          <View style={{ position: 'absolute', left: 16, bottom: 16 + insets.bottom, zIndex: 100 }}>
            <Pressable
              onPress={exitFullscreen}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <LucideIcon name="minimize" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          {/* Screenshot button (bottom-right) */}
          <View style={{ position: 'absolute', right: 16, bottom: 16 + insets.bottom, zIndex: 100 }}>
            <Pressable
              onPress={takeScreenshot}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <LucideIcon name="camera" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
        </>
      )}

      {/* Edit button (view mode, not fullscreen) */}
      {!isFullscreen && selectedBoardId && canvasMode === 'view' && (
        <View style={{ position: 'absolute', right: 24, bottom: tabBarHeight + 16, zIndex: 100 }}>
          <FAB icon="pen-line" onPress={() => setCanvasMode('edit')} />
        </View>
      )}

      {/* FAB Menu (edit mode, not fullscreen, not during text editing) */}
      {!isFullscreen && selectedBoardId && canvasMode === 'edit' && !isTextEditorOpen && (
        <FABMenu onAddImage={handleAddImage} onAddText={handleAddText} onDone={handleDoneEditing} />
      )}
    </View>
  );
}
