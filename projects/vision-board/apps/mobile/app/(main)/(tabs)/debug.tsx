/**
 * debug.tsx — ドラッグジェスチャー最小実装デバッグタブ
 *
 * 実験テーマ：
 *   RoutineWeeklyTable の「長押し→即キャンセル」バグの根本原因特定。
 *   ドラッグ状態を React state ではなく useSharedValue で管理することで、
 *   ジェスチャー中の React 再レンダリングを排除し、RNGH v2 がキャンセルしなくなるかを検証する。
 *
 * 現行実装との違い：
 *   NG: onStart → runOnJS(setDraggingRoutineId) → React 再レンダリング → GestureDetector 再レンダリング → RNGH v2 がキャンセル
 *   OK: onStart → draggingIdSV.value = id (useSharedValue のみ) → Reanimated が opacity を制御 → React 再レンダリングなし
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from '../../../components/ui/LucideIcon';
import { useNavigation } from '../../../contexts/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useNodes } from '../../../hooks/useNodes';
import { useRoutines } from '../../../hooks/useRoutines';
import type { Routine, RoutineStack } from '../../../hooks/useRoutines';

// --- Constants ---
const ROW_H = 56;
const STACK_HEADER_H = 40;
const DIVIDER_H = 1;

// --- Colors ---
const C = {
  bg: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  text: '#E2E8F0',
  subtext: '#94A3B8',
  accent: '#6366F1',
  grip: '#475569',
  ghost: '#6366F133',
  dropLine: '#6366F1',
  stackHeader: '#1E293B',
  stackLine: '#6366F1',
  deleteRed: '#EF4444',
} as const;

// --- Display row types (simplified) ---
type DisplayRow =
  | { type: 'routine'; routine: Routine; stackId: string | null }
  | { type: 'stack-header'; stack: RoutineStack };

function getRowHeight(row: DisplayRow): number {
  if (row.type === 'stack-header') return STACK_HEADER_H + DIVIDER_H;
  return ROW_H + DIVIDER_H;
}

// --- Pure worklet helper: compute drop index from center Y ---
function computeDropIndex(centerY: number, offsets: readonly number[]): number {
  'worklet';
  for (let i = 0; i < offsets.length - 1; i++) {
    const nextOffset = offsets[i + 1] ?? (offsets[i] + ROW_H);
    const mid = (offsets[i] + nextOffset) / 2;
    if (centerY < mid) return i;
  }
  return offsets.length > 0 ? offsets.length - 1 : 0;
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: DraggableRoutineRow
// hooks を含むので独立コンポーネントとして定義（React hooks ルール対応）
// ─────────────────────────────────────────────────────────────────
interface DraggableRoutineRowProps {
  routine: Routine;
  inStack: boolean;
  gesture: ReturnType<typeof Gesture.Pan>;
  draggingIdSV: ReturnType<typeof useSharedValue<string>>;
  onDelete: (id: string) => void;
}

function DraggableRoutineRow({
  routine,
  inStack,
  gesture,
  draggingIdSV,
  onDelete,
}: DraggableRoutineRowProps) {
  const rowStyle = useAnimatedStyle(() => ({
    opacity: draggingIdSV.value === routine.id ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            height: ROW_H,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            backgroundColor: C.surface,
            borderBottomWidth: DIVIDER_H,
            borderBottomColor: C.border,
          },
          inStack && { paddingLeft: 28, borderLeftWidth: 2, borderLeftColor: C.stackLine + '60' },
          rowStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={{ marginRight: 12 }}>
          <LucideIcon name="grip-vertical" size={18} color={C.grip} />
        </View>

        {/* Color dot */}
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: routine.color || C.accent,
            marginRight: 10,
          }}
        />

        {/* Title */}
        <Text style={{ flex: 1, color: C.text, fontSize: 14 }} numberOfLines={1}>
          {routine.title}
        </Text>

        {/* Delete button */}
        <TouchableOpacity
          onPress={() => onDelete(routine.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LucideIcon name="x" size={16} color={C.subtext} />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: GhostView — ドラッグ中に浮遊表示するゴースト
// ─────────────────────────────────────────────────────────────────
interface GhostViewProps {
  draggingIdSV: ReturnType<typeof useSharedValue<string>>;
  dragStartRowY: ReturnType<typeof useSharedValue<number>>;
  dragTranslateY: ReturnType<typeof useSharedValue<number>>;
  tableOffsetSV: ReturnType<typeof useSharedValue<number>>;
}

function GhostView({ draggingIdSV, dragStartRowY, dragTranslateY, tableOffsetSV }: GhostViewProps) {
  const ghostStyle = useAnimatedStyle(() => {
    const isDragging = draggingIdSV.value !== '';
    const top = dragStartRowY.value + dragTranslateY.value;
    return {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top,
      height: ROW_H,
      opacity: isDragging ? 1 : 0,
    };
  });

  return (
    <Animated.View style={ghostStyle} pointerEvents="none">
      <View
        style={{
          flex: 1,
          backgroundColor: C.ghost,
          borderWidth: 1.5,
          borderColor: C.accent,
          borderRadius: 8,
          marginHorizontal: 8,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <LucideIcon name="grip-vertical" size={18} color={C.accent} />
        <Text style={{ marginLeft: 12, color: C.accent, fontSize: 14 }}>移動中...</Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: DropLine — ドロップ位置を示す水平ライン
// ─────────────────────────────────────────────────────────────────
interface DropLineProps {
  dropIndexSV: ReturnType<typeof useSharedValue<number>>;
  rowOffsets: readonly number[];
}

function DropLine({ dropIndexSV, rowOffsets }: DropLineProps) {
  const lineStyle = useAnimatedStyle(() => {
    const idx = dropIndexSV.value;
    if (idx < 0) return { opacity: 0, top: 0 };
    const y = rowOffsets[idx] ?? 0;
    return {
      position: 'absolute' as const,
      left: 8,
      right: 8,
      top: y - 1,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: C.dropLine,
      opacity: 1,
    };
  });

  return <Animated.View style={lineStyle} pointerEvents="none" />;
}

// ─────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────
export default function DebugScreen() {
  const { selectedBoardId } = useNavigation();
  const { user, session } = useAuth();
  const userId = user?.id ?? null;

  const { nodes } = useNodes(selectedBoardId, userId, session?.access_token);

  // 先頭ノードを自動選択（タップで切替可能）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const nodeId = selectedNodeId ?? nodes[0]?.id ?? null;

  const {
    getRoutinesForNode,
    getStacksForNode,
    createRoutine,
    deleteRoutine,
    createStack,
    deleteStack,
    reorderTopLevel,
    reorderRoutineInStack,
    moveRoutineToStackAtPosition,
    moveRoutineOutOfStack,
    getTodayDateString,
  } = useRoutines(selectedBoardId, userId);

  // --- Add form state ---
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newStackTitle, setNewStackTitle] = useState('');

  // --- Data ---
  const routines = nodeId ? getRoutinesForNode(nodeId) : [];
  const stacks = nodeId ? getStacksForNode(nodeId) : [];
  const today = getTodayDateString();

  // --- Display rows (simplified: no stack-boundary rows) ---
  const topLevelItems = useMemo(() => {
    const stackedIds = new Set(routines.filter((r) => r.stackId).map((r) => r.id));
    const unstacked = routines.filter((r) => !stackedIds.has(r.id));
    const items: Array<{ type: 'routine' | 'stack'; id: string; order: number }> = [
      ...unstacked.map((r) => ({ type: 'routine' as const, id: r.id, order: r.displayOrder ?? 0 })),
      ...stacks.map((s) => ({ type: 'stack' as const, id: s.id, order: s.sortOrder })),
    ];
    return items.sort((a, b) => a.order - b.order);
  }, [routines, stacks]);

  const displayRows = useMemo((): DisplayRow[] => {
    const rows: DisplayRow[] = [];
    const stackRoutinesMap = new Map<string, Routine[]>();
    for (const r of routines) {
      if (r.stackId) {
        const list = stackRoutinesMap.get(r.stackId) || [];
        list.push(r);
        stackRoutinesMap.set(r.stackId, list);
      }
    }
    for (const [, list] of stackRoutinesMap) {
      list.sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
    }
    const stackMap = new Map(stacks.map((s) => [s.id, s]));

    for (const item of topLevelItems) {
      if (item.type === 'routine') {
        const r = routines.find((r) => r.id === item.id);
        if (r) rows.push({ type: 'routine', routine: r, stackId: null });
      } else {
        const stack = stackMap.get(item.id);
        if (!stack) continue;
        rows.push({ type: 'stack-header', stack });
        const stackRoutines = stackRoutinesMap.get(stack.id) || [];
        for (const r of stackRoutines) {
          rows.push({ type: 'routine', routine: r, stackId: stack.id });
        }
      }
    }
    return rows;
  }, [routines, stacks, topLevelItems]);

  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 0;
    for (const row of displayRows) {
      offsets.push(y);
      y += getRowHeight(row);
    }
    offsets.push(y); // sentinel (total height)
    return offsets;
  }, [displayRows]);

  // --- Shared values (all drag state — NO React state during gesture) ---
  const draggingIdSV = useSharedValue('');
  const dragStartRowY = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const touchOffsetSV = useSharedValue(0);
  const dropIndexSV = useSharedValue(-1);
  const tableOffsetSV = useSharedValue(0);

  const tableRef = useRef<View>(null);

  // --- handleDrop: called from onEnd worklet after drag finishes ---
  // ジェスチャー終了後なので React state 変更は OK
  const handleDrop = useCallback(
    (draggedId: string, dropIdx: number) => {
      if (!nodeId) return;

      // Find what was dragged
      const draggedRoutineRow = displayRows.find(
        (r) => r.type === 'routine' && r.routine.id === draggedId
      ) as (DisplayRow & { type: 'routine' }) | undefined;

      if (!draggedRoutineRow) return;

      const targetRow = displayRows[dropIdx];
      if (!targetRow) return;

      // Case 1: drop onto a stack-header → move routine into that stack at end
      if (targetRow.type === 'stack-header') {
        const stackRoutineCount = displayRows.filter(
          (r) => r.type === 'routine' && r.stackId === targetRow.stack.id
        ).length;
        if (draggedRoutineRow.stackId !== targetRow.stack.id) {
          moveRoutineToStackAtPosition(draggedId, targetRow.stack.id, stackRoutineCount);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Case 2: drop within same stack → reorder in stack
      if (
        targetRow.type === 'routine' &&
        targetRow.stackId &&
        targetRow.stackId === draggedRoutineRow.stackId
      ) {
        const stackRoutineRows = displayRows.filter(
          (r) => r.type === 'routine' && r.stackId === draggedRoutineRow.stackId
        ) as (DisplayRow & { type: 'routine' })[];
        const fromIdx = stackRoutineRows.findIndex((r) => r.routine.id === draggedId);
        const toIdx = stackRoutineRows.findIndex((r) => r.routine.id === (targetRow as DisplayRow & { type: 'routine' }).routine.id);
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          reorderRoutineInStack(draggedRoutineRow.stackId!, fromIdx, toIdx);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Case 3: drop from stack to standalone area → move out of stack
      if (
        draggedRoutineRow.stackId &&
        targetRow.type === 'routine' &&
        !targetRow.stackId
      ) {
        moveRoutineOutOfStack(draggedId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      // Case 4: top-level reorder
      const orderedTopLevel = topLevelItems.map((item) => ({
        type: item.type,
        id: item.id,
      }));
      const fromTopIdx = orderedTopLevel.findIndex(
        (item) => item.type === 'routine' && item.id === draggedId
      );
      if (fromTopIdx < 0) return; // dragged a stacked routine to top-level → moveOutOfStack

      // Case 4 ではここまでで stack-header は return 済みなので targetRow は routine のみ
      const toTopIdx = orderedTopLevel.findIndex(
        (item) => item.type === 'routine' && item.id === targetRow.routine.id
      );

      if (fromTopIdx >= 0 && toTopIdx >= 0 && fromTopIdx !== toTopIdx) {
        const reordered = [...orderedTopLevel];
        const [moved] = reordered.splice(fromTopIdx, 1);
        reordered.splice(toTopIdx, 0, moved);
        reorderTopLevel(nodeId, reordered);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [
      nodeId,
      displayRows,
      topLevelItems,
      reorderTopLevel,
      reorderRoutineInStack,
      moveRoutineToStackAtPosition,
      moveRoutineOutOfStack,
    ]
  );

  // handleDrop の最新版を Ref で保持（useMemo の closure に閉じ込めるため）
  const handleDropRef = useRef(handleDrop);
  handleDropRef.current = handleDrop;
  const stableHandleDrop = useCallback(
    (id: string, idx: number) => handleDropRef.current(id, idx),
    []
  );

  // --- Build gestures (useMemo — deps に draggingIdSV を含まない) ---
  const gestures = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Gesture.Pan>>();
    displayRows.forEach((row, i) => {
      if (row.type !== 'routine') return;
      const rowY = rowOffsets[i] ?? 0;
      const offsets = rowOffsets; // closure capture — safe in worklet

      map.set(
        row.routine.id,
        Gesture.Pan()
          .activateAfterLongPress(200)
          .onStart((e) => {
            'worklet';
            // ★ React setState を一切呼ばない — これが核心
            draggingIdSV.value = row.routine.id;
            dragStartRowY.value = rowY;
            dragTranslateY.value = 0;
            touchOffsetSV.value = e.absoluteY - tableOffsetSV.value - rowY;
            dropIndexSV.value = i;
          })
          .onUpdate((e) => {
            'worklet';
            dragTranslateY.value = e.translationY;
            const centerY =
              e.absoluteY - tableOffsetSV.value - touchOffsetSV.value + ROW_H / 2;
            dropIndexSV.value = computeDropIndex(centerY, offsets);
          })
          .onEnd(() => {
            'worklet';
            dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            const draggedId = draggingIdSV.value;
            const dropIdx = dropIndexSV.value;
            draggingIdSV.value = '';
            dropIndexSV.value = -1;
            if (draggedId && dropIdx >= 0) {
              runOnJS(stableHandleDrop)(draggedId, dropIdx);
            }
          })
          .onFinalize(() => {
            'worklet';
            // キャンセル時のクリーンアップ
            draggingIdSV.value = '';
            dropIndexSV.value = -1;
            dragTranslateY.value = withSpring(0);
          })
      );
    });
    return map;
  }, [
    displayRows,
    rowOffsets,
    draggingIdSV,
    dragStartRowY,
    dragTranslateY,
    touchOffsetSV,
    dropIndexSV,
    tableOffsetSV,
    stableHandleDrop,
  ]);

  // --- CRUD handlers ---
  const handleAddRoutine = useCallback(async () => {
    if (!nodeId || !newRoutineTitle.trim()) return;
    await createRoutine(newRoutineTitle.trim(), nodeId);
    setNewRoutineTitle('');
  }, [nodeId, newRoutineTitle, createRoutine]);

  const handleAddStack = useCallback(async () => {
    if (!nodeId || !newStackTitle.trim()) return;
    await createStack(nodeId, newStackTitle.trim());
    setNewStackTitle('');
  }, [nodeId, newStackTitle, createStack]);

  const handleDeleteRoutine = useCallback(
    async (routineId: string) => {
      await deleteRoutine(routineId);
    },
    [deleteRoutine]
  );

  const handleDeleteStack = useCallback(
    async (stackId: string) => {
      await deleteStack(stackId);
    },
    [deleteStack]
  );

  // --- Total list height (for container sizing) ---
  const totalHeight = rowOffsets[rowOffsets.length - 1] ?? 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text style={{ color: C.accent, fontSize: 16, fontWeight: '700' }}>
            Drag Debug
          </Text>
          <Text style={{ color: C.subtext, fontSize: 11, marginTop: 2 }}>
            ドラッグ状態 = useSharedValue のみ (React state なし)
          </Text>
        </View>

        {/* Node picker */}
        {nodes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 44 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' }}
          >
            {nodes.map((node) => {
              const isSelected = (selectedNodeId ?? nodes[0]?.id) === node.id;
              return (
                <TouchableOpacity
                  key={node.id}
                  onPress={() => setSelectedNodeId(node.id)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: isSelected ? C.accent : C.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? C.accent : C.border,
                  }}
                >
                  <Text style={{ color: isSelected ? '#fff' : C.subtext, fontSize: 12 }}>
                    {node.type === 'image' ? '🖼' : '📄'} {node.id.slice(-4)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Add forms */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 12,
            paddingVertical: 8,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <TextInput
            value={newRoutineTitle}
            onChangeText={setNewRoutineTitle}
            placeholder="ルーティン名"
            placeholderTextColor={C.subtext}
            style={{
              flex: 1,
              height: 36,
              backgroundColor: C.surface,
              borderRadius: 8,
              paddingHorizontal: 10,
              color: C.text,
              fontSize: 13,
            }}
            onSubmitEditing={handleAddRoutine}
          />
          <TouchableOpacity
            onPress={handleAddRoutine}
            style={{
              width: 36,
              height: 36,
              backgroundColor: C.accent,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LucideIcon name="plus" size={18} color="#fff" />
          </TouchableOpacity>

          <TextInput
            value={newStackTitle}
            onChangeText={setNewStackTitle}
            placeholder="スタック名"
            placeholderTextColor={C.subtext}
            style={{
              flex: 1,
              height: 36,
              backgroundColor: C.surface,
              borderRadius: 8,
              paddingHorizontal: 10,
              color: C.text,
              fontSize: 13,
            }}
            onSubmitEditing={handleAddStack}
          />
          <TouchableOpacity
            onPress={handleAddStack}
            style={{
              width: 36,
              height: 36,
              backgroundColor: C.stackLine,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LucideIcon name="layers" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Drag list */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {!nodeId ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: C.subtext, fontSize: 13 }}>
                ボードを選択してルーティンを追加してください
              </Text>
            </View>
          ) : displayRows.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: C.subtext, fontSize: 13 }}>
                ルーティンがありません。上のフォームから追加してください。
              </Text>
            </View>
          ) : (
            <View
              ref={tableRef}
              style={{ position: 'relative', height: totalHeight, overflow: 'visible' }}
              onLayout={() => {
                tableRef.current?.measureInWindow((_x, y) => {
                  tableOffsetSV.value = y;
                });
              }}
            >
              {/* Rows */}
              {displayRows.map((row, i) => {
                if (row.type === 'stack-header') {
                  return (
                    <View
                      key={`stack-${row.stack.id}`}
                      style={{
                        position: 'absolute',
                        top: rowOffsets[i] ?? 0,
                        left: 0,
                        right: 0,
                        height: STACK_HEADER_H,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        backgroundColor: C.stackHeader,
                        borderBottomWidth: DIVIDER_H,
                        borderBottomColor: C.border,
                        borderLeftWidth: 3,
                        borderLeftColor: C.stackLine,
                      }}
                    >
                      <LucideIcon name="layers" size={14} color={C.stackLine} />
                      <Text
                        style={{ flex: 1, marginLeft: 8, color: C.accent, fontSize: 13, fontWeight: '600' }}
                      >
                        {row.stack.title}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteStack(row.stack.id)}>
                        <LucideIcon name="trash-2" size={14} color={C.subtext} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                // routine row
                const gesture = gestures.get(row.routine.id);
                if (!gesture) return null;

                return (
                  <View
                    key={`routine-${row.routine.id}`}
                    style={{
                      position: 'absolute',
                      top: rowOffsets[i] ?? 0,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <DraggableRoutineRow
                      routine={row.routine}
                      inStack={!!row.stackId}
                      gesture={gesture}
                      draggingIdSV={draggingIdSV}
                      onDelete={handleDeleteRoutine}
                    />
                  </View>
                );
              })}

              {/* Drop line indicator */}
              <DropLine dropIndexSV={dropIndexSV} rowOffsets={rowOffsets} />

              {/* Ghost (floating copy) */}
              <GhostView
                draggingIdSV={draggingIdSV}
                dragStartRowY={dragStartRowY}
                dragTranslateY={dragTranslateY}
                tableOffsetSV={tableOffsetSV}
              />
            </View>
          )}
        </ScrollView>

        {/* Debug info overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 90,
            right: 12,
            backgroundColor: '#00000099',
            borderRadius: 8,
            padding: 8,
          }}
          pointerEvents="none"
        >
          <Text style={{ color: C.subtext, fontSize: 10 }}>
            rows: {displayRows.length} | offsets: {rowOffsets.length}
          </Text>
          <Text style={{ color: C.subtext, fontSize: 10 }}>
            {routines.length} routines / {stacks.length} stacks
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
