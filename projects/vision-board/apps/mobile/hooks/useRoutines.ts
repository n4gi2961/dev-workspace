import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@vision-board/supabase';
import type { Routine, RoutineNode } from '@vision-board/shared/lib';
import { generateId, getRandomColor } from '@vision-board/shared';
import * as Haptics from 'expo-haptics';
import { dataEvents } from '../lib/dataEvents';

export type { Routine, RoutineNode } from '@vision-board/shared/lib';

const CACHE_KEY_PREFIX = 'routines_cache_';
const ROUTINE_NODES_CACHE_KEY_PREFIX = 'routine_nodes_cache_';
const PENDING_QUEUE_KEY = 'routines_pending_queue';

// --- Module-level memory cache for instant board switching ---
const routinesMemoryCache = new Map<string, Record<string, Routine>>();
const routineNodesMemoryCache = new Map<string, RoutineNode[]>();

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
    }),
  );
}

interface PendingAction {
  type: 'check' | 'create' | 'delete' | 'update' | 'reorder';
  routineId?: string;
  nodeId?: string;
  date?: string;
  newChecked?: boolean;
  data?: Record<string, unknown>;
  timestamp: number;
}

export function useRoutines(boardId: string | null, userId: string | null) {
  const [routines, setRoutines] = useState<Record<string, Routine>>({});
  const [routineNodes, setRoutineNodes] = useState<RoutineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);
  const instanceIdRef = useRef(`routines_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const stateVersionRef = useRef(0);

  const cacheKey = boardId ? `${CACHE_KEY_PREFIX}${boardId}` : null;
  const routineNodesCacheKey = boardId ? `${ROUTINE_NODES_CACHE_KEY_PREFIX}${boardId}` : null;

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
    if (memRoutines && stateVersionRef.current === versionAtStart) {
      setRoutines(memRoutines);
      setLoading(false);
    }
    if (memNodes && stateVersionRef.current === versionAtStart) {
      setRoutineNodes(memNodes);
    }

    // AsyncStorage cache fallback (only if memory cache missed)
    if (!memRoutines || !memNodes) {
      const [cachedRoutines, cachedNodes] = await Promise.all([
        !memRoutines ? loadCachedRoutines() : null,
        !memNodes ? loadCachedRoutineNodes() : null,
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
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsOffline(true);
      if (!memRoutines) setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const [routinesRes, routineNodesRes] = await Promise.all([
        supabase.from('routines').select('*').eq('board_id', boardId),
        supabase.from('routine_nodes').select('*').eq('user_id', userId),
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
        }) => {
          routinesMap[r.id] = {
            id: r.id, boardId: r.board_id, title: r.title, color: r.color,
            history: r.history || {}, createdAt: r.created_at,
            activeDays: r.active_days || undefined,
          };
        }
      );

      const routineNodesList: RoutineNode[] = (routineNodesRes.data || []).map(
        (rn: { id: string; routine_id: string; node_id: string; sort_order: number }) => ({
          id: rn.id, routineId: rn.routine_id, nodeId: rn.node_id, sortOrder: rn.sort_order,
        })
      );

      // Only update state if no newer optimistic updates occurred
      if (stateVersionRef.current === versionAtStart) {
        setRoutines(routinesMap);
        setRoutineNodes(routineNodesList);
        await Promise.all([
          saveRoutinesToCache(routinesMap),
          saveRoutineNodesToCache(routineNodesList),
        ]);
      }
    } catch (err) {
      console.error('Failed to load routines:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId, userId, loadCachedRoutines, loadCachedRoutineNodes, saveRoutinesToCache, saveRoutineNodesToCache]);

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
      if (cachedR) {
        setRoutines(cachedR);
        setLoading(false);
      } else {
        setRoutines({});
      }
      setRoutineNodes(cachedRN || []);
      loadRoutines();
      loadPendingCount();
    }
  }, [boardId, userId, loadRoutines, loadPendingCount]);

  // --- Derived data ---

  const routinesList = useMemo(() => Object.values(routines), [routines]);

  const getRoutinesForNode = useCallback((nodeId: string): Routine[] => {
    const nodeRoutineIds = routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(rn => rn.routineId);

    return nodeRoutineIds.map(id => routines[id]).filter(Boolean);
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
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    [routines, userId, saveRoutinesToCache, addToPendingQueue]
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
    routinesList,
    loading,
    isOffline,
    pendingCount,
    getRoutinesForNode,
    toggleRoutineCheck,
    createRoutine,
    deleteRoutine,
    updateRoutineTitle,
    updateRoutineColor,
    updateRoutineActiveDays,
    reorderRoutinesInNode,
    getTodayDateString,
    isRoutineActiveToday,
    getCompletedCountForDate,
    getActiveRoutinesForDate,
    reload: loadRoutines,
    syncPending: syncPendingActions,
  };
}
