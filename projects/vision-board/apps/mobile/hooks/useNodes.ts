import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@vision-board/supabase';
import {
  type Node,
  type SupabaseNode,
  supabaseToNode,
  nodeToSupabase,
  isR2Url,
  extractR2Key,
} from '@vision-board/shared/lib';
import * as Haptics from 'expo-haptics';
import { r2Storage } from '../services/r2Storage';
import { dataEvents } from '../lib/dataEvents';

// Re-export Node type for consumers
export type { Node };

interface PendingAction {
  type: 'create' | 'update' | 'delete';
  nodeId: string;
  data?: Partial<Node>;
  timestamp: number;
  tempId?: string;
}

const PENDING_QUEUE_KEY = 'nodes_pending_queue';
const cacheKey = (boardId: string) => `nodes_cache_${boardId}`;

async function loadCachedNodes(boardId: string): Promise<Node[] | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey(boardId));
    if (cached) return JSON.parse(cached) as Node[];
  } catch (err) {
    console.error('Failed to load cached nodes:', err);
  }
  return null;
}

async function saveToCache(boardId: string, data: Node[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(boardId), JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache nodes:', err);
  }
}

async function addToPendingQueue(action: PendingAction): Promise<number> {
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

export function useNodes(boardId: string | null, userId: string | null, authToken?: string | null) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const boardIdRef = useRef(boardId);
  const userIdRef = useRef(userId);
  const authTokenRef = useRef(authToken);
  const instanceIdRef = useRef(`nodes_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const nodesRef = useRef<Node[]>([]);
  const stateVersionRef = useRef(0);

  useEffect(() => {
    boardIdRef.current = boardId;
    userIdRef.current = userId;
  }, [boardId, userId]);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  // Keep nodesRef in sync with state for use in CRUD methods
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Sorted nodes by z_index for rendering
  const sortedNodes = [...nodes].sort((a, b) => a.zIndex - b.zIndex);

  // Load nodes from server
  const loadNodes = useCallback(async () => {
    const currentBoardId = boardIdRef.current;
    const currentUserId = userIdRef.current;
    if (!currentBoardId || !currentUserId) {
      setNodes([]);
      setLoading(false);
      return;
    }

    const versionAtStart = stateVersionRef.current;

    // Cache-first for instant UI
    const cached = await loadCachedNodes(currentBoardId);
    if (cached && stateVersionRef.current === versionAtStart) {
      setNodes(cached);
      setLoading(false);
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsOffline(true);
      if (!cached) setLoading(false);
      return;
    }

    setIsOffline(false);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('board_id', currentBoardId)
        .order('z_index', { ascending: true });

      if (error) {
        console.error('Failed to load nodes:', error);
        setLoading(false);
        return;
      }

      const nodesList = (data as SupabaseNode[]).map(supabaseToNode);
      // Only update state if no newer optimistic updates occurred
      if (stateVersionRef.current === versionAtStart) {
        setNodes(nodesList);
        await saveToCache(currentBoardId, nodesList);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync pending actions
  const syncPending = useCallback(async () => {
    const currentBoardId = boardIdRef.current;
    const currentUserId = userIdRef.current;
    if (syncingRef.current || !currentBoardId || !currentUserId) return;
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
          if (action.type === 'create' && action.data) {
            const insertData = nodeToSupabase(action.data, currentBoardId, currentUserId);
            delete insertData.id; // Let Supabase generate
            const { error } = await supabase.from('nodes').insert(insertData);
            if (!error) successfulIndices.push(i);
          } else if (action.type === 'update' && action.nodeId && action.data) {
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (action.data.x !== undefined) updateData.x = action.data.x;
            if (action.data.y !== undefined) updateData.y = action.data.y;
            if (action.data.width !== undefined) updateData.width = action.data.width;
            if (action.data.height !== undefined) updateData.height = action.data.height;
            if (action.data.zIndex !== undefined) updateData.z_index = action.data.zIndex;
            if (action.data.content !== undefined) updateData.content = action.data.content;
            if (action.data.fontSize !== undefined) updateData.font_size = action.data.fontSize;
            if (action.data.color !== undefined) updateData.color = action.data.color;
            if (action.data.cornerRadius !== undefined) updateData.corner_radius = action.data.cornerRadius;
            if (action.data.src !== undefined) updateData.image_url = action.data.src;
            const { error } = await supabase
              .from('nodes')
              .update(updateData)
              .eq('id', action.nodeId);
            if (!error) successfulIndices.push(i);
          } else if (action.type === 'delete' && action.nodeId) {
            const { error } = await supabase
              .from('nodes')
              .delete()
              .eq('id', action.nodeId);
            if (!error) successfulIndices.push(i);
          }
        } catch {
          // Continue with next action
        }
      }

      const remaining = queue.filter((_, index) => !successfulIndices.includes(index));
      await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
      setPendingCount(remaining.length);

      if (successfulIndices.length > 0) {
        await loadNodes();
      }
    } catch (err) {
      console.error('Failed to sync pending actions:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [loadNodes]);

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
      if (!offline && !syncingRef.current) {
        syncPending();
      }
    });
    return () => unsubscribe();
  }, [syncPending]);

  // Subscribe to cross-screen node changes (skip self-emitted events)
  useEffect(() => {
    return dataEvents.on('nodes:changed', (sourceId) => {
      if (sourceId === instanceIdRef.current) return;
      if (boardIdRef.current && userIdRef.current) loadNodes();
    });
  }, [loadNodes]);

  // Initial load
  useEffect(() => {
    if (boardId && userId) {
      loadNodes();
      loadPendingCount();
    } else {
      setNodes([]);
      setLoading(false);
    }
  }, [boardId, userId, loadNodes, loadPendingCount]);

  // Reset selection when board changes
  useEffect(() => {
    setSelectedNodeId(null);
  }, [boardId]);

  // --- CRUD ---

  const addNode = useCallback(
    async (nodeData: Omit<Node, 'id'>): Promise<Node | null> => {
      const currentBoardId = boardIdRef.current;
      const currentUserId = userIdRef.current;
      if (!currentBoardId || !currentUserId) return null;

      const tempId = `temp_${Date.now()}`;
      const newNode: Node = { id: tempId, ...nodeData };

      // Optimistic update
      stateVersionRef.current += 1;
      const optimisticNodes = [...nodesRef.current, newNode];
      setNodes(optimisticNodes);
      await saveToCache(currentBoardId, optimisticNodes);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const count = await addToPendingQueue({
          type: 'create',
          nodeId: tempId,
          data: newNode,
          timestamp: Date.now(),
          tempId,
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return newNode;
      }

      try {
        const supabase = createClient();
        const insertData = nodeToSupabase(newNode, currentBoardId, currentUserId);
        delete insertData.id;
        const { data, error } = await supabase
          .from('nodes')
          .insert(insertData)
          .select('*')
          .single();

        if (error) throw error;

        const realNode = supabaseToNode(data as SupabaseNode);

        // Replace temp node with real one
        stateVersionRef.current += 1;
        const updatedNodes = nodesRef.current.map((n) => (n.id === tempId ? realNode : n));
        setNodes(updatedNodes);
        await saveToCache(currentBoardId, updatedNodes);

        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return realNode;
      } catch (err) {
        const count = await addToPendingQueue({
          type: 'create',
          nodeId: tempId,
          data: newNode,
          timestamp: Date.now(),
          tempId,
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        console.error('Failed to create node, queued for sync:', err);
        return newNode;
      }
    },
    [],
  );

  const updateNode = useCallback(
    async (nodeId: string, updates: Partial<Node>): Promise<void> => {
      const currentBoardId = boardIdRef.current;
      if (!currentBoardId) return;

      // Optimistic update
      stateVersionRef.current += 1;
      const optimisticNodes = nodesRef.current.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n,
      );
      setNodes(optimisticNodes);
      await saveToCache(currentBoardId, optimisticNodes);

      // Temp nodes haven't been persisted yet — queue for sync
      if (nodeId.startsWith('temp_')) {
        const count = await addToPendingQueue({
          type: 'update',
          nodeId,
          data: updates,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const count = await addToPendingQueue({
          type: 'update',
          nodeId,
          data: updates,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return;
      }

      try {
        const supabase = createClient();
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.x !== undefined) updateData.x = updates.x;
        if (updates.y !== undefined) updateData.y = updates.y;
        if (updates.width !== undefined) updateData.width = updates.width;
        if (updates.height !== undefined) updateData.height = updates.height;
        if (updates.zIndex !== undefined) updateData.z_index = updates.zIndex;
        if (updates.content !== undefined) updateData.content = updates.content;
        if (updates.fontSize !== undefined) updateData.font_size = updates.fontSize;
        if (updates.color !== undefined) updateData.color = updates.color;
        if (updates.cornerRadius !== undefined) updateData.corner_radius = updates.cornerRadius;
        if (updates.src !== undefined) updateData.image_url = updates.src;

        const { error } = await supabase
          .from('nodes')
          .update(updateData)
          .eq('id', nodeId);

        if (error) throw error;
        dataEvents.emit('nodes:changed', instanceIdRef.current);
      } catch (err) {
        const count = await addToPendingQueue({
          type: 'update',
          nodeId,
          data: updates,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        console.error('Failed to update node, queued for sync:', err);
      }
    },
    [],
  );

  const deleteNode = useCallback(
    async (nodeId: string): Promise<void> => {
      const currentBoardId = boardIdRef.current;
      if (!currentBoardId) return;

      // Capture node info before removal (for R2 cleanup)
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      const r2Key = targetNode?.type === 'image' && targetNode.src && isR2Url(targetNode.src)
        ? extractR2Key(targetNode.src)
        : null;

      // Deselect if deleting selected node
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));

      // Optimistic update
      stateVersionRef.current += 1;
      const optimisticNodes = nodesRef.current.filter((n) => n.id !== nodeId);
      setNodes(optimisticNodes);
      await saveToCache(currentBoardId, optimisticNodes);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Temp nodes haven't been persisted yet — just remove locally
      if (nodeId.startsWith('temp_')) {
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return;
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const count = await addToPendingQueue({
          type: 'delete',
          nodeId,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('nodes')
          .delete()
          .eq('id', nodeId);

        if (error) throw error;

        // Clean up R2 image (best-effort)
        if (r2Key && authTokenRef.current) {
          r2Storage.deleteImage(r2Key, authTokenRef.current).catch((err) => {
            console.warn('R2 image deletion failed (orphaned):', err);
          });
        }
        dataEvents.emit('nodes:changed', instanceIdRef.current);
      } catch (err) {
        const count = await addToPendingQueue({
          type: 'delete',
          nodeId,
          timestamp: Date.now(),
        });
        setPendingCount(count);
        dataEvents.emit('nodes:changed', instanceIdRef.current);
        console.error('Failed to delete node, queued for sync:', err);
      }
    },
    [],
  );

  // --- Selection ---

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // --- Layer operations ---

  const getMaxZIndex = useCallback((): number => {
    if (nodes.length === 0) return 0;
    return Math.max(...nodes.map((n) => n.zIndex));
  }, [nodes]);

  const bringToFront = useCallback(
    async (nodeId: string) => {
      const maxZ = getMaxZIndex();
      await updateNode(nodeId, { zIndex: maxZ + 1 });
    },
    [getMaxZIndex, updateNode],
  );

  const bringForward = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const above = sortedNodes.find((n) => n.zIndex > node.zIndex);
      if (above) {
        await updateNode(nodeId, { zIndex: above.zIndex });
        await updateNode(above.id, { zIndex: node.zIndex });
      }
    },
    [nodes, sortedNodes, updateNode],
  );

  const sendBackward = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const below = [...sortedNodes].reverse().find((n) => n.zIndex < node.zIndex);
      if (below) {
        await updateNode(nodeId, { zIndex: below.zIndex });
        await updateNode(below.id, { zIndex: node.zIndex });
      }
    },
    [nodes, sortedNodes, updateNode],
  );

  const sendToBack = useCallback(
    async (nodeId: string) => {
      const minZ = nodes.length > 0 ? Math.min(...nodes.map((n) => n.zIndex)) : 0;
      await updateNode(nodeId, { zIndex: minZ - 1 });
    },
    [nodes, updateNode],
  );

  return {
    nodes: sortedNodes,
    loading,
    isOffline,
    pendingCount,
    selectedNodeId,

    // CRUD
    addNode,
    updateNode,
    deleteNode,

    // Selection
    selectNode,

    // Layer operations
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,

    // Sync
    refresh: loadNodes,
    syncPending,
  };
}
