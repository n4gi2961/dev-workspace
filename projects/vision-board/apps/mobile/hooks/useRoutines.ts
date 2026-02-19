import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@vision-board/supabase';
import type { Routine, RoutineNode, RoutineStack } from '@vision-board/shared/lib';
import { generateId, getRandomColor } from '@vision-board/shared';
import { getTodayString } from '@vision-board/shared/lib';
import * as Haptics from 'expo-haptics';
import { dataEvents } from '../lib/dataEvents';
import { queueStarColor, dequeueStarColor } from './useStarStack';
import { computeMeteorLottery } from '../lib/meteorLottery';

export type { Routine, RoutineNode, RoutineStack } from '@vision-board/shared/lib';

const CACHE_KEY_PREFIX = 'routines_cache_';
const ROUTINE_NODES_CACHE_KEY_PREFIX = 'routine_nodes_cache_';
const STACKS_CACHE_KEY_PREFIX = 'routine_stacks_cache_';
const PENDING_QUEUE_KEY = 'routines_pending_queue';

// --- Module-level memory cache for instant board switching ---
const routinesMemoryCache = new Map<string, Record<string, Routine>>();
const routineNodesMemoryCache = new Map<string, RoutineNode[]>();
const stacksMemoryCache = new Map<string, Record<string, RoutineStack>>();

export async function preloadBoardRoutines(boardIds: string[]): Promise<void> {
  await Promise.all(
    boardIds.map(async (id) => {
      if (!routinesMemoryCache.has(id)) {
        try {
          const c = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
          if (c) routinesMemoryCache.set(id, JSON.parse(c));
        } catch {}
      }
      if (!routineNodesMemoryCache.has(id)) {
        try {
          const c = await AsyncStorage.getItem(`${ROUTINE_NODES_CACHE_KEY_PREFIX}${id}`);
          if (c) routineNodesMemoryCache.set(id, JSON.parse(c));
        } catch {}
      }
      if (!stacksMemoryCache.has(id)) {
        try {
          const c = await AsyncStorage.getItem(`${STACKS_CACHE_KEY_PREFIX}${id}`);
          if (c) stacksMemoryCache.set(id, JSON.parse(c));
        } catch {}
      }
    }),
  );
}

interface PendingAction {
  type: 'check' | 'create' | 'delete' | 'update' | 'reorder' | 'stack_create' | 'stack_delete' | 'stack_update' | 'stack_assign' | 'stack_remove' | 'reorder_toplevel' | 'move_to_stack' | 'move_out_of_stack';
  routineId?: string;
  nodeId?: string;
  stackId?: string;
  date?: string;
  newChecked?: boolean;
  data?: Record<string, unknown>;
  timestamp: number;
}

export function useRoutines(boardId: string | null, userId: string | null) {
  const [routines, setRoutines] = useState<Record<string, Routine>>({});
  const [routineNodes, setRoutineNodes] = useState<RoutineNode[]>([]);
  const [routineStacks, setRoutineStacks] = useState<Record<string, RoutineStack>>({});
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);
  const instanceIdRef = useRef(`routines_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const stateVersionRef = useRef(0);
  const routinesRef = useRef(routines);
  routinesRef.current = routines; // always points to latest state (updated every render)

  const cacheKey = boardId ? `${CACHE_KEY_PREFIX}${boardId}` : null;
  const routineNodesCacheKey = boardId ? `${ROUTINE_NODES_CACHE_KEY_PREFIX}${boardId}` : null;
  const stacksCacheKey = boardId ? `${STACKS_CACHE_KEY_PREFIX}${boardId}` : null;

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      if (!offline && !syncingRef.current) {
        syncPendingActions();
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Cache helpers ---

  const loadCachedRoutines = useCallback(async () => {
    if (!cacheKey) return null;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, Routine>;
    } catch (err) {
      console.error('Failed to load cached routines:', err);
    }
    return null;
  }, [cacheKey]);

  const saveRoutinesToCache = useCallback(async (data: Record<string, Routine>) => {
    if (!cacheKey) return;
    if (boardId) routinesMemoryCache.set(boardId, data);
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to cache routines:', err);
    }
  }, [cacheKey, boardId]);

  const loadCachedRoutineNodes = useCallback(async () => {
    if (!routineNodesCacheKey) return null;
    try {
      const cached = await AsyncStorage.getItem(routineNodesCacheKey);
      if (cached) return JSON.parse(cached) as RoutineNode[];
    } catch (err) {
      console.error('Failed to load cached routine_nodes:', err);
    }
    return null;
  }, [routineNodesCacheKey]);

  const saveRoutineNodesToCache = useCallback(async (data: RoutineNode[]) => {
    if (!routineNodesCacheKey) return;
    if (boardId) routineNodesMemoryCache.set(boardId, data);
    try {
      await AsyncStorage.setItem(routineNodesCacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to cache routine_nodes:', err);
    }
  }, [routineNodesCacheKey, boardId]);

  const loadCachedStacks = useCallback(async () => {
    if (!stacksCacheKey) return null;
    try {
      const cached = await AsyncStorage.getItem(stacksCacheKey);
      if (cached) return JSON.parse(cached) as Record<string, RoutineStack>;
    } catch (err) {
      console.error('Failed to load cached stacks:', err);
    }
    return null;
  }, [stacksCacheKey]);

  const saveStacksToCache = useCallback(async (data: Record<string, RoutineStack>) => {
    if (!stacksCacheKey) return;
    if (boardId) stacksMemoryCache.set(boardId, data);
    try {
      await AsyncStorage.setItem(stacksCacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to cache stacks:', err);
    }
  }, [stacksCacheKey, boardId]);

  // --- Pending queue ---

  const loadPendingCount = useCallback(async () => {
    try {
      const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      if (pending) {
        const queue = JSON.parse(pending) as PendingAction[];
        setPendingCount(queue.length);
      }
    } catch {
      // Ignore
    }
  }, []);

  const addToPendingQueue = useCallback(async (action: PendingAction) => {
    try {
      const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      const queue: PendingAction[] = pending ? JSON.parse(pending) : [];

      // For check actions, deduplicate by routineId+date
      if (action.type === 'check') {
        const filtered = queue.filter(
          (a) => !(a.type === 'check' && a.routineId === action.routineId && a.date === action.date)
        );
        filtered.push(action);
        await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
        setPendingCount(filtered.length);
      } else {
        queue.push(action);
        await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
        setPendingCount(queue.length);
      }
    } catch (err) {
      console.error('Failed to add to pending queue:', err);
    }
  }, []);

  // --- Sync pending actions ---

  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      if (!pending) { syncingRef.current = false; return; }

      const queue: PendingAction[] = JSON.parse(pending);
      if (queue.length === 0) { syncingRef.current = false; return; }

      const supabase = createClient();
      const processed: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        try {
          if (action.type === 'check' && action.routineId && action.date != null) {
            const { data: current } = await supabase
              .from('routines').select('history').eq('id', action.routineId).single();
            if (current) {
              const newHistory = { ...(current.history || {}), [action.date]: action.newChecked };
              const { error } = await supabase
                .from('routines').update({ history: newHistory }).eq('id', action.routineId);
              if (!error) processed.push(i);
            }
          } else if (action.type === 'create' && action.data) {
            const d = action.data as Record<string, unknown>;
            const { error: re } = await supabase.from('routines').insert(d.routineInsert as Record<string, unknown>);
            if (!re) {
              const { error: rne } = await supabase.from('routine_nodes').insert(d.routineNodeInsert as Record<string, unknown>);
              if (!rne) processed.push(i);
            }
          } else if (action.type === 'delete' && action.routineId) {
            const { error } = await supabase.from('routines').delete().eq('id', action.routineId);
            if (!error) processed.push(i);
          } else if (action.type === 'update' && action.routineId && action.data) {
            const { error } = await supabase
              .from('routines').update(action.data as Record<string, unknown>).eq('id', action.routineId);
            if (!error) processed.push(i);
          } else if (action.type === 'reorder' && action.data) {
            const links = action.data.links as Array<{ id: string; sortOrder: number }>;
            let ok = true;
            for (const link of links) {
              const { error } = await supabase
                .from('routine_nodes').update({ sort_order: link.sortOrder }).eq('id', link.id);
              if (error) { ok = false; break; }
            }
            if (ok) processed.push(i);
          } else if (action.type === 'stack_create' && action.data) {
            const { error } = await supabase.from('routine_stacks').insert(action.data.insertData as Record<string, unknown>);
            if (!error) processed.push(i);
          } else if (action.type === 'stack_delete' && action.stackId) {
            const { error } = await supabase.from('routine_stacks').delete().eq('id', action.stackId);
            if (!error) processed.push(i);
          } else if (action.type === 'stack_update' && action.stackId && action.data) {
            if (action.data.reorderUpdates) {
              const updates = action.data.reorderUpdates as Array<{ id: string; stack_order: number }>;
              let ok = true;
              for (const u of updates) {
                const { error } = await supabase.from('routines').update({ stack_order: u.stack_order }).eq('id', u.id);
                if (error) { ok = false; break; }
              }
              if (ok) processed.push(i);
            } else {
              const { error } = await supabase.from('routine_stacks').update(action.data as Record<string, unknown>).eq('id', action.stackId);
              if (!error) processed.push(i);
            }
          } else if ((action.type === 'stack_assign' || action.type === 'stack_remove') && action.routineId && action.data) {
            const { error } = await supabase.from('routines').update(action.data as Record<string, unknown>).eq('id', action.routineId);
            if (!error) processed.push(i);
          } else if (action.type === 'reorder_toplevel' && action.data) {
            const d = action.data as { routineUpdates: Array<{ linkId: string; sortOrder: number }>; stackUpdates: Array<{ stackId: string; sortOrder: number }> };
            let ok = true;
            for (const u of d.routineUpdates) {
              const { error } = await supabase.from('routine_nodes').update({ sort_order: u.sortOrder }).eq('id', u.linkId);
              if (error) { ok = false; break; }
            }
            if (ok) {
              for (const u of d.stackUpdates) {
                const { error } = await supabase.from('routine_stacks').update({ sort_order: u.sortOrder }).eq('id', u.stackId);
                if (error) { ok = false; break; }
              }
            }
            if (ok) processed.push(i);
          } else if (action.type === 'move_to_stack' && action.routineId && action.data) {
            const d = action.data as { stackOrderUpdates: Array<{ id: string; stack_id: string; stack_order: number }> };
            let ok = true;
            for (const u of d.stackOrderUpdates) {
              const { error } = await supabase.from('routines').update({ stack_id: u.stack_id, stack_order: u.stack_order }).eq('id', u.id);
              if (error) { ok = false; break; }
            }
            if (ok) processed.push(i);
          } else if (action.type === 'move_out_of_stack' && action.routineId && action.data) {
            const { error } = await supabase.from('routines').update(action.data as Record<string, unknown>).eq('id', action.routineId);
            if (!error) processed.push(i);
          }
        } catch {
          // Continue with next
        }
      }

      const remaining = queue.filter((_, i) => !processed.includes(i));
      await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
      setPendingCount(remaining.length);

      if (processed.length > 0) loadRoutines();
    } catch (err) {
      console.error('Failed to sync pending actions:', err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // --- Load routines + routine_nodes ---

  const loadRoutines = useCallback(async () => {
    if (!boardId || !userId) return;

    const versionAtStart = stateVersionRef.current;

    // Memory cache first (synchronous — instant board switch)
    const memRoutines = boardId ? routinesMemoryCache.get(boardId) : null;
    const memNodes = boardId ? routineNodesMemoryCache.get(boardId) : null;
    const memStacks = boardId ? stacksMemoryCache.get(boardId) : null;
    if (memRoutines && stateVersionRef.current === versionAtStart) {
      setRoutines(memRoutines);
      setLoading(false);
    }
    if (memNodes && stateVersionRef.current === versionAtStart) {
      setRoutineNodes(memNodes);
    }
    if (memStacks && stateVersionRef.current === versionAtStart) {
      setRoutineStacks(memStacks);
    }

    // AsyncStorage cache fallback (only if memory cache missed)
    if (!memRoutines || !memNodes || !memStacks) {
      const [cachedRoutines, cachedNodes, cachedStacks] = await Promise.all([
        !memRoutines ? loadCachedRoutines() : null,
        !memNodes ? loadCachedRoutineNodes() : null,
        !memStacks ? loadCachedStacks() : null,
      ]);
      if (cachedRoutines && stateVersionRef.current === versionAtStart) {
        setRoutines(cachedRoutines);
        if (boardId) routinesMemoryCache.set(boardId, cachedRoutines);
        setLoading(false);
      }
      if (cachedNodes && stateVersionRef.current === versionAtStart) {
        setRoutineNodes(cachedNodes);
        if (boardId) routineNodesMemoryCache.set(boardId, cachedNodes);
      }
      if (cachedStacks && stateVersionRef.current === versionAtStart) {
        setRoutineStacks(cachedStacks);
        if (boardId) stacksMemoryCache.set(boardId, cachedStacks);
      }
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsOffline(true);
      if (!memRoutines) setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const [routinesRes, routineNodesRes, stacksRes] = await Promise.all([
        supabase.from('routines').select('*').eq('board_id', boardId),
        supabase.from('routine_nodes').select('*').eq('user_id', userId),
        supabase.from('routine_stacks').select('*').eq('board_id', boardId),
      ]);

      if (routinesRes.error) {
        console.error('Failed to load routines:', routinesRes.error);
        return;
      }
      if (routineNodesRes.error) {
        console.error('Failed to load routine_nodes:', routineNodesRes.error);
        return;
      }

      const routinesMap: Record<string, Routine> = {};
      (routinesRes.data || []).forEach(
        (r: {
          id: string; board_id: string; title: string; color: string;
          history?: Record<string, boolean>; created_at?: string; active_days?: number[];
          stack_id?: string | null; stack_order?: number;
        }) => {
          routinesMap[r.id] = {
            id: r.id, boardId: r.board_id, title: r.title, color: r.color,
            history: r.history || {}, createdAt: r.created_at,
            activeDays: r.active_days || undefined,
            stackId: r.stack_id || null,
            stackOrder: r.stack_order || 0,
          };
        }
      );

      const routineNodesList: RoutineNode[] = (routineNodesRes.data || []).map(
        (rn: { id: string; routine_id: string; node_id: string; sort_order: number }) => ({
          id: rn.id, routineId: rn.routine_id, nodeId: rn.node_id, sortOrder: rn.sort_order,
        })
      );

      const stacksMap: Record<string, RoutineStack> = {};
      if (!stacksRes.error) {
        (stacksRes.data || []).forEach(
          (s: {
            id: string; board_id: string; node_id: string; user_id: string;
            title: string; sort_order: number; created_at?: string;
          }) => {
            stacksMap[s.id] = {
              id: s.id, boardId: s.board_id, nodeId: s.node_id,
              userId: s.user_id, title: s.title, sortOrder: s.sort_order,
              createdAt: s.created_at,
            };
          }
        );
      }

      // Only update state if no newer optimistic updates occurred
      if (stateVersionRef.current === versionAtStart) {
        setRoutines(routinesMap);
        setRoutineNodes(routineNodesList);
        setRoutineStacks(stacksMap);
        await Promise.all([
          saveRoutinesToCache(routinesMap),
          saveRoutineNodesToCache(routineNodesList),
          saveStacksToCache(stacksMap),
        ]);
      }
    } catch (err) {
      console.error('Failed to load routines:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId, userId, loadCachedRoutines, loadCachedRoutineNodes, loadCachedStacks, saveRoutinesToCache, saveRoutineNodesToCache, saveStacksToCache]);

  // Subscribe to cross-screen routine changes (skip self-emitted events)
  useEffect(() => {
    return dataEvents.on('routines:changed', (sourceId) => {
      if (sourceId === instanceIdRef.current) return;
      if (boardId && userId) loadRoutines();
    });
  }, [boardId, userId, loadRoutines]);

  // Initial load (synchronous swap from memory cache for instant board switch)
  useEffect(() => {
    if (boardId && userId) {
      const cachedR = routinesMemoryCache.get(boardId);
      const cachedRN = routineNodesMemoryCache.get(boardId);
      const cachedS = stacksMemoryCache.get(boardId);
      if (cachedR) {
        setRoutines(cachedR);
        setLoading(false);
      } else {
        setRoutines({});
      }
      setRoutineNodes(cachedRN || []);
      setRoutineStacks(cachedS || {});
      loadRoutines();
      loadPendingCount();
    }
  }, [boardId, userId, loadRoutines, loadPendingCount]);

  // --- Derived data ---

  const routinesList = useMemo(() => Object.values(routines), [routines]);

  // --- 流星抽選 ---
  const meteorWinnerIds = useMemo(() => {
    if (!boardId) return new Set<string>();
    const today = getTodayString();
    const sortedIds = Object.keys(routines).sort();
    return computeMeteorLottery(today, boardId, sortedIds);
  }, [boardId, routines]);

  const isMeteorWinner = useCallback(
    (routineId: string): boolean => meteorWinnerIds.has(routineId),
    [meteorWinnerIds],
  );

  const getRoutinesForNode = useCallback((nodeId: string): Routine[] => {
    const nodeLinks = routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return nodeLinks
      .map(link => {
        const r = routines[link.routineId];
        if (!r) return null;
        return { ...r, displayOrder: link.sortOrder };
      })
      .filter(Boolean) as Routine[];
  }, [routines, routineNodes]);

  // --- Toggle check ---

  const toggleRoutineCheck = useCallback(
    async (routineId: string, date: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      const newChecked = !routine.history[date];
      const newHistory = { ...routine.history, [date]: newChecked };

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines, [routineId]: { ...routine, history: newHistory } };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      if (newChecked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // StarStack: ルーティンの色をpendingキューに追加（流星当選フラグ付き）
        if (boardId) {
          queueStarColor(boardId, routine.color || '#3b82f6', isMeteorWinner(routineId));
        }
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // StarStack: チェック解除時にキューから対応する星を取り除く
        if (boardId) {
          dequeueStarColor(boardId, routine.color || '#3b82f6');
        }
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'check', routineId, date, newChecked, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines').update({ history: newHistory }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({ type: 'check', routineId, date, newChecked, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to toggle routine check, queued for sync:', err);
        return true;
      }
    },
    [routines, userId, saveRoutinesToCache, addToPendingQueue, isMeteorWinner]
  );

  // --- Create routine ---

  const createRoutine = useCallback(
    async (title: string, nodeId: string): Promise<Routine | null> => {
      if (!boardId || !userId) return null;

      const newRoutineId = generateId();
      const randomColor = getRandomColor();
      const newRoutine: Routine = {
        id: newRoutineId, boardId, title, color: randomColor,
        history: {}, createdAt: new Date().toISOString(),
      };

      // Optimistic update + cache save
      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines, [newRoutineId]: newRoutine };
      setRoutines(updatedRoutines);

      const maxSortOrder = routineNodes
        .filter(rn => rn.nodeId === nodeId)
        .reduce((max, rn) => Math.max(max, rn.sortOrder), -1);

      const newRoutineNode: RoutineNode = {
        id: generateId(), routineId: newRoutineId, nodeId, sortOrder: maxSortOrder + 1,
      };
      const updatedRoutineNodes = [...routineNodes, newRoutineNode];
      setRoutineNodes(updatedRoutineNodes);

      await Promise.all([
        saveRoutinesToCache(updatedRoutines),
        saveRoutineNodesToCache(updatedRoutineNodes),
      ]);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const routineInsert = {
        id: newRoutineId, board_id: boardId, user_id: userId,
        title, color: randomColor, history: {}, created_at: newRoutine.createdAt,
      };
      const routineNodeInsert = {
        id: newRoutineNode.id, routine_id: newRoutineId,
        node_id: nodeId, user_id: userId, sort_order: newRoutineNode.sortOrder,
      };

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'create', routineId: newRoutineId, nodeId,
          data: { routineInsert, routineNodeInsert }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return newRoutine;
      }

      try {
        const supabase = createClient();
        const { error: re } = await supabase.from('routines').insert(routineInsert);
        if (re) throw re;
        const { error: rne } = await supabase.from('routine_nodes').insert(routineNodeInsert);
        if (rne) throw rne;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return newRoutine;
      } catch (err) {
        await addToPendingQueue({
          type: 'create', routineId: newRoutineId, nodeId,
          data: { routineInsert, routineNodeInsert }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to create routine, queued:', err);
        return newRoutine;
      }
    },
    [boardId, userId, routines, routineNodes, saveRoutinesToCache, saveRoutineNodesToCache, addToPendingQueue]
  );

  // --- Delete routine ---

  const deleteRoutine = useCallback(
    async (routineId: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return true;

      const relatedLinks = routineNodes.filter(rn => rn.routineId === routineId);

      // Optimistic update + cache save
      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines };
      delete updatedRoutines[routineId];
      setRoutines(updatedRoutines);
      const updatedRoutineNodes = routineNodes.filter(rn => rn.routineId !== routineId);
      setRoutineNodes(updatedRoutineNodes);

      await Promise.all([
        saveRoutinesToCache(updatedRoutines),
        saveRoutineNodesToCache(updatedRoutineNodes),
      ]);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'delete', routineId, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines').delete().eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        // Rollback
        stateVersionRef.current += 1;
        setRoutines(prev => ({ ...prev, [routineId]: routine }));
        setRoutineNodes(prev => [...prev, ...relatedLinks]);
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to delete routine:', err);
        return false;
      }
    },
    [userId, routines, routineNodes, saveRoutinesToCache, saveRoutineNodesToCache, addToPendingQueue]
  );

  // --- Update routine title ---

  const updateRoutineTitle = useCallback(
    async (routineId: string, newTitle: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines, [routineId]: { ...routine, title: newTitle } };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'update', routineId, data: { title: newTitle }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines').update({ title: newTitle }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        stateVersionRef.current += 1;
        setRoutines(prev => ({ ...prev, [routineId]: routine }));
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to update routine title:', err);
        return false;
      }
    },
    [userId, routines, saveRoutinesToCache, addToPendingQueue]
  );

  // --- Update routine color ---

  const updateRoutineColor = useCallback(
    async (routineId: string, newColor: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines, [routineId]: { ...routine, color: newColor } };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'update', routineId, data: { color: newColor }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines').update({ color: newColor }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        stateVersionRef.current += 1;
        setRoutines(prev => ({ ...prev, [routineId]: routine }));
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to update routine color:', err);
        return false;
      }
    },
    [userId, routines, saveRoutinesToCache, addToPendingQueue]
  );

  // --- Update routine active days ---

  const updateRoutineActiveDays = useCallback(
    async (routineId: string, activeDays: number[] | undefined): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines, [routineId]: { ...routine, activeDays } };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'update', routineId, data: { active_days: activeDays || null }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('routines').update({ active_days: activeDays || null }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        stateVersionRef.current += 1;
        setRoutines(prev => ({ ...prev, [routineId]: routine }));
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to update routine active days:', err);
        return false;
      }
    },
    [userId, routines, saveRoutinesToCache, addToPendingQueue]
  );

  // --- Reorder routines in node ---

  const reorderRoutinesInNode = useCallback(
    async (nodeId: string, fromIndex: number, toIndex: number): Promise<boolean> => {
      if (!userId) return false;

      const nodeLinks = routineNodes
        .filter(rn => rn.nodeId === nodeId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      if (fromIndex < 0 || toIndex < 0 || fromIndex >= nodeLinks.length || toIndex >= nodeLinks.length) {
        return false;
      }

      const newLinks = [...nodeLinks];
      const [moved] = newLinks.splice(fromIndex, 1);
      newLinks.splice(toIndex, 0, moved);

      const updatedLinks = newLinks.map((link, index) => ({ ...link, sortOrder: index }));

      // Optimistic update
      setRoutineNodes(prev => {
        const otherLinks = prev.filter(rn => rn.nodeId !== nodeId);
        return [...otherLinks, ...updatedLinks];
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'reorder', nodeId,
          data: { links: updatedLinks.map(l => ({ id: l.id, sortOrder: l.sortOrder })) },
          timestamp: Date.now(),
        });
        return true;
      }

      try {
        const supabase = createClient();
        for (const link of updatedLinks) {
          const { error } = await supabase
            .from('routine_nodes').update({ sort_order: link.sortOrder }).eq('id', link.id);
          if (error) throw error;
        }
        return true;
      } catch (err) {
        // Rollback
        setRoutineNodes(prev => {
          const otherLinks = prev.filter(rn => rn.nodeId !== nodeId);
          return [...otherLinks, ...nodeLinks];
        });
        console.error('Failed to reorder routines:', err);
        return false;
      }
    },
    [userId, routineNodes, addToPendingQueue]
  );

  // --- Stack operations ---

  const stacksList = useMemo(() => Object.values(routineStacks), [routineStacks]);

  const getStacksForNode = useCallback((nodeId: string): RoutineStack[] => {
    return stacksList
      .filter(s => s.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [stacksList]);

  const getRoutinesInStack = useCallback((stackId: string): Routine[] => {
    return routinesList
      .filter(r => r.stackId === stackId)
      .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
  }, [routinesList]);

  const createStack = useCallback(
    async (nodeId: string, title: string): Promise<RoutineStack | null> => {
      if (!boardId || !userId) return null;

      const newStackId = generateId();
      const maxSortOrder = stacksList
        .filter(s => s.nodeId === nodeId)
        .reduce((max, s) => Math.max(max, s.sortOrder), -1);

      const newStack: RoutineStack = {
        id: newStackId, boardId, nodeId, userId, title,
        sortOrder: maxSortOrder + 1, createdAt: new Date().toISOString(),
      };

      stateVersionRef.current += 1;
      const updatedStacks = { ...routineStacks, [newStackId]: newStack };
      setRoutineStacks(updatedStacks);
      await saveStacksToCache(updatedStacks);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const insertData = {
        id: newStackId, board_id: boardId, node_id: nodeId, user_id: userId,
        title, sort_order: newStack.sortOrder, created_at: newStack.createdAt,
      };

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'stack_create', stackId: newStackId, data: { insertData }, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return newStack;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routine_stacks').insert(insertData);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return newStack;
      } catch (err) {
        await addToPendingQueue({ type: 'stack_create', stackId: newStackId, data: { insertData }, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to create stack, queued:', err);
        return newStack;
      }
    },
    [boardId, userId, routineStacks, stacksList, saveStacksToCache, addToPendingQueue]
  );

  const deleteStack = useCallback(
    async (stackId: string): Promise<boolean> => {
      if (!userId) return false;
      const stack = routineStacks[stackId];
      if (!stack) return true;

      // Unassign all routines in this stack
      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines };
      for (const r of Object.values(updatedRoutines)) {
        if (r.stackId === stackId) {
          updatedRoutines[r.id] = { ...r, stackId: null, stackOrder: 0 };
        }
      }
      setRoutines(updatedRoutines);

      const updatedStacks = { ...routineStacks };
      delete updatedStacks[stackId];
      setRoutineStacks(updatedStacks);

      await Promise.all([
        saveRoutinesToCache(updatedRoutines),
        saveStacksToCache(updatedStacks),
      ]);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'stack_delete', stackId, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routine_stacks').delete().eq('id', stackId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({ type: 'stack_delete', stackId, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to delete stack, queued:', err);
        return true;
      }
    },
    [userId, routines, routineStacks, saveRoutinesToCache, saveStacksToCache, addToPendingQueue]
  );

  const updateStackTitle = useCallback(
    async (stackId: string, title: string): Promise<boolean> => {
      if (!userId) return false;
      const stack = routineStacks[stackId];
      if (!stack) return false;

      stateVersionRef.current += 1;
      const updatedStacks = { ...routineStacks, [stackId]: { ...stack, title } };
      setRoutineStacks(updatedStacks);
      await saveStacksToCache(updatedStacks);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'stack_update', stackId, data: { title }, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routine_stacks').update({ title }).eq('id', stackId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({ type: 'stack_update', stackId, data: { title }, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to update stack title, queued:', err);
        return true;
      }
    },
    [userId, routineStacks, saveStacksToCache, addToPendingQueue]
  );

  const addRoutineToStack = useCallback(
    async (routineId: string, stackId: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      const stackRoutines = routinesList.filter(r => r.stackId === stackId);
      const maxOrder = stackRoutines.reduce((max, r) => Math.max(max, r.stackOrder || 0), -1);

      stateVersionRef.current += 1;
      const updatedRoutines = {
        ...routines,
        [routineId]: { ...routine, stackId, stackOrder: maxOrder + 1 },
      };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'stack_assign', routineId, stackId,
          data: { stack_id: stackId, stack_order: maxOrder + 1 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines')
          .update({ stack_id: stackId, stack_order: maxOrder + 1 }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({
          type: 'stack_assign', routineId, stackId,
          data: { stack_id: stackId, stack_order: maxOrder + 1 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to assign routine to stack, queued:', err);
        return true;
      }
    },
    [userId, routines, routinesList, saveRoutinesToCache, addToPendingQueue]
  );

  const removeRoutineFromStack = useCallback(
    async (routineId: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      stateVersionRef.current += 1;
      const updatedRoutines = {
        ...routines,
        [routineId]: { ...routine, stackId: null, stackOrder: 0 },
      };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'stack_remove', routineId,
          data: { stack_id: null, stack_order: 0 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines')
          .update({ stack_id: null, stack_order: 0 }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({
          type: 'stack_remove', routineId,
          data: { stack_id: null, stack_order: 0 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to remove routine from stack, queued:', err);
        return true;
      }
    },
    [userId, routines, saveRoutinesToCache, addToPendingQueue]
  );

  const toggleStackCheck = useCallback(
    (stackId: string, date: string): boolean => {
      if (!userId) return false;

      const stackRoutines = routinesList
        .filter(r => r.stackId === stackId)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0))
        .filter(r => {
          if (!r.activeDays) return true;
          const dayOfWeek = new Date(date).getDay();
          return r.activeDays.includes(dayOfWeek);
        });

      if (stackRoutines.length === 0) return false;

      const allChecked = stackRoutines.every(r => r.history[date]);
      const newChecked = !allChecked;

      // routinesToToggle: 方向が合っていないものだけ（全チェック済みなら解除、それ以外はチェック）
      const routinesToToggle = stackRoutines.filter(r => !!r.history[date] !== newChecked);
      if (routinesToToggle.length === 0) return true;

      // 各ルーティンのnewHistoryを呼び出し時点で確定させておく
      const updates = routinesToToggle.map(r => ({
        id: r.id,
        color: r.color || '#3b82f6',
        newHistory: { ...r.history, [date]: newChecked },
      }));

      updates.forEach(({ id, color, newHistory }, i) => {
        setTimeout(() => {
          // routinesRef.current = 直前のsetRoutinesが反映された最新state
          // これにより呼び出し2が呼び出し1の更新を上書きしない
          stateVersionRef.current += 1;
          const latest = routinesRef.current;
          const routine = latest[id];
          if (!routine) return;

          const updatedRoutines = { ...latest, [id]: { ...routine, history: newHistory } };
          setRoutines(updatedRoutines);
          saveRoutinesToCache(updatedRoutines);

          if (newChecked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (boardId) queueStarColor(boardId, color, isMeteorWinner(id));
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (boardId) dequeueStarColor(boardId, color);
          }

          const syncDB = async () => {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) {
              await addToPendingQueue({ type: 'check', routineId: id, date, newChecked, timestamp: Date.now() });
              return;
            }
            try {
              const supabase = createClient();
              const { error } = await supabase.from('routines').update({ history: newHistory }).eq('id', id);
              if (error) throw error;
            } catch {
              await addToPendingQueue({ type: 'check', routineId: id, date, newChecked, timestamp: Date.now() });
            }
            dataEvents.emit('routines:changed', instanceIdRef.current);
          };
          syncDB();
        }, i * 500);
      });

      return true;
    },
    [userId, routinesList, routinesRef, setRoutines, saveRoutinesToCache, boardId, queueStarColor, dequeueStarColor, isMeteorWinner, addToPendingQueue, stateVersionRef, instanceIdRef]
  );

  const reorderRoutineInStack = useCallback(
    async (stackId: string, fromIndex: number, toIndex: number): Promise<boolean> => {
      if (!userId) return false;

      const stackRoutines = routinesList
        .filter(r => r.stackId === stackId)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));

      if (fromIndex < 0 || toIndex < 0 || fromIndex >= stackRoutines.length || toIndex >= stackRoutines.length) {
        return false;
      }

      const reordered = [...stackRoutines];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines };
      reordered.forEach((r, i) => {
        updatedRoutines[r.id] = { ...updatedRoutines[r.id], stackOrder: i };
      });
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const updates = reordered.map((r, i) => ({ id: r.id, stack_order: i }));

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'stack_update', stackId,
          data: { reorderUpdates: updates }, timestamp: Date.now(),
        });
        return true;
      }

      try {
        const supabase = createClient();
        for (const u of updates) {
          const { error } = await supabase.from('routines').update({ stack_order: u.stack_order }).eq('id', u.id);
          if (error) throw error;
        }
        return true;
      } catch (err) {
        console.error('Failed to reorder routines in stack:', err);
        return false;
      }
    },
    [userId, routines, routinesList, saveRoutinesToCache, addToPendingQueue]
  );

  // --- Unified top-level reorder ---

  const reorderTopLevel = useCallback(
    async (nodeId: string, orderedItems: Array<{ type: 'routine' | 'stack'; id: string }>): Promise<boolean> => {
      if (!userId) return false;

      const routineUpdates: Array<{ linkId: string; sortOrder: number }> = [];
      const stackUpdates: Array<{ stackId: string; sortOrder: number }> = [];

      orderedItems.forEach((item, i) => {
        const order = i * 10;
        if (item.type === 'routine') {
          const link = routineNodes.find(rn => rn.nodeId === nodeId && rn.routineId === item.id);
          if (link) routineUpdates.push({ linkId: link.id, sortOrder: order });
        } else {
          stackUpdates.push({ stackId: item.id, sortOrder: order });
        }
      });

      stateVersionRef.current += 1;
      const newRoutineNodes = routineNodes.map(rn => {
        const update = routineUpdates.find(u => u.linkId === rn.id);
        return update ? { ...rn, sortOrder: update.sortOrder } : rn;
      });
      setRoutineNodes(newRoutineNodes);
      await saveRoutineNodesToCache(newRoutineNodes);

      const newRoutineStacks = { ...routineStacks };
      for (const u of stackUpdates) {
        if (newRoutineStacks[u.stackId]) {
          newRoutineStacks[u.stackId] = { ...newRoutineStacks[u.stackId], sortOrder: u.sortOrder };
        }
      }
      setRoutineStacks(newRoutineStacks);
      await saveStacksToCache(newRoutineStacks);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const pendingData = { nodeId, routineUpdates, stackUpdates };
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'reorder_toplevel', nodeId, data: pendingData, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        for (const u of routineUpdates) {
          const { error } = await supabase.from('routine_nodes').update({ sort_order: u.sortOrder }).eq('id', u.linkId);
          if (error) throw error;
        }
        for (const u of stackUpdates) {
          const { error } = await supabase.from('routine_stacks').update({ sort_order: u.sortOrder }).eq('id', u.stackId);
          if (error) throw error;
        }
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({ type: 'reorder_toplevel', nodeId, data: pendingData, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to reorder top level, queued:', err);
        return true;
      }
    },
    [userId, routineNodes, routineStacks, saveRoutineNodesToCache, saveStacksToCache, addToPendingQueue],
  );

  const moveRoutineToStackAtPosition = useCallback(
    async (routineId: string, stackId: string, position: number): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine) return false;

      const currentStackRoutines = routinesList
        .filter(r => r.stackId === stackId && r.id !== routineId)
        .sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));

      const clampedPos = Math.max(0, Math.min(position, currentStackRoutines.length));
      const newStackRoutines = [...currentStackRoutines];
      newStackRoutines.splice(clampedPos, 0, routine);

      stateVersionRef.current += 1;
      const updatedRoutines = { ...routines };
      newStackRoutines.forEach((r, i) => {
        updatedRoutines[r.id] = { ...updatedRoutines[r.id], stackId, stackOrder: i };
      });
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const stackOrderUpdates = newStackRoutines.map((r, i) => ({ id: r.id, stack_id: stackId, stack_order: i }));
      const pendingData = { routineId, stackId, stackOrderUpdates };

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({ type: 'move_to_stack', routineId, stackId, data: pendingData, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        for (const u of stackOrderUpdates) {
          const { error } = await supabase
            .from('routines').update({ stack_id: u.stack_id, stack_order: u.stack_order }).eq('id', u.id);
          if (error) throw error;
        }
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({ type: 'move_to_stack', routineId, stackId, data: pendingData, timestamp: Date.now() });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        console.error('Failed to move routine to stack, queued:', err);
        return true;
      }
    },
    [userId, routines, routinesList, saveRoutinesToCache, addToPendingQueue],
  );

  const moveRoutineOutOfStack = useCallback(
    async (routineId: string): Promise<boolean> => {
      if (!userId) return false;
      const routine = routines[routineId];
      if (!routine || !routine.stackId) return false;

      stateVersionRef.current += 1;
      const updatedRoutines = {
        ...routines,
        [routineId]: { ...routine, stackId: null as null, stackOrder: 0 },
      };
      setRoutines(updatedRoutines);
      await saveRoutinesToCache(updatedRoutines);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await addToPendingQueue({
          type: 'move_out_of_stack', routineId,
          data: { stack_id: null, stack_order: 0 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.from('routines')
          .update({ stack_id: null, stack_order: 0 }).eq('id', routineId);
        if (error) throw error;
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        await addToPendingQueue({
          type: 'move_out_of_stack', routineId,
          data: { stack_id: null, stack_order: 0 }, timestamp: Date.now(),
        });
        dataEvents.emit('routines:changed', instanceIdRef.current);
        return true;
      }
    },
    [userId, routines, saveRoutinesToCache, addToPendingQueue],
  );

  // --- Helpers ---

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  const isRoutineActiveToday = useCallback(
    (routine: Routine): boolean => {
      if (!routine.activeDays) return true;
      const today = new Date().getDay();
      return routine.activeDays.includes(today);
    },
    []
  );

  const getCompletedCountForDate = useCallback(
    (date: string): number => {
      return routinesList.filter((r) => r.history[date]).length;
    },
    [routinesList]
  );

  const getActiveRoutinesForDate = useCallback(
    (date: string): Routine[] => {
      const dayOfWeek = new Date(date).getDay();
      return routinesList.filter((r) => {
        if (!r.activeDays) return true;
        return r.activeDays.includes(dayOfWeek);
      });
    },
    [routinesList]
  );

  return {
    routines,
    routineNodes,
    routineStacks,
    routinesList,
    stacksList,
    loading,
    isOffline,
    pendingCount,
    getRoutinesForNode,
    getStacksForNode,
    getRoutinesInStack,
    toggleRoutineCheck,
    createRoutine,
    deleteRoutine,
    updateRoutineTitle,
    updateRoutineColor,
    updateRoutineActiveDays,
    reorderRoutinesInNode,
    createStack,
    deleteStack,
    updateStackTitle,
    addRoutineToStack,
    removeRoutineFromStack,
    toggleStackCheck,
    reorderRoutineInStack,
    reorderTopLevel,
    moveRoutineToStackAtPosition,
    moveRoutineOutOfStack,
    getTodayDateString,
    isRoutineActiveToday,
    getCompletedCountForDate,
    getActiveRoutinesForDate,
    isMeteorWinner,
    reload: loadRoutines,
    syncPending: syncPendingActions,
  };
}
