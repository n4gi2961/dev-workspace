import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from '../ui/LucideIcon';
import { ROUTINE_COLORS } from '@vision-board/shared/constants';
import {
  getWeekDates,
  getTodayString,
  getDayLabel,
  isRoutineActiveOnDate,
  getDayOfWeekIndex,
} from '@vision-board/shared/lib';
import type { Routine, RoutineStack } from '@vision-board/shared/lib';

// --- Constants ---
const MIN_COL_W = 160;
const ROUTINE_ROW_H = 56;
const STACK_HEADER_H = 40;
const STACK_BOUNDARY_H = 12;
const DIVIDER_H = 1;
const TABLE_HEADER_OFFSET = 49; // header(48) + divider(1)

// --- Colors ---
const C = {
  bg: '#121212',
  rowBg: '#1E293B99',
  addRowBg: '#1E293B66',
  headerText: '#94A3B8',
  dateText: '#64748B',
  routineName: '#E2E8F0',
  divider: '#334155',
  unchecked: '#64748B',
  weekLabel: '#6366F1',
  addText: '#595959',
  grip: '#64748B',
  white: '#FFFFFF',
  stackLine: '#6366F1',
  stackHeaderBg: '#1E293B44',
  dropIndicator: '#6366F1',
  dragHighlight: '#6366F140',
  stackBoundary: '#6366F150',
  stackBoundaryActive: '#6366F1',
} as const;

// --- Display row types ---
type DisplayRow =
  | { type: 'routine'; routine: Routine; inStack: boolean; isFirstInStack: boolean; isLastInStack: boolean; stackId: string | null }
  | { type: 'stack-header'; stack: RoutineStack; stackRoutines: Routine[] }
  | { type: 'stack-boundary'; position: 'start' | 'end'; stackId: string };

// --- DropContext ---
type DropContext =
  | { kind: 'top-level-between'; topLevelInsertIndex: number }
  | { kind: 'into-stack'; stackId: string; atPosition: number }
  | null;


// --- Worklet helper: drop line row index from finger center Y ---
function computeDropLineIdx(centerY: number, offsets: readonly number[]): number {
  'worklet';
  for (let i = 0; i < offsets.length - 1; i++) {
    const mid = (offsets[i] + (offsets[i + 1] ?? offsets[i] + ROUTINE_ROW_H)) / 2;
    if (centerY < mid) return i;
  }
  return offsets.length > 0 ? offsets.length - 1 : 0;
}

// --- AnimatedRow: opacity controlled by draggingIdSV (no React re-render during drag) ---
function AnimatedRow({ routineId, draggingIdSV, children }: {
  routineId: string;
  draggingIdSV: ReturnType<typeof useSharedValue<string>>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: draggingIdSV.value === routineId ? 0 : 1,
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// --- AnimatedStackRow: same for stack header ---
function AnimatedStackRow({ stackId, draggingIdSV, children }: {
  stackId: string;
  draggingIdSV: ReturnType<typeof useSharedValue<string>>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: draggingIdSV.value === stackId ? 0 : 1,
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// --- DragGhostRow: absolutely positioned ghost, shown when draggingIdSV matches ---
function DragGhostRow({ rowId, title, color, isStack, rowH, draggingIdSV, dragStartRowY, dragTranslateY }: {
  rowId: string;
  title: string;
  color: string;
  isStack: boolean;
  rowH: number;
  draggingIdSV: ReturnType<typeof useSharedValue<string>>;
  dragStartRowY: ReturnType<typeof useSharedValue<number>>;
  dragTranslateY: ReturnType<typeof useSharedValue<number>>;
}) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0, right: 0,
    top: TABLE_HEADER_OFFSET + dragStartRowY.value + dragTranslateY.value,
    height: rowH,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    opacity: draggingIdSV.value === rowId ? 1 : 0,
  }));
  return (
    <Animated.View style={style} pointerEvents="none">
      <View style={{
        flex: 1, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 4, gap: 8,
        backgroundColor: '#253348',
        borderRadius: 6, borderWidth: 1.5,
        borderColor: isStack ? C.stackLine : C.dropIndicator,
      }}>
        {isStack ? (
          <>
            <LucideIcon name="layers" size={13} color={C.stackLine} />
            <Text style={{ color: C.stackLine, fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {title || '無題のスタック'}
            </Text>
          </>
        ) : (
          <>
            <View style={{ width: 4 }} />
            <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: color }} />
            <Text style={{ color: C.routineName, fontSize: 14, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {title}
            </Text>
            <LucideIcon name="grip-vertical" size={16} color={C.grip} />
          </>
        )}
      </View>
    </Animated.View>
  );
}

// --- DropLineView: horizontal line showing drop position ---
function DropLineView({ dropLineSV, rowOffsets }: {
  dropLineSV: ReturnType<typeof useSharedValue<number>>;
  rowOffsets: readonly number[];
}) {
  const style = useAnimatedStyle(() => {
    const idx = dropLineSV.value;
    if (idx < 0) return { opacity: 0, top: 0 };
    const y = rowOffsets[idx] ?? 0;
    return {
      position: 'absolute' as const,
      left: 4, right: 4,
      top: TABLE_HEADER_OFFSET + y - 1.5,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: C.dropIndicator,
      opacity: 1,
      zIndex: 99,
    };
  });
  return <Animated.View style={style} pointerEvents="none" />;
}

// --- Types ---
interface RoutineWeeklyTableProps {
  nodeId: string;
  routines: Routine[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onToggle: (routineId: string, date: string) => void;
  onCreate: (title: string) => void;
  onDelete: (routineId: string) => void;
  onUpdateTitle: (routineId: string, title: string) => void;
  onUpdateColor: (routineId: string, color: string) => void;
  onUpdateActiveDays: (routineId: string, days: number[] | undefined) => void;
  stacks?: RoutineStack[];
  onCreateStack?: (title: string) => void;
  onDeleteStack?: (stackId: string) => void;
  onUpdateStackTitle?: (stackId: string, title: string) => void;
  onToggleStack?: (stackId: string, date: string) => void;
  onReorderInStack?: (stackId: string, fromIndex: number, toIndex: number) => void;
  onReorderTopLevel?: (nodeId: string, orderedItems: Array<{ type: 'routine' | 'stack'; id: string }>) => void;
  onMoveToStack?: (routineId: string, stackId: string, atPosition: number) => void;
  onMoveOutOfStack?: (routineId: string) => void;
}

function getRowHeight(row: DisplayRow): number {
  if (row.type === 'stack-header') return STACK_HEADER_H + DIVIDER_H;
  if (row.type === 'stack-boundary') return STACK_BOUNDARY_H;
  return ROUTINE_ROW_H + DIVIDER_H;
}

// --- Main Component ---
export function RoutineWeeklyTable({
  nodeId,
  routines,
  weekOffset,
  onWeekChange,
  onToggle,
  onCreate,
  onDelete,
  onUpdateTitle,
  onUpdateColor,
  onUpdateActiveDays,
  stacks = [],
  onCreateStack,
  onDeleteStack,
  onUpdateStackTitle,
  onToggleStack,
  onReorderInStack,
  onReorderTopLevel,
  onMoveToStack,
  onMoveOutOfStack,
}: RoutineWeeklyTableProps) {
  const { width: screenWidth } = useWindowDimensions();
  const MAX_COL_W = screenWidth - 120;

  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [isActiveDaysMode, setIsActiveDaysMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [editingStackTitle, setEditingStackTitle] = useState('');
  const [newStackTitle, setNewStackTitle] = useState('');
  const [showNewStackInput, setShowNewStackInput] = useState(false);
  const addInputRef = useRef<TextInput>(null);
  const newStackInputRef = useRef<TextInput>(null);

  // --- Drag state (all SharedValue — no React state during gesture → no GestureDetector re-render) ---
  const draggingIdSV = useSharedValue('');        // '' = not dragging
  const draggingIsStackSV = useSharedValue(0);    // 0 = routine, 1 = stack
  const dropLineSV = useSharedValue(-1);           // row index for drop line
  const dragTranslateY = useSharedValue(0);
  const dragStartRowY = useSharedValue(0);
  const touchOffsetWithinRow = useSharedValue(0);
  const tableTopRef = useSharedValue(0);
  const leftColumnRef = useRef<Animated.View>(null);

  // --- Column resize ---
  const leftColWidthSV = useSharedValue(MIN_COL_W);
  const startWidthSV = useSharedValue(MIN_COL_W);
  const leftColAnimStyle = useAnimatedStyle(() => ({ width: leftColWidthSV.value }));

  const columnResizeGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-15, 15])
      .onStart(() => {
        'worklet';
        startWidthSV.value = leftColWidthSV.value;
      })
      .onUpdate((e) => {
        'worklet';
        leftColWidthSV.value = Math.min(Math.max(startWidthSV.value + e.translationX, MIN_COL_W), MAX_COL_W);
      });
  }, [leftColWidthSV, startWidthSV, MAX_COL_W]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayString = useMemo(() => getTodayString(), []);

  // --- Top-level items (unified sort order) ---
  const topLevelItems = useMemo(() => {
    const stackedIds = new Set(routines.filter(r => r.stackId).map(r => r.id));
    const unstacked = routines.filter(r => !stackedIds.has(r.id));
    const items: Array<{ type: 'routine' | 'stack'; id: string; order: number }> = [
      ...unstacked.map(r => ({ type: 'routine' as const, id: r.id, order: r.displayOrder ?? 0 })),
      ...stacks.map(s => ({ type: 'stack' as const, id: s.id, order: s.sortOrder })),
    ];
    return items.sort((a, b) => a.order - b.order);
  }, [routines, stacks]);

  // --- Build display rows (unified sort) ---
  const displayRows = useMemo((): DisplayRow[] => {
    const rows: DisplayRow[] = [];
    const stackedIds = new Set<string>();
    const stackRoutinesMap = new Map<string, Routine[]>();

    for (const r of routines) {
      if (r.stackId) {
        stackedIds.add(r.id);
        const list = stackRoutinesMap.get(r.stackId) || [];
        list.push(r);
        stackRoutinesMap.set(r.stackId, list);
      }
    }
    for (const [, list] of stackRoutinesMap) {
      list.sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
    }

    const stackMap = new Map(stacks.map(s => [s.id, s]));

    for (const item of topLevelItems) {
      if (item.type === 'routine') {
        const r = routines.find(r => r.id === item.id);
        if (!r) continue;
        rows.push({ type: 'routine', routine: r, inStack: false, isFirstInStack: false, isLastInStack: false, stackId: null });
      } else {
        const stack = stackMap.get(item.id);
        if (!stack) continue;
        const stackRoutines = stackRoutinesMap.get(stack.id) || [];
        rows.push({ type: 'stack-boundary', position: 'start', stackId: stack.id });
        rows.push({ type: 'stack-header', stack, stackRoutines });
        stackRoutines.forEach((r, i) => {
          rows.push({
            type: 'routine', routine: r, inStack: true,
            isFirstInStack: i === 0,
            isLastInStack: i === stackRoutines.length - 1,
            stackId: stack.id,
          });
        });
        rows.push({ type: 'stack-boundary', position: 'end', stackId: stack.id });
      }
    }
    return rows;
  }, [routines, stacks, topLevelItems]);

  // Row Y offsets
  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 0;
    for (const row of displayRows) {
      offsets.push(y);
      y += getRowHeight(row);
    }
    offsets.push(y);
    return offsets;
  }, [displayRows]);

  // --- handleDrop: called from gesture onEnd via runOnJS (React state changes OK after gesture ends) ---
  const handleDrop = useCallback((draggedId: string, dropIdx: number, isStack: boolean) => {
    if (dropIdx < 0 || !draggedId) return;
    const targetRow = displayRows[dropIdx];
    if (!targetRow) return;

    if (!isStack) {
      // Routine drop
      const draggedRow = displayRows.find(
        r => r.type === 'routine' && (r as DisplayRow & { type: 'routine' }).routine.id === draggedId
      ) as (DisplayRow & { type: 'routine' }) | undefined;
      if (!draggedRow) return;

      // Compute DropContext from targetRow
      let dropCtx: DropContext = null;
      if (targetRow.type === 'stack-header') {
        dropCtx = { kind: 'into-stack', stackId: targetRow.stack.id, atPosition: 0 };
      } else if (targetRow.type === 'routine' && targetRow.inStack) {
        const stackRoutineRows = displayRows
          .filter(r => r.type === 'routine' && (r as DisplayRow & { type: 'routine' }).stackId === targetRow.stackId)
          .map(r => (r as DisplayRow & { type: 'routine' }).routine);
        const pos = stackRoutineRows.findIndex(r => r.id === (targetRow as DisplayRow & { type: 'routine' }).routine.id);
        dropCtx = { kind: 'into-stack', stackId: targetRow.stackId!, atPosition: pos };
      } else if (targetRow.type === 'routine' && !targetRow.inStack) {
        const routineIdx = topLevelItems.findIndex(t => t.type === 'routine' && t.id === (targetRow as DisplayRow & { type: 'routine' }).routine.id);
        if (routineIdx >= 0) dropCtx = { kind: 'top-level-between', topLevelInsertIndex: routineIdx };
      } else if (targetRow.type === 'stack-boundary') {
        const stackIdx = topLevelItems.findIndex(t => t.type === 'stack' && t.id === targetRow.stackId);
        if (stackIdx >= 0) dropCtx = { kind: 'top-level-between', topLevelInsertIndex: targetRow.position === 'start' ? stackIdx : stackIdx + 1 };
      }
      if (!dropCtx) return;

      if (dropCtx.kind === 'into-stack') {
        const { stackId, atPosition } = dropCtx;
        if (draggedRow.stackId === stackId) {
          const stackRoutines = routines.filter(r => r.stackId === stackId).sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
          const fromIdx = stackRoutines.findIndex(r => r.id === draggedId);
          let toIdx = Math.min(atPosition, stackRoutines.length - 1);
          if (toIdx > fromIdx) toIdx = Math.max(0, toIdx - 1);
          if (fromIdx >= 0 && fromIdx !== toIdx) onReorderInStack?.(stackId, fromIdx, toIdx);
        } else {
          onMoveToStack?.(draggedId, stackId, atPosition);
        }
      } else if (dropCtx.kind === 'top-level-between') {
        const { topLevelInsertIndex } = dropCtx;
        const draggingType = 'routine';
        const originalIdx = topLevelItems.findIndex(t => t.type === draggingType && t.id === draggedId);
        const removedBefore = originalIdx >= 0 && originalIdx < topLevelInsertIndex ? 1 : 0;
        const adjustedIdx = Math.min(topLevelInsertIndex - removedBefore, topLevelItems.length - 1);
        const filteredTopLevel = topLevelItems.filter(t => !(t.type === draggingType && t.id === draggedId));
        const newOrdering = [...filteredTopLevel];
        newOrdering.splice(Math.min(adjustedIdx, newOrdering.length), 0, { type: draggingType, id: draggedId, order: 0 });
        const orderedItems = newOrdering.map(t => ({ type: t.type, id: t.id }));
        if (draggedRow.stackId) {
          onMoveOutOfStack?.(draggedId);
          setTimeout(() => onReorderTopLevel?.(nodeId, orderedItems), 80);
        } else {
          onReorderTopLevel?.(nodeId, orderedItems);
        }
      }
    } else {
      // Stack drop
      let stackInsertIdx = topLevelItems.length;
      if (targetRow.type === 'stack-boundary') {
        const si = topLevelItems.findIndex(t => t.type === 'stack' && t.id === targetRow.stackId);
        if (si >= 0) stackInsertIdx = targetRow.position === 'start' ? si : si + 1;
      } else if (targetRow.type === 'stack-header') {
        const si = topLevelItems.findIndex(t => t.type === 'stack' && t.id === targetRow.stack.id);
        if (si >= 0) stackInsertIdx = si;
      } else if (targetRow.type === 'routine') {
        const ri = topLevelItems.findIndex(t => t.type === 'routine' && t.id === (targetRow as DisplayRow & { type: 'routine' }).routine.id);
        if (ri >= 0) stackInsertIdx = ri;
      }
      const draggingType = 'stack';
      const originalIdx = topLevelItems.findIndex(t => t.type === draggingType && t.id === draggedId);
      const removedBefore = originalIdx >= 0 && originalIdx < stackInsertIdx ? 1 : 0;
      const adjustedIdx = Math.min(stackInsertIdx - removedBefore, topLevelItems.length - 1);
      const filteredTopLevel = topLevelItems.filter(t => !(t.type === draggingType && t.id === draggedId));
      const newOrdering = [...filteredTopLevel];
      newOrdering.splice(Math.min(adjustedIdx, newOrdering.length), 0, { type: draggingType, id: draggedId, order: 0 });
      onReorderTopLevel?.(nodeId, newOrdering.map(t => ({ type: t.type, id: t.id })));
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [displayRows, topLevelItems, routines, nodeId, onReorderTopLevel, onMoveToStack, onMoveOutOfStack, onReorderInStack]);

  const onTableLayout = useCallback(() => {
    leftColumnRef.current?.measureInWindow((_x, y) => {
      tableTopRef.value = y;
    });
  }, [tableTopRef]);

  const handleAdd = useCallback(() => {
    if (newTitle.trim()) {
      onCreate(newTitle.trim());
      setNewTitle('');
      setAddMode(false);
    }
  }, [newTitle, onCreate]);

  const handleTitleSubmit = useCallback((routineId: string) => {
    if (editingTitle.trim() && editingTitle.trim() !== routines.find(r => r.id === routineId)?.title) {
      onUpdateTitle(routineId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingTitle, routines, onUpdateTitle]);

  const handleStackTitleSubmit = useCallback((stackId: string) => {
    if (editingStackTitle.trim() && onUpdateStackTitle) {
      onUpdateStackTitle(stackId, editingStackTitle.trim());
    }
    setEditingStackId(null);
    setEditingStackTitle('');
  }, [editingStackTitle, onUpdateStackTitle]);

  const handleToggleActiveDay = useCallback((routineId: string, dayIndex: number) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const currentDays = routine.activeDays || [0, 1, 2, 3, 4, 5, 6];
    let newDays: number[];
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex);
      if (newDays.length === 0) return;
    } else {
      newDays = [...currentDays, dayIndex].sort((a, b) => a - b);
    }
    onUpdateActiveDays(routineId, newDays.length === 7 ? undefined : newDays);
  }, [routines, onUpdateActiveDays]);

  const handleCreateStack = useCallback(() => {
    if (newStackTitle.trim() && onCreateStack) {
      onCreateStack(newStackTitle.trim());
      setNewStackTitle('');
      setShowNewStackInput(false);
    }
  }, [newStackTitle, onCreateStack]);

  const weekDayIndices = useMemo(() => weekDates.map(d => getDayOfWeekIndex(d)), [weekDates]);

  // --- Stable callback bridge ---
  // handleDrop の最新版を Ref で保持し、deps=[] の stable 関数経由で worklet から呼ぶ。
  // これにより gestures useMemo の deps が handleDrop に依存せず、ドラッグ中に再生成されない。
  const handleDropRef = useRef(handleDrop);
  handleDropRef.current = handleDrop;
  const stableHandleDrop = useCallback(
    (id: string, idx: number, isStack: boolean) => handleDropRef.current(id, idx, isStack),
    [],
  );

  // --- Pre-memoized gesture objects per routine ID ---
  // displayRows は draggingIdSV に依存しないため、ドラッグ開始時にジェスチャーが再生成されない。
  // GestureDetector に同じオブジェクトが渡り続けるので RNGH v2 がキャンセルしない。
  const routineGestures = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Gesture.Pan>>();
    const offsets = rowOffsets;
    displayRows.forEach((row, i) => {
      if (row.type !== 'routine') return;
      const routineId = row.routine.id;
      const rowY = offsets[i] ?? 0;
      map.set(routineId, Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart((e) => {
          'worklet';
          // React setState を一切呼ばない → React 再レンダリングなし → GestureDetector 再レンダリングなし
          draggingIdSV.value = routineId;
          draggingIsStackSV.value = 0;
          dragStartRowY.value = rowY;
          dragTranslateY.value = 0;
          touchOffsetWithinRow.value = Math.max(0, Math.min(
            e.absoluteY - tableTopRef.value - TABLE_HEADER_OFFSET - rowY,
            ROUTINE_ROW_H,
          ));
        })
        .onUpdate((e) => {
          'worklet';
          dragTranslateY.value = e.translationY;
          const centerY = (e.absoluteY - tableTopRef.value - TABLE_HEADER_OFFSET)
            - touchOffsetWithinRow.value + ROUTINE_ROW_H / 2;
          dropLineSV.value = computeDropLineIdx(centerY, offsets);
        })
        .onEnd(() => {
          'worklet';
          const draggedId = draggingIdSV.value;
          const dropIdx = dropLineSV.value;
          dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          draggingIdSV.value = '';
          dropLineSV.value = -1;
          if (draggedId && dropIdx >= 0) {
            runOnJS(stableHandleDrop)(draggedId, dropIdx, false);
          }
        })
        .onFinalize(() => {
          'worklet';
          draggingIdSV.value = '';
          dropLineSV.value = -1;
        })
      );
    });
    return map;
  }, [displayRows, rowOffsets, stableHandleDrop,
      draggingIdSV, draggingIsStackSV, dropLineSV,
      dragStartRowY, dragTranslateY, touchOffsetWithinRow, tableTopRef]);

  // --- Pre-memoized gesture objects per stack ID ---
  const stackGestures = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Gesture.Pan>>();
    const offsets = rowOffsets;
    displayRows.forEach((row, i) => {
      if (row.type !== 'stack-header') return;
      const stackId = row.stack.id;
      const rowY = offsets[i] ?? 0;
      map.set(stackId, Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart((e) => {
          'worklet';
          draggingIdSV.value = stackId;
          draggingIsStackSV.value = 1;
          dragStartRowY.value = rowY;
          dragTranslateY.value = 0;
          touchOffsetWithinRow.value = Math.max(0, Math.min(
            e.absoluteY - tableTopRef.value - TABLE_HEADER_OFFSET - rowY,
            STACK_HEADER_H,
          ));
        })
        .onUpdate((e) => {
          'worklet';
          dragTranslateY.value = e.translationY;
          const centerY = (e.absoluteY - tableTopRef.value - TABLE_HEADER_OFFSET)
            - touchOffsetWithinRow.value + STACK_HEADER_H / 2;
          dropLineSV.value = computeDropLineIdx(centerY, offsets);
        })
        .onEnd(() => {
          'worklet';
          const draggedId = draggingIdSV.value;
          const dropIdx = dropLineSV.value;
          dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
          draggingIdSV.value = '';
          dropLineSV.value = -1;
          if (draggedId && dropIdx >= 0) {
            runOnJS(stableHandleDrop)(draggedId, dropIdx, true);
          }
        })
        .onFinalize(() => {
          'worklet';
          draggingIdSV.value = '';
          dropLineSV.value = -1;
        })
      );
    });
    return map;
  }, [displayRows, rowOffsets, stableHandleDrop,
      draggingIdSV, draggingIsStackSV, dropLineSV,
      dragStartRowY, dragTranslateY, touchOffsetWithinRow, tableTopRef]);

  // --- Render helpers ---
  const renderStackBoundary = (row: DisplayRow & { type: 'stack-boundary' }) => {
    return (
      <View
        key={`boundary-${row.position}-${row.stackId}`}
        style={{ height: STACK_BOUNDARY_H, justifyContent: 'center', paddingHorizontal: 4 }}
      >
        <View style={{ height: 2, backgroundColor: C.stackBoundary, borderRadius: 1, marginHorizontal: 2 }} />
      </View>
    );
  };

  const renderStackHeader = (row: DisplayRow & { type: 'stack-header' }) => {
    const stackDragGesture = isActiveDaysMode ? stackGestures.get(row.stack.id) : undefined;

    const headerContent = (
      <View>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', height: STACK_HEADER_H,
            paddingHorizontal: 8, gap: 6,
            backgroundColor: C.stackHeaderBg,
          }}
        >
          <LucideIcon name="layers" size={13} color={C.stackLine} />
          {editingStackId === row.stack.id ? (
            <TextInput
              value={editingStackTitle}
              onChangeText={setEditingStackTitle}
              onBlur={() => handleStackTitleSubmit(row.stack.id)}
              onSubmitEditing={() => handleStackTitleSubmit(row.stack.id)}
              style={{
                flex: 1, color: C.stackLine, fontSize: 13,
                fontWeight: '700', padding: 2,
                backgroundColor: '#2A2A2A', borderRadius: 4,
              }}
              autoFocus
            />
          ) : (
            <Pressable
              style={{ flex: 1 }}
              onLongPress={() => {
                // Default mode: inline edit. Edit mode: drag (handled by gesture)
                if (!isActiveDaysMode) {
                  setEditingStackId(row.stack.id);
                  setEditingStackTitle(row.stack.title);
                }
              }}
            >
              <Text style={{ color: C.stackLine, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {row.stack.title || '無題のスタック'}
              </Text>
            </Pressable>
          )}
          {isActiveDaysMode && (
            <Pressable
              onPress={() => onDeleteStack?.(row.stack.id)}
              style={{ padding: 4 }}
            >
              <LucideIcon name="trash-2" size={13} color="#EF4444" />
            </Pressable>
          )}
        </View>
        <Divider />
      </View>
    );

    const inner = stackDragGesture ? (
      <GestureDetector gesture={stackDragGesture}>
        {headerContent}
      </GestureDetector>
    ) : headerContent;

    return (
      <AnimatedStackRow key={`stack-${row.stack.id}`} stackId={row.stack.id} draggingIdSV={draggingIdSV}>
        {inner}
      </AnimatedStackRow>
    );
  };

  const renderRoutineRow = (
    row: DisplayRow & { type: 'routine' },
    rowIndex: number,
    totalRows: number,
  ) => {
    const { routine, inStack, isLastInStack } = row;
    const isLastRow = rowIndex === totalRows - 1 ||
      (rowIndex < totalRows - 1 && displayRows[rowIndex + 1]?.type === 'stack-boundary');

    const panGesture = isActiveDaysMode ? routineGestures.get(routine.id) : undefined;

    const rowInner = (
      <View style={{
        flexDirection: 'row', alignItems: 'center', height: ROUTINE_ROW_H,
        paddingHorizontal: 4, gap: 8,
        backgroundColor: C.rowBg,
      }}>
        {/* Stack connector line */}
        {inStack && (
          <>
            <View style={{
              position: 'absolute', left: 8, top: 0,
              bottom: isLastInStack ? '50%' : 0,
              width: 2, backgroundColor: C.stackLine, opacity: 0.5,
            }} />
            <View style={{
              position: 'absolute', left: 5, top: ROUTINE_ROW_H / 2 - 3,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: C.stackLine, opacity: 0.7,
            }} />
          </>
        )}
        <View style={{ width: 4 }} />

        {/* Color dot */}
        <Pressable onPress={() => setColorPickerId(routine.id)}>
          <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: routine.color }} />
        </Pressable>

        {/* Title */}
        {editingId === routine.id ? (
          <TextInput
            value={editingTitle}
            onChangeText={setEditingTitle}
            onBlur={() => handleTitleSubmit(routine.id)}
            onSubmitEditing={() => handleTitleSubmit(routine.id)}
            style={{
              flex: 1, color: C.routineName, fontSize: 14,
              fontWeight: '500', padding: 2,
              backgroundColor: '#2A2A2A', borderRadius: 4,
            }}
            autoFocus
          />
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.routineName, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
              {routine.title}
            </Text>
          </View>
        )}
        {isActiveDaysMode && (
          <View style={{ opacity: 0.4 }}>
            <LucideIcon name="grip-vertical" size={16} color={C.grip} />
          </View>
        )}
      </View>
    );

    return (
      // AnimatedRow: opacity は useSharedValue で制御 → React 再レンダリングなし
      <AnimatedRow key={routine.id} routineId={routine.id} draggingIdSV={draggingIdSV}>
        {panGesture ? (
          <GestureDetector gesture={panGesture}>
            {rowInner}
          </GestureDetector>
        ) : (
          <Pressable
            onLongPress={() => {
              if (!isActiveDaysMode) {
                setEditingId(routine.id);
                setEditingTitle(routine.title);
              }
            }}
          >
            {rowInner}
          </Pressable>
        )}
        {!isLastRow && <Divider />}
      </AnimatedRow>
    );
  };

  // --- Right column render helpers ---
  const renderRightStackBoundary = (row: DisplayRow & { type: 'stack-boundary' }) => {
    return (
      <View
        key={`boundary-right-${row.position}-${row.stackId}`}
        style={{ height: STACK_BOUNDARY_H }}
      />
    );
  };

  const renderRightStackHeader = (row: DisplayRow & { type: 'stack-header' }) => {
    return (
      <View
        key={`stack-right-${row.stack.id}`}
      >
        <View style={{ flexDirection: 'row', height: STACK_HEADER_H }}>
          {weekDates.map((date) => {
            const isToday = date === todayString;
            const isFuture = date > todayString;
            if (isFuture || isActiveDaysMode) {
              return <View key={date} style={{ width: 52 }} />;
            }
            const activeInStack = row.stackRoutines.filter(r => isRoutineActiveOnDate(r, date));
            const checkedCount = activeInStack.filter(r => r.history?.[date]).length;
            const allChecked = activeInStack.length > 0 && checkedCount === activeInStack.length;
            const someChecked = checkedCount > 0 && !allChecked;
            return (
              <View key={date} style={{ width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? '#6366F110' : 'transparent' }}>
                <TouchableOpacity
                  onPress={() => onToggleStack?.(row.stack.id, date)}
                  activeOpacity={0.7}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: allChecked ? C.stackLine : someChecked ? `${C.stackLine}60` : '#334155',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: someChecked ? 2 : 0,
                    borderColor: C.stackLine,
                  }}
                >
                  {(allChecked || someChecked) && <LucideIcon name="check" size={16} color={C.white} />}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        <Divider />
      </View>
    );
  };

  const renderRightRoutineRow = (
    row: DisplayRow & { type: 'routine' },
    rowIndex: number,
    totalRows: number,
  ) => {
    const { routine } = row;
    const isLastRow = rowIndex === totalRows - 1 ||
      (rowIndex < totalRows - 1 && displayRows[rowIndex + 1]?.type === 'stack-boundary');

    return (
      <View key={`right-${routine.id}`}>
        <View style={{ flexDirection: 'row', height: ROUTINE_ROW_H }}>
          {weekDates.map((date, colIndex) => {
            const isToday = date === todayString;
            const isFuture = date > todayString;
            const isChecked = routine.history?.[date] || false;
            const isActive = isRoutineActiveOnDate(routine, date);

            if (isActiveDaysMode) {
              const dayIdx = weekDayIndices[colIndex];
              const isOn = routine.activeDays ? routine.activeDays.includes(dayIdx) : true;
              return (
                <View key={date} style={{ width: 52, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={() => handleToggleActiveDay(routine.id, dayIdx)}
                    activeOpacity={0.7}
                    style={{
                      width: 48, height: 48, borderRadius: 8,
                      backgroundColor: isOn ? '#8B5CF6' : C.unchecked,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isOn && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.white }} />}
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View
                key={date}
                style={{
                  width: 52, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isToday ? '#6366F110' : 'transparent',
                }}
              >
                {isFuture ? (
                  <View style={{
                    width: 48, height: 48, borderRadius: 8,
                    backgroundColor: C.unchecked,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: isActive ? 1 : 0.3,
                  }}>
                    <Text style={{ color: '#94A3B8', fontSize: 16 }}>-</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => isActive ? onToggle(routine.id, date) : undefined}
                    disabled={!isActive}
                    activeOpacity={0.7}
                    style={{
                      width: 48, height: 48, borderRadius: 8,
                      backgroundColor: isChecked ? routine.color : C.unchecked,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: isActive ? 1 : 0.3,
                    }}
                  >
                    {isChecked && <LucideIcon name="check" size={22} color={C.white} />}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        {!isLastRow && <Divider />}
      </View>
    );
  };

  const leftColumnContent = (
    <Animated.View ref={leftColumnRef} style={[leftColAnimStyle, { overflow: 'visible' }]} onLayout={onTableLayout}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8, gap: 12 }}>
        <Text style={{ color: C.headerText, fontSize: 14, fontWeight: '600' }}>タスク</Text>
        <Pressable onPress={() => setIsActiveDaysMode(!isActiveDaysMode)}>
          <Text style={{ color: isActiveDaysMode ? C.white : C.headerText, fontSize: 14, fontWeight: '600' }}>
            {isActiveDaysMode ? '完了' : '編集'}
          </Text>
        </Pressable>
      </View>
      <Divider />

      {/* Display rows - left */}
      {displayRows.map((row, i) => {
        if (row.type === 'stack-boundary') return renderStackBoundary(row);
        if (row.type === 'stack-header') return renderStackHeader(row);
        return renderRoutineRow(row, i, displayRows.length);
      })}

      {/* Ghost layer: 各ドラッグ可能行に1つ。useSharedValue で表示/非表示 → React 再レンダリングなし */}
      {displayRows.map((row) => {
        if (row.type === 'routine') {
          return (
            <DragGhostRow
              key={`ghost-${row.routine.id}`}
              rowId={row.routine.id}
              title={row.routine.title}
              color={row.routine.color}
              isStack={false}
              rowH={ROUTINE_ROW_H}
              draggingIdSV={draggingIdSV}
              dragStartRowY={dragStartRowY}
              dragTranslateY={dragTranslateY}
            />
          );
        }
        if (row.type === 'stack-header') {
          return (
            <DragGhostRow
              key={`ghost-stack-${row.stack.id}`}
              rowId={row.stack.id}
              title={row.stack.title}
              color={C.stackLine}
              isStack={true}
              rowH={STACK_HEADER_H}
              draggingIdSV={draggingIdSV}
              dragStartRowY={dragStartRowY}
              dragTranslateY={dragTranslateY}
            />
          );
        }
        return null;
      })}

      {/* ドロップ位置インジケーター（アニメーション水平線） */}
      <DropLineView dropLineSV={dropLineSV} rowOffsets={rowOffsets} />

      {displayRows.length > 0 && <Divider />}

      {/* Stack creation (edit mode) */}
      {isActiveDaysMode && onCreateStack && (
        <Pressable
          onPress={() => { setShowNewStackInput(true); setTimeout(() => newStackInputRef.current?.focus(), 100); }}
          style={{ flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 8, gap: 6, backgroundColor: C.addRowBg }}
        >
          {showNewStackInput ? (
            <TextInput
              ref={newStackInputRef}
              value={newStackTitle}
              onChangeText={setNewStackTitle}
              onSubmitEditing={handleCreateStack}
              onBlur={() => { if (!newStackTitle.trim()) setShowNewStackInput(false); }}
              placeholder="スタック名..."
              placeholderTextColor={C.addText}
              style={{ flex: 1, color: C.stackLine, fontSize: 12, fontWeight: '600', padding: 0 }}
            />
          ) : (
            <>
              <LucideIcon name="layers" size={13} color={C.stackLine} />
              <Text style={{ color: C.stackLine, fontSize: 12, fontWeight: '500', opacity: 0.7 }}>スタック作成</Text>
            </>
          )}
        </Pressable>
      )}

      {/* Add row */}
      <Pressable
        onPress={() => { setAddMode(true); setTimeout(() => addInputRef.current?.focus(), 100); }}
        style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8, gap: 6, backgroundColor: C.addRowBg, borderBottomLeftRadius: 6 }}
      >
        {addMode ? (
          <TextInput
            ref={addInputRef}
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleAdd}
            onBlur={() => { if (!newTitle.trim()) setAddMode(false); }}
            placeholder="追加..."
            placeholderTextColor={C.addText}
            style={{ flex: 1, color: C.routineName, fontSize: 12, fontWeight: '500', padding: 0 }}
          />
        ) : (
          <>
            <LucideIcon name="plus" size={14} color={C.addText} />
            <Text style={{ color: C.addText, fontSize: 12, fontWeight: '500' }}>追加...</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );

  return (
    <GestureHandlerRootView>
      {/* Week Selector */}
      <WeekSelector weekOffset={weekOffset} onWeekChange={onWeekChange} disabled={isActiveDaysMode} />

      {/* Description */}
      <Text style={{ color: C.headerText, fontSize: 12, marginTop: 16, marginBottom: 12 }}>
        日々の習慣を管理。「編集」で曜日設定・並び替え・スタック操作。
      </Text>

      {/* Table */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left fixed column (with resize gesture in default mode) */}
        {isActiveDaysMode ? (
          leftColumnContent
        ) : (
          <GestureDetector gesture={columnResizeGesture}>
            {leftColumnContent}
          </GestureDetector>
        )}

        {/* Right scrollable columns */}
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            <View>
              {/* Header */}
              <View style={{ flexDirection: 'row', height: 48 }}>
                {weekDates.map((date, i) => {
                  const isToday = date === todayString;
                  return (
                    <View key={date} style={{ width: 52, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: isToday ? '#6366F120' : 'transparent' }}>
                      <Text style={{ color: isToday ? '#A78BFA' : C.headerText, fontSize: 12, fontWeight: '500' }}>{getDayLabel(i)}</Text>
                      {!isActiveDaysMode && (
                        <Text style={{ color: isToday ? '#A78BFA' : C.dateText, fontSize: 12 }}>{date.slice(8)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <Divider />

              {/* Display rows - right (displayRows と同期) */}
              {displayRows.map((row, i) => {
                if (row.type === 'stack-boundary') return renderRightStackBoundary(row);
                if (row.type === 'stack-header') return renderRightStackHeader(row);
                return renderRightRoutineRow(row, i, displayRows.length);
              })}

              {displayRows.length > 0 && <Divider />}
              {isActiveDaysMode && onCreateStack && <View style={{ height: 40 }} />}
              <View style={{ height: 48 }} />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Color Picker Modal */}
      {colorPickerId && (
        <ColorPickerModal
          currentColor={routines.find(r => r.id === colorPickerId)?.color || '#8B5CF6'}
          onSelectColor={(color) => { onUpdateColor(colorPickerId, color); setColorPickerId(null); }}
          onClose={() => setColorPickerId(null)}
        />
      )}
    </GestureHandlerRootView>
  );
}

// --- WeekSelector ---
function WeekSelector({ weekOffset, onWeekChange, disabled }: { weekOffset: number; onWeekChange: (offset: number) => void; disabled: boolean }) {
  if (disabled) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
      <Pressable onPress={() => onWeekChange(weekOffset - 1)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
        <LucideIcon name="chevron-left" size={20} color={C.dateText} />
      </Pressable>
      <Pressable
        onPress={() => onWeekChange(0)}
        style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, backgroundColor: weekOffset === 0 ? C.weekLabel : 'transparent', opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ color: weekOffset === 0 ? C.white : C.headerText, fontSize: 14, fontWeight: '600' }}>今週</Text>
      </Pressable>
      <Pressable
        onPress={() => weekOffset < 0 && onWeekChange(weekOffset + 1)}
        disabled={weekOffset >= 0}
        style={({ pressed }) => ({ opacity: weekOffset >= 0 ? 0.3 : pressed ? 0.5 : 1 })}
      >
        <LucideIcon name="chevron-right" size={20} color={C.dateText} />
      </Pressable>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.divider }} />;
}

function ColorPickerModal({ currentColor, onSelectColor, onClose }: { currentColor: string; onSelectColor: (color: string) => void; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
        <View style={{ backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, width: 200 }} onStartShouldSetResponder={() => true}>
          <Text style={{ color: C.white, fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>色を選択</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {ROUTINE_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => onSelectColor(color)}
                activeOpacity={0.7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: color === currentColor ? 3 : 0, borderColor: C.white, margin: 6 }}
              />
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
