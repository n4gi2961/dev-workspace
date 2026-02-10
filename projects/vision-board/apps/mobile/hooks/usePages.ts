import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@vision-board/supabase';
import {
  Page,
  SupabasePage,
  pageToSupabase,
  supabaseToPage,
  createInitialPage,
} from '@vision-board/shared/lib';
import { dataEvents } from '../lib/dataEvents';

export type { Page, Block, Milestone, Routine, FrozenDate } from '@vision-board/shared/lib';

const PAGE_CACHE_PREFIX = 'page_cache_';
const MILESTONES_CACHE_PREFIX = 'milestones_cache_';
const PAGES_PENDING_QUEUE_KEY = 'pages_pending_queue';

interface PendingPageAction {
  type: 'save_page' | 'save_milestones';
  nodeId: string;
  /** For save_page: the full Page snapshot at time of save */
  pageSnapshot?: Page;
  /** For save_milestones: the milestones array */
  milestones?: Page['milestones'];
  timestamp: number;
}

// ── Cache helpers (outside hook) ──────────────────────────────

async function loadCachedPage(nodeId: string): Promise<Page | null> {
  try {
    const raw = await AsyncStorage.getItem(PAGE_CACHE_PREFIX + nodeId);
    if (raw) return JSON.parse(raw) as Page;
  } catch (err) {
    console.error('Failed to load cached page:', err);
  }
  return null;
}

async function saveCachedPage(nodeId: string, page: Page): Promise<void> {
  try {
    await AsyncStorage.setItem(PAGE_CACHE_PREFIX + nodeId, JSON.stringify(page));
  } catch (err) {
    console.error('Failed to cache page:', err);
  }
}

async function loadCachedMilestones(nodeId: string): Promise<Page['milestones'] | null> {
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_CACHE_PREFIX + nodeId);
    if (raw) return JSON.parse(raw) as Page['milestones'];
  } catch (err) {
    console.error('Failed to load cached milestones:', err);
  }
  return null;
}

async function saveCachedMilestones(nodeId: string, milestones: Page['milestones']): Promise<void> {
  try {
    await AsyncStorage.setItem(MILESTONES_CACHE_PREFIX + nodeId, JSON.stringify(milestones));
  } catch (err) {
    console.error('Failed to cache milestones:', err);
  }
}

async function addToPendingQueue(action: PendingPageAction): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PAGES_PENDING_QUEUE_KEY);
    const queue: PendingPageAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    await AsyncStorage.setItem(PAGES_PENDING_QUEUE_KEY, JSON.stringify(queue));
    return queue.length;
  } catch (err) {
    console.error('Failed to add to pages pending queue:', err);
    return 0;
  }
}

// ── Hook ──────────────────────────────────────────────────────

export function usePages(userId: string | null) {
  const [pages, setPages] = useState<Record<string, Page>>({});
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const instanceIdRef = useRef(`pages_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const userIdRef = useRef(userId);
  const pagesRef = useRef<Record<string, Page>>({});
  const syncingRef = useRef(false);
  const stateVersionRef = useRef(0);

  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  // Invalidate memory cache when pages change from another screen
  useEffect(() => {
    return dataEvents.on('pages:changed', (sourceId) => {
      if (sourceId === instanceIdRef.current) return;
      // Clear in-memory cache so next getPage re-fetches
      setPages({});
    });
  }, []);

  // ── Load page (cache-first → server) ────────────────────────

  const loadPage = useCallback(async (nodeId: string): Promise<Page | null> => {
    if (!userId) return null;

    const versionAtStart = stateVersionRef.current;

    // Try cache first
    const cached = await loadCachedPage(nodeId);
    const cachedMilestones = await loadCachedMilestones(nodeId);
    if (cached) {
      const page = cachedMilestones ? { ...cached, milestones: cachedMilestones } : cached;
      if (stateVersionRef.current === versionAtStart) {
        return page;
      }
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return cached || createInitialPage();
    }

    try {
      const supabase = createClient();

      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('node_id', nodeId)
        .single();

      if (pageError) {
        if (pageError.code === 'PGRST116') {
          // No page exists yet
          return cached || createInitialPage();
        }
        console.error('Failed to load page:', pageError);
        return cached || createInitialPage();
      }

      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('node_id', nodeId)
        .order('sort_order', { ascending: true });

      const milestones = (milestonesData || []).map((m: {
        id: string;
        title: string;
        completed: boolean;
        completed_at?: string;
      }) => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completed_at || undefined,
      }));

      const page = supabaseToPage(pageData as SupabasePage, milestones, [], []);

      // Cache the server result
      if (stateVersionRef.current === versionAtStart) {
        await Promise.all([
          saveCachedPage(nodeId, page),
          saveCachedMilestones(nodeId, milestones),
        ]);
      }

      return page;
    } catch (err) {
      console.error('Failed to load page:', err);
      return cached || createInitialPage();
    }
  }, [userId]);

  // ── Get page (in-memory → load) ─────────────────────────────

  const getPage = useCallback(async (nodeId: string): Promise<Page> => {
    if (pagesRef.current[nodeId]) {
      return pagesRef.current[nodeId];
    }

    setLoading(true);
    const page = await loadPage(nodeId);
    const result = page || createInitialPage();

    setPages(prev => ({ ...prev, [nodeId]: result }));
    setLoading(false);

    return result;
  }, [loadPage]);

  // ── Save page ────────────────────────────────────────────────

  const savePage = useCallback(async (
    nodeId: string,
    updates: Partial<Page>,
  ): Promise<boolean> => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return false;

    // Build optimistic page
    stateVersionRef.current += 1;
    const optimisticPage: Page = {
      ...createInitialPage(),
      ...pagesRef.current[nodeId],
      ...updates,
      updatedAt: Date.now(),
    };
    const updatedPages = { ...pagesRef.current, [nodeId]: optimisticPage };
    setPages(updatedPages);
    await saveCachedPage(nodeId, optimisticPage);

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const count = await addToPendingQueue({
        type: 'save_page',
        nodeId,
        pageSnapshot: optimisticPage,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('pages:changed', instanceIdRef.current);
      return true;
    }

    try {
      const supabase = createClient();

      const { data: existingPage } = await supabase
        .from('pages')
        .select('id')
        .eq('node_id', nodeId)
        .single();

      const pageData = pageToSupabase(updates, nodeId, currentUserId);

      if (existingPage) {
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', existingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pages')
          .insert(pageData);
        if (error) throw error;
      }

      dataEvents.emit('pages:changed', instanceIdRef.current);
      return true;
    } catch (err) {
      // Queue for later sync
      const count = await addToPendingQueue({
        type: 'save_page',
        nodeId,
        pageSnapshot: optimisticPage,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('pages:changed', instanceIdRef.current);
      console.error('Failed to save page, queued for sync:', err);
      return true;
    }
  }, []);

  // ── Save milestones ──────────────────────────────────────────

  const saveMilestones = useCallback(async (
    nodeId: string,
    milestones: Page['milestones'],
  ): Promise<boolean> => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return false;

    // Optimistic update
    stateVersionRef.current += 1;
    const optimisticPage: Page = {
      ...createInitialPage(),
      ...pagesRef.current[nodeId],
      milestones,
    };
    const updatedPages = { ...pagesRef.current, [nodeId]: optimisticPage };
    setPages(updatedPages);
    await Promise.all([
      saveCachedPage(nodeId, optimisticPage),
      saveCachedMilestones(nodeId, milestones),
    ]);

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const count = await addToPendingQueue({
        type: 'save_milestones',
        nodeId,
        milestones,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('pages:changed', instanceIdRef.current);
      return true;
    }

    try {
      const supabase = createClient();

      await supabase
        .from('milestones')
        .delete()
        .eq('node_id', nodeId);

      if (milestones.length > 0) {
        const milestonesData = milestones.map((m, index) => ({
          id: m.id,
          node_id: nodeId,
          user_id: currentUserId,
          title: m.title,
          completed: m.completed,
          completed_at: m.completedAt
            ? (typeof m.completedAt === 'number'
              ? new Date(m.completedAt).toISOString()
              : m.completedAt)
            : null,
          sort_order: index,
        }));

        const { error } = await supabase
          .from('milestones')
          .insert(milestonesData);
        if (error) throw error;
      }

      dataEvents.emit('pages:changed', instanceIdRef.current);
      return true;
    } catch (err) {
      // Queue for later sync
      const count = await addToPendingQueue({
        type: 'save_milestones',
        nodeId,
        milestones,
        timestamp: Date.now(),
      });
      setPendingCount(count);
      dataEvents.emit('pages:changed', instanceIdRef.current);
      console.error('Failed to save milestones, queued for sync:', err);
      return true;
    }
  }, []);

  // ── Sync pending actions ─────────────────────────────────────

  const syncPendingActions = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (syncingRef.current || !currentUserId) return;
    syncingRef.current = true;

    try {
      const raw = await AsyncStorage.getItem(PAGES_PENDING_QUEUE_KEY);
      if (!raw) { syncingRef.current = false; return; }

      const queue: PendingPageAction[] = JSON.parse(raw);
      if (queue.length === 0) { syncingRef.current = false; return; }

      const supabase = createClient();
      const successfulIndices: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        try {
          if (action.type === 'save_page' && action.pageSnapshot) {
            const { data: existingPage } = await supabase
              .from('pages')
              .select('id')
              .eq('node_id', action.nodeId)
              .single();

            const pageData = pageToSupabase(action.pageSnapshot, action.nodeId, currentUserId);

            if (existingPage) {
              const { error } = await supabase
                .from('pages')
                .update(pageData)
                .eq('id', existingPage.id);
              if (!error) successfulIndices.push(i);
            } else {
              const { error } = await supabase
                .from('pages')
                .insert(pageData);
              if (!error) successfulIndices.push(i);
            }
          } else if (action.type === 'save_milestones' && action.milestones) {
            await supabase
              .from('milestones')
              .delete()
              .eq('node_id', action.nodeId);

            if (action.milestones.length > 0) {
              const milestonesData = action.milestones.map((m, index) => ({
                id: m.id,
                node_id: action.nodeId,
                user_id: currentUserId,
                title: m.title,
                completed: m.completed,
                completed_at: m.completedAt
                  ? (typeof m.completedAt === 'number'
                    ? new Date(m.completedAt).toISOString()
                    : m.completedAt)
                  : null,
                sort_order: index,
              }));

              const { error } = await supabase
                .from('milestones')
                .insert(milestonesData);
              if (!error) successfulIndices.push(i);
            } else {
              successfulIndices.push(i);
            }
          }
        } catch {
          // Continue with next action
        }
      }

      const remaining = queue.filter((_, index) => !successfulIndices.includes(index));
      await AsyncStorage.setItem(PAGES_PENDING_QUEUE_KEY, JSON.stringify(remaining));
      setPendingCount(remaining.length);

      if (successfulIndices.length > 0) {
        // Invalidate in-memory cache so pages are re-fetched from server
        setPages({});
      }
    } catch (err) {
      console.error('Failed to sync pending page actions:', err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // ── Network monitoring ───────────────────────────────────────

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !syncingRef.current) {
        syncPendingActions();
      }
    });
    return () => unsubscribe();
  }, [syncPendingActions]);

  // ── Load pending count on mount ──────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PAGES_PENDING_QUEUE_KEY);
        if (raw) {
          const queue = JSON.parse(raw) as PendingPageAction[];
          setPendingCount(queue.length);
        }
      } catch {
        // Ignore
      }
    })();
  }, []);

  // ── Local-only update (no server, no cache) ──────────────────

  const updatePageLocal = useCallback((nodeId: string, updates: Partial<Page>) => {
    setPages(prev => ({
      ...prev,
      [nodeId]: {
        ...createInitialPage(),
        ...prev[nodeId],
        ...updates,
      },
    }));
  }, []);

  return {
    pages,
    loading,
    pendingCount,
    getPage,
    savePage,
    saveMilestones,
    updatePageLocal,
    syncPending: syncPendingActions,
  };
}
