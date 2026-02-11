import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  useWindowDimensions,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  ScrollView,
  type GestureResponderEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import { Image } from 'expo-image';
import { Plus, Check, Circle, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayString } from '@vision-board/shared/lib';
import { useClearPercent } from '@vision-board/shared';
import type { Routine, Milestone } from '@vision-board/shared/lib';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigation } from '../../../contexts/navigation';
import { useNodes, type Node } from '../../../hooks/useNodes';
import { usePages } from '../../../hooks/usePages';
import { useRoutines } from '../../../hooks/useRoutines';
import { useFocusEffects } from '../../../hooks/useFocusEffects';
import { RippleEffect } from '../../../components/focus/RippleEffect';
import { MeteorEffect } from '../../../components/focus/MeteorEffect';

// --- Utilities ---

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function computeContainerSize(
  nodeWidth: number,
  nodeHeight: number,
  screenWidth: number,
  screenHeight: number,
): { width: number; height: number } {
  const aspect = nodeWidth / nodeHeight;
  if (screenWidth / screenHeight > aspect) {
    return { width: screenHeight * aspect, height: screenHeight };
  } else {
    return { width: screenWidth, height: screenWidth / aspect };
  }
}

// --- Overlay Content ---

interface OverlayData {
  title: string;
  routines: Routine[];
  milestones: Milestone[];
}

function FocusOverlay({
  data,
  today,
  onToggleRoutine,
  screenHeight,
}: {
  data: OverlayData;
  today: string;
  onToggleRoutine: (routine: Routine, event: GestureResponderEvent) => void;
  screenHeight: number;
}) {
  const insets = useSafeAreaInsets();
  const activeRoutines = data.routines;
  const completedMilestones = data.milestones.filter((m) => m.completed);
  const pendingMilestones = data.milestones.filter((m) => !m.completed);

  // コンテンツ領域は画面上部65%まで。下部35%はPagerViewスワイプ領域
  const contentMaxHeight = screenHeight * 0.65 - (insets.top + 16);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      pointerEvents="box-none"
    >
      {/* Semi-transparent scrim — full screen, visual only */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
        pointerEvents="none"
      />
      {/* Content panel — top-anchored, stops at 65% of screen */}
      <ScrollView
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 0,
          right: 0,
          maxHeight: contentMaxHeight,
        }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        {data.title ? (
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: '#FFFFFF',
              marginBottom: 72,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {data.title}
          </Text>
        ) : null}

        {/* Routines section */}
        {activeRoutines.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 10,
                textShadowColor: 'rgba(0,0,0,0.4)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              今日できること
            </Text>
            {activeRoutines.map((routine) => {
              const isChecked = !!routine.history[today];
              return (
                <TouchableOpacity
                  key={routine.id}
                  onPress={(event) => onToggleRoutine(routine, event)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginBottom: 4,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  {isChecked ? (
                    <CheckCircle2 size={20} color={routine.color} fill={routine.color} />
                  ) : (
                    <Circle size={20} color="rgba(255,255,255,0.5)" />
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: '#FFFFFF',
                      marginLeft: 12,
                      flex: 1,
                      textDecorationLine: isChecked ? 'line-through' : 'none',
                      opacity: isChecked ? 0.6 : 1,
                    }}
                  >
                    {routine.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Milestones section */}
        {data.milestones.length > 0 && (
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 10,
                textShadowColor: 'rgba(0,0,0,0.4)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              達成への道のり
            </Text>
            {[...completedMilestones, ...pendingMilestones].map((milestone) => (
              <View
                key={milestone.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginBottom: 4,
                }}
              >
                {milestone.completed ? (
                  <Check size={18} color="#10B981" />
                ) : (
                  <Circle size={18} color="rgba(255,255,255,0.35)" />
                )}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: milestone.completed
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(255,255,255,0.9)',
                    marginLeft: 12,
                    flex: 1,
                  }}
                >
                  {milestone.title}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// --- Image Page ---

const FocusImagePage = React.memo(function FocusImagePage({
  node,
  screenWidth,
  screenHeight,
  clearPercent,
  overlayVisible,
  onPress,
}: {
  node: Node;
  screenWidth: number;
  screenHeight: number;
  clearPercent: number;
  overlayVisible: boolean;
  onPress?: () => void;
}) {
  const container = computeContainerSize(
    node.width,
    node.height,
    screenWidth,
    screenHeight,
  );
  // ブラーはオーバーレイ表示中かつ clearPercent < 100 の場合のみ適用
  const shouldBlur = overlayVisible && clearPercent < 100;
  const mainImageBlur = shouldBlur ? Math.round(12 * (1 - clearPercent / 100)) : 0;
  const veilOpacity = shouldBlur ? 0.25 * (1 - clearPercent / 100) : 0;

  return (
    <Pressable style={{ flex: 1, backgroundColor: '#000' }} onPress={onPress}>
      <View style={{ flex: 1 }}>
        {/* Background blur layer */}
        <Image
          source={{ uri: node.src }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          blurRadius={60}
        />
        {/* Dark overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.15)',
          }}
        />
        {/* Main image — blur decreases as clearPercent increases */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={{ uri: node.src }}
            style={{ width: container.width, height: container.height }}
            contentFit="cover"
            transition={200}
            blurRadius={mainImageBlur}
          />
        </View>
        {/* Clarity veil — dims at low clearPercent, invisible at 100% */}
        {veilOpacity > 0.01 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0,0,0,${veilOpacity})`,
            }}
          />
        )}
      </View>
    </Pressable>
  );
});

// --- Page Indicator ---

function PageIndicator({ total, current }: { total: number; current: number }) {
  const MAX_VISIBLE = 7;
  const showAll = total <= MAX_VISIBLE;

  let startIndex = 0;
  let endIndex = total;

  if (!showAll) {
    const half = Math.floor(MAX_VISIBLE / 2);
    startIndex = Math.max(0, current - half);
    endIndex = Math.min(total, startIndex + MAX_VISIBLE);
    if (endIndex - startIndex < MAX_VISIBLE) {
      startIndex = Math.max(0, endIndex - MAX_VISIBLE);
    }
  }

  const dots = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);

  return (
    <View
      style={{
        position: 'absolute',
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      pointerEvents="none"
    >
      {dots.map((index) => (
        <View
          key={index}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#FFFFFF',
            opacity: index === current ? 1.0 : 0.3,
            marginVertical: 4,
          }}
        />
      ))}
    </View>
  );
}

// --- Main Screen ---

const METEOR_CHANCE = 0.05;

export default function FocusScreen() {
  const { user, session } = useAuth();
  const { selectedBoardId } = useNavigation();
  const { nodes, loading, refresh: refreshNodes } = useNodes(
    selectedBoardId,
    user?.id ?? null,
    session?.access_token ?? null,
  );
  const { pages, getPage } = usePages(user?.id ?? null);
  const {
    getRoutinesForNode,
    toggleRoutineCheck,
    isRoutineActiveToday,
    reload: reloadRoutines,
  } = useRoutines(selectedBoardId, user?.id ?? null);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const today = useMemo(() => getTodayString(), []);

  const imageNodes = useMemo(
    () => nodes.filter((n) => n.type === 'image' && n.src),
    [nodes],
  );

  const imageNodeIds = useMemo(
    () => imageNodes.map((n) => n.id).join(','),
    [imageNodes],
  );

  const [shuffledNodes, setShuffledNodes] = useState<Node[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // --- Animations ---
  const effects = useFocusEffects(screenWidth, screenHeight);

  // --- clearPercent: ノードごとに事前計算 ---
  const { recalculate, calculateAfterToggle } = useClearPercent();

  // 全画像ノードのclearPercentを一括算出（タブを開いた時点で完了）
  const clearPercentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const node of imageNodes) {
      const routines = getRoutinesForNode(node.id).filter(isRoutineActiveToday);
      // ルーティン未設定 → 常に100%（フィルター不要）
      map[node.id] = routines.length === 0 ? 100 : recalculate(routines, []);
    }
    return map;
  }, [imageNodes, getRoutinesForNode, isRoutineActiveToday, recalculate]);

  // 楽観的更新用のオーバーライド（チェック時に即反映）
  const [cpOverrides, setCpOverrides] = useState<Record<string, number>>({});

  // サーバーデータ反映時にオーバーライドをクリア（空なら同一参照を返しループ防止）
  useEffect(() => {
    setCpOverrides((prev) => (Object.keys(prev).length > 0 ? {} : prev));
  }, [clearPercentMap]);

  const getNodeClearPercent = useCallback(
    (nodeId: string) => cpOverrides[nodeId] ?? clearPercentMap[nodeId] ?? 100,
    [cpOverrides, clearPercentMap],
  );

  // Preload pages for all image nodes (skip temp nodes not yet persisted)
  useEffect(() => {
    imageNodes.forEach((node) => {
      if (!node.id.startsWith('temp_') && !pages[node.id]) {
        getPage(node.id);
      }
    });
  }, [imageNodeIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh data when screen gains focus (tab switch, back navigation)
  useFocusEffect(
    useCallback(() => {
      refreshNodes();
      reloadRoutines();
    }, [refreshNodes, reloadRoutines]),
  );

  // Reshuffle when image nodes change
  useFocusEffect(
    useCallback(() => {
      if (imageNodes.length > 0) {
        setShuffledNodes(shuffleArray(imageNodes));
        setCurrentPage(0);
        setShuffleKey((prev) => prev + 1);
        setOverlayVisible(false);
      } else {
        setShuffledNodes([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageNodeIds]),
  );

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      setCurrentPage(e.nativeEvent.position);
    },
    [],
  );

  // Get overlay data for current node
  const currentNode = shuffledNodes[currentPage];
  const overlayData = useMemo((): OverlayData | null => {
    if (!currentNode) return null;
    const page = pages[currentNode.id];
    const nodeRoutines = getRoutinesForNode(currentNode.id).filter(isRoutineActiveToday);
    return {
      title: page?.title || '',
      routines: nodeRoutines,
      milestones: page?.milestones || [],
    };
  }, [currentNode, pages, getRoutinesForNode, isRoutineActiveToday]);

  const handleToggleRoutine = useCallback(
    (routine: Routine, event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      const isChecking = !routine.history[today];

      if (isChecking && currentNode && overlayData) {
        // 楽観的 clearPercent 更新
        const currentCp = getNodeClearPercent(currentNode.id);
        const newCp = calculateAfterToggle(
          currentCp, overlayData.routines, [], routine.id, today, true,
        );
        setCpOverrides((prev) => ({ ...prev, [currentNode.id]: newCp }));

        // リップル + 流星エフェクト
        const color = routine.color || '#8b5cf6';
        effects.triggerRipple(pageX, pageY, color);
        if (Math.random() < METEOR_CHANCE) {
          effects.triggerMeteor(color);
        }
      }

      // データ更新
      toggleRoutineCheck(routine.id, today);
    },
    [toggleRoutineCheck, today, currentNode, overlayData, getNodeClearPercent, calculateAfterToggle, effects], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleToggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => !prev);
  }, []);

  // Loading
  if (loading && shuffledNodes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#121212',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
      </View>
    );
  }

  // Empty state
  if (shuffledNodes.length === 0) {
    return (
      <View className="flex-1" style={{ backgroundColor: '#121212' }}>
        <View className="flex-1 px-2.5 pt-2">
          <View
            className="flex-1 rounded-2xl items-center justify-center"
            style={{ backgroundColor: '#1E1E1E' }}
          >
            <View className="items-center gap-4">
              <View
                className="w-[72px] h-[72px] rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <Plus size={32} color="rgba(255,255,255,0.38)" />
              </View>
              <Text
                className="text-lg font-semibold text-center"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                ビジョンを追加
              </Text>
              <Text
                className="text-sm text-center leading-5"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                あなたの目標や夢の画像を{'\n'}追加しましょう
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Focus view
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <PagerView
        key={shuffleKey}
        style={{ flex: 1 }}
        orientation="vertical"
        initialPage={0}
        overdrag
        onPageSelected={handlePageSelected}
      >
        {shuffledNodes.map((node, index) => (
          <View key={`${node.id}-${index}`} collapsable={false}>
            <FocusImagePage
              node={node}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              clearPercent={getNodeClearPercent(node.id)}
              overlayVisible={overlayVisible}
              onPress={handleToggleOverlay}
            />
          </View>
        ))}
      </PagerView>

      {/* Ripple Effect Layer (SVG ring only) */}
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

      {/* Overlay */}
      {overlayVisible && overlayData && (
        <FocusOverlay
          data={overlayData}
          today={today}
          onToggleRoutine={handleToggleRoutine}
          screenHeight={screenHeight}
        />
      )}

      {/* Page indicator */}
      {shuffledNodes.length > 1 && (
        <PageIndicator total={shuffledNodes.length} current={currentPage} />
      )}

      {/* Debug: clearPercent (TODO: remove after verification) */}
      <View
        style={{ position: 'absolute', bottom: 100, left: 20 }}
        pointerEvents="none"
      >
        <Text style={{ color: 'yellow', fontSize: 11, opacity: 0.7 }}>
          CP: {currentNode ? getNodeClearPercent(currentNode.id).toFixed(1) : '-'}%
        </Text>
      </View>
    </View>
  );
}
