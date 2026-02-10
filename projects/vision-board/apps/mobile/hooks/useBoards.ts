import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@vision-board/supabase';
import * as Haptics from 'expo-haptics';
import { dataEvents } from '../lib/dataEvents';

const CACHE_KEY = 'boards_cache';
const PENDING_QUEUE_KEY = 'boards_pending_queue';

export interface Board {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  node_count?: number;
}

interface PendingAction {
  type: 'create' | 'delete' | 'update_title';
  boardId?: string;
  title?: string;
  timestamp: number;
  tempId?: string;
}

// Helper functions outside of hook to avoid dependency issues
async function loadCachedBoardsHelper(): Promise<Board[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Board[];
    }
  } catch (err) {
    console.error('Failed to load cached boards:', err);
  }
  return null;
}

async function saveToCacheHelper(data: Board[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache boards:', err);
  }
}

async function addToPendingQueueHelper(action: PendingAction): Promise<number> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
    const queue: PendingAction[] = pending ? JSON.parse(pending) : [];
    queue.push(action);
    await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
    return queue.length;
  } catch (err) {
    console.error('Failed to add to pending queue:', err);
    return 0;
  }
}

export function useBoards(userId: string | null) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);
  const userIdRef = useRef(userId);
  const instanceIdRef = useRef(`boards_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const boardsRef = useRef<Board[]>([]);
  const stateVersionRef = useRef(0);

  // Keep userId ref updated
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Keep boardsRef in sync with state for use in CRUD methods
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  // Load boards from server
  const loadBoards = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const versionAtStart = stateVersionRef.current;

    // First, load from cache for instant UI
    const cached = await loadCachedBoardsHelper();
    if (cached && stateVersionRef.current === versionAtStart) {
      setBoards(cached);
      setLoading(false);
    }

    // Check network status
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsOffline(true);
      if (!cached) {
        setLoading(false);
      }
      return;
    }

    setIsOffline(false);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, user_id, created_at, updated_at, nodes(count)')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to load boards:', error);
        setLoading(false);
        return;
      }

      // Map DB "name" to interface "title" and extract node count
      const boardsList = (data || []).map((b: { id: string; name: string; user_id: string; created_at: string; updated_at: string; nodes?: { count: number }[] }) => ({
        id: b.id,
        title: b.name,
        user_id: b.user_id,
        created_at: b.created_at,
        updated_at: b.updated_at,
        node_count: b.nodes?.[0]?.count || 0,
      })) as Board[];
      // Only update state if no newer optimistic updates occurred
      if (stateVersionRef.current === versionAtStart) {
        setBoards(boardsList);
        await saveToCacheHelper(boardsList);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (syncingRef.current || !currentUserId) return;
    syncingRef.current = true;

    try {
      const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      if (!pending) {
        syncingRef.current = false;
        return;
      }

      const queue: PendingAction[] = JSON.parse(pending);
      if (queue.length === 0) {
        syncingRef.current = false;
        return;
      }

      const supabase = createClient();
      const successfulIndices: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        try {
          if (action.type === 'create' && action.title) {
            const { error } = await supabase.from('boards').insert({
              name: action.title,
              user_id: currentUserId,
            });
            if (!error) successfulIndices.push(i);
          } else if (action.type === 'delete' && action.boardId) {
            const { error } = await supabase
              .from('boards')
              .delete()
              .eq('id', action.boardId);
            if (!error) successfulIndices.push(i);
          } else if (action.type === 'update_title' && action.boardId && action.title !== undefined) {
            const { error } = await supabase
              .from('boards')
              .update({ name: action.title, updated_at: new Date().toISOString() })
              .eq('id', action.boardId);
            if (!error) successfulIndices.push(i);
          }
        } catch {
          // Continue with next action
        }
      }

      // Remove successful actions from queue
      const remaining = queue.filter((_, index) => !successfulIndices.includes(index));
      await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
      setPendingCount(remaining.length);

      // Reload boards after sync
      if (successfulIndices.length > 0) {
        await loadBoards();
      }
    } catch (err) {
      console.error('Failed to sync pending actions:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [loadBoards]);

  // Load pending count
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

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);

      // Sync pending actions when coming back online
      if (!offline && !syncingRef.current) {
        syncPendingActions();
      }
    });

    return () => unsubscribe();
  }, [syncPendingActions]);

  // Subscribe to cross-screen board changes (skip self-emitted events)
  useEffect(() => {
    return dataEvents.on('boards:changed', (sourceId) => {
      if (sourceId === instanceIdRef.current) return;
      if (userIdRef.current) loadBoards();
    });
  }, [loadBoards]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadBoards();
      loadPendingCount();
    } else {
      setBoards([]);
      setLoading(false);
    }
  }, [userId, loadBoards, loadPendingCount]);

  const createBoard = useCallback(
    async (name?: string): Promise<Board | null> => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return null;

      const title = name || '新しいボード';
      const tempId = `temp_${Date.now()}`;
      const now = new Date().toISOString();

      // Optimistic update
      const tempBoard: Board = {
        id: tempId,
        title,
        user_id: currentUserId,
        created_at: now,
        updated_at: now,
      };

      stateVersionRef.current += 1;
      const optimisticBoards = [tempBoard, ...boardsRef.current];
      setBoards(optimisticBoards);
      await saveToCacheHelper(optimisticBoards);

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if offline
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const count = await addToPendingQueueHelper({
          type: 'create',
          title,
          timestamp: Date.now(),
          tempId,
        });
        setPendingCount(count);
        dataEvents.emit('boards:changed', instanceIdRef.current);
        return tempBoard;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('boards')
          .insert({
            name: title,
            user_id: currentUserId,
          })
          .select('id, name, user_id, created_at, updated_at')
          .single();

        if (error) throw error;

        // Map DB response to Board interface
        const newBoard: Board = {
          id: data.id,
          title: data.name,
          user_id: data.user_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        // Replace temp board with real one
        stateVersionRef.current += 1;
        const updatedBoards = boardsRef.current.map((b) => (b.id === tempId ? newBoard : b));
        setBoards(updatedBoards);
        await saveToCacheHelper(updatedBoards);

        dataEvents.emit('boards:changed', instanceIdRef.current);
        return newBoard;
      } catch (err) {
        // Queue for later if network error
        const count = await addToPendingQueueHelper({
          type: 'create',
          title,
          timestamp: Date.now(),
          tempId,
        });
        setPendingCount(count);
        dataEvents.emit('boards:changed', instanceIdRef.current);
        console.error('Failed to create board, queued for sync:', err);
        return tempBoard;
      }
    },
    []
  );

  const deleteBoard = useCallback(async (boardId: string): Promise<boolean> => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return false;

    // Optimistic update
    stateVersionRef.current += 1;
    const optimisticBoards = boardsRef.current.filter((b) => b.id !== boardId);
    setBoards(optimisticBoards);
    await saveToCacheHelper(optimisticBoards);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Check if offline
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const count = await addToPendingQueueHelper({
        type: 'delete',
        boardId,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('boards:changed', instanceIdRef.current);
      return true;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('boards').delete().eq('id', boardId);

      if (error) throw error;
      dataEvents.emit('boards:changed', instanceIdRef.current);
      return true;
    } catch (err) {
      // Queue for later if network error
      const count = await addToPendingQueueHelper({
        type: 'delete',
        boardId,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('boards:changed', instanceIdRef.current);
      console.error('Failed to delete board, queued for sync:', err);
      return true;
    }
  }, []);

  const updateBoardTitle = useCallback(
    async (boardId: string, title: string): Promise<boolean> => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return false;

      const now = new Date().toISOString();

      // Optimistic update
      stateVersionRef.current += 1;
      const optimisticBoards = boardsRef.current.map((b) =>
        b.id === boardId ? { ...b, title, updated_at: now } : b
      );
      setBoards(optimisticBoards);
      await saveToCacheHelper(optimisticBoards);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check if offline
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const count = await addToPendingQueueHelper({
          type: 'update_title',
          boardId,
          title,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('boards:changed', instanceIdRef.current);
        return true;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('boards')
          .update({ name: title, updated_at: now })
          .eq('id', boardId);

        if (error) throw error;
        dataEvents.emit('boards:changed', instanceIdRef.current);
        return true;
      } catch (err) {
        // Queue for later if network error
        const count = await addToPendingQueueHelper({
          type: 'update_title',
          boardId,
          title,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('boards:changed', instanceIdRef.current);
        console.error('Failed to update board title, queued for sync:', err);
        return true;
      }
    },
    []
  );

  const getBoard = useCallback(
    (boardId: string): Board | undefined => {
      return boards.find((b) => b.id === boardId);
    },
    [boards]
  );

  return {
    boards,
    loading,
    isOffline,
    pendingCount,
    createBoard,
    deleteBoard,
    updateBoardTitle,
    getBoard,
    refresh: loadBoards,
    syncPending: syncPendingActions,
  };
}
