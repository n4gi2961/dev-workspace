import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createClient } from '@/lib/supabase/client';
import { StarInstance } from '@/components/features/star-stacking/FallingStar';
import { getRandomStarColor } from '@/components/features/star-stacking/starColors';
import { STAR_STACK_CONFIG } from '@/constants/starStack';
import { Page } from '@/lib/pageMapper';

interface ColorCount {
  color: string;
  count: number;
}

interface StarStackData {
  totalStars: number;
  lastSyncedTotal: number;
  colorCounts: ColorCount[];
}

interface UseStarStackProps {
  userId?: string;
  boardId?: string;
  pages: Record<string, Page>;
  pendingStarColors?: string[];
}

interface UseStarStackReturn {
  stars: StarInstance[];
  isLoading: boolean;
  totalStars: number;
  newStarsCount: number;
  showCork: boolean;
  addStar: () => void;
  addBatch: (count?: number) => void;
  resetStars: () => void;
  syncWithSupabase: () => Promise<void>;
}

/**
 * Calculate total completed routines from all pages
 */
function calculateTotalCompletedRoutines(pages: Record<string, Page>): number {
  return Object.values(pages).reduce((count, page) => {
    return (
      count +
      (page.routines || []).reduce((routineCount, routine) => {
        return routineCount + Object.values(routine.history).filter(Boolean).length;
      }, 0)
    );
  }, 0);
}

/**
 * Create a new star instance
 */
function createStarInstance(index: number = 0, colorHex?: string): StarInstance {
  return {
    key: `star-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    position: [
      (Math.random() - 0.5) * STAR_STACK_CONFIG.SPAWN.HORIZONTAL_SPREAD,
      STAR_STACK_CONFIG.SPAWN.HEIGHT_BASE +
        Math.random() * STAR_STACK_CONFIG.SPAWN.HEIGHT_VARIANCE +
        index * 0.1,
      (Math.random() - 0.5) * STAR_STACK_CONFIG.SPAWN.HORIZONTAL_SPREAD,
    ],
    rotation: [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ],
    color: colorHex ? new THREE.Color(colorHex) : getRandomStarColor(),
  };
}

/**
 * Hook for managing star stack state with Supabase synchronization
 */
export function useStarStack({
  userId,
  boardId,
  pages,
  pendingStarColors = [],
}: UseStarStackProps): UseStarStackReturn {
  const supabase = useMemo(() => createClient(), []);
  const [stars, setStars] = useState<StarInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [starStackData, setStarStackData] = useState<StarStackData>({
    totalStars: 0,
    lastSyncedTotal: 0,
    colorCounts: [],
  });
  const [newStarsCount, setNewStarsCount] = useState(0);
  const [showCork, setShowCork] = useState(true);

  // Ref to prevent duplicate sync execution
  const isSyncingRef = useRef(false);

  // Ref to access current stars without adding to dependency array
  const starsRef = useRef<StarInstance[]>([]);

  // Keep starsRef in sync with stars state
  useEffect(() => {
    starsRef.current = stars;
  }, [stars]);

  // Calculate current total completed routines
  const currentTotal = useMemo(
    () => calculateTotalCompletedRoutines(pages),
    [pages]
  );

  /**
   * Sync with Supabase - fetch or create star_stacking record
   */
  const syncWithSupabase = useCallback(async () => {
    // Prevent duplicate execution
    if (isSyncingRef.current) {
      return;
    }

    if (!userId || !boardId) {
      setIsLoading(false);
      return;
    }

    isSyncingRef.current = true;
    setIsLoading(true);

    try {
      // Fetch existing record
      const { data, error } = await supabase
        .from('star_stacking')
        .select('total_stars, last_synced_total, color_counts')
        .eq('user_id', userId)
        .eq('board_id', boardId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error fetching star_stacking:', error);
        return;
      }

      let totalStars = 0;
      let lastSyncedTotal = 0;

      let colorCounts: ColorCount[] = [];

      if (data) {
        totalStars = data.total_stars;
        lastSyncedTotal = data.last_synced_total;
        colorCounts = data.color_counts || [];
      } else {
        // Create new record if not exists
        const { error: insertError } = await supabase
          .from('star_stacking')
          .insert({
            user_id: userId,
            board_id: boardId,
            total_stars: 0,
            last_synced_total: currentTotal,
            color_counts: [],
          });

        if (insertError) {
          console.error('Error creating star_stacking:', insertError);
        }
        lastSyncedTotal = currentTotal;
      }

      // Calculate new stars to add
      // pendingStarColors がある場合はその数を優先（セッション中のチェック分）
      // DB差分と pendingStarColors.length の最小値を使用して整合性を保つ
      const dbDiff = Math.max(0, currentTotal - lastSyncedTotal);
      const newStars = pendingStarColors.length > 0
        ? Math.min(pendingStarColors.length, dbDiff)
        : dbDiff;
      const updatedTotalStars = totalStars + newStars;

      // Calculate updated color counts
      const colorMap = new Map<string, number>(
        colorCounts.map(cc => [cc.color, cc.count])
      );

      // Add new colors from pending
      const colorsToUse = [...pendingStarColors];
      for (const color of colorsToUse.slice(0, newStars)) {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }

      const updatedColorCounts: ColorCount[] = Array.from(colorMap.entries())
        .map(([color, count]) => ({ color, count }));

      // Optimistic update: update local state immediately
      setStarStackData({
        totalStars: updatedTotalStars,
        lastSyncedTotal: currentTotal,
        colorCounts: updatedColorCounts,
      });
      setNewStarsCount(newStars);

      // Create existing stars only if not already present (preserve colors on re-open)
      const yOffset = STAR_STACK_CONFIG.BOTTLE.Y_OFFSET;
      if (starsRef.current.length === 0 && totalStars > 0) {
        const existingStars: StarInstance[] = [];

        // Restore stars with saved colors
        for (const { color, count } of colorCounts) {
          for (let i = 0; i < count; i++) {
            const star = createStarInstance(existingStars.length, color);
            // Position existing stars at the bottom of the bottle
            star.position = [
              (Math.random() - 0.5) * 0.8,
              yOffset + 0.25 + Math.random() * 0.3 + (existingStars.length % 50) * 0.02,
              (Math.random() - 0.5) * 0.8,
            ];
            existingStars.push(star);
          }
        }
        setStars(existingStars);
      }

      // Add falling stars after a short delay
      if (newStars > 0) {
        // Hide cork while stars are spawning
        setShowCork(false);

        const starSpawnDelay = 500; // Initial delay before spawning
        const starInterval = 100; // Interval between each star
        const totalSpawnTime = starSpawnDelay + (newStars - 1) * starInterval;
        const corkShowDelay = totalSpawnTime + 1000; // Show cork 1 second after last star

        // colorsToUse is already defined above (line 186)
        setTimeout(() => {
          for (let i = 0; i < newStars; i++) {
            setTimeout(() => {
              // Use pending star color if available (from local copy)
              const color = colorsToUse[i];
              setStars((prev) => [...prev, createStarInstance(i, color)]);
            }, i * starInterval); // Stagger the falling stars
          }
        }, starSpawnDelay);

        // Show cork after all stars have spawned + 1 second
        setTimeout(() => {
          setShowCork(true);
        }, corkShowDelay);

        // Update Supabase (non-blocking, optimistic update already done)
        supabase
          .from('star_stacking')
          .update({
            total_stars: updatedTotalStars,
            last_synced_total: currentTotal,
            color_counts: updatedColorCounts,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('board_id', boardId)
          .then(({ error: updateError }: { error: Error | null }) => {
            if (updateError) {
              console.error('Error updating star_stacking:', updateError);
            }
          });
      }
    } catch (err) {
      console.error('Error syncing star stack:', err);
    } finally {
      isSyncingRef.current = false;
      setIsLoading(false);
    }
  }, [userId, boardId, currentTotal, supabase, pendingStarColors]);

  /**
   * Add a single star
   */
  const addStar = useCallback(() => {
    if (stars.length >= STAR_STACK_CONFIG.MAX_STARS) return;
    setStars((prev) => [...prev, createStarInstance()]);
  }, [stars.length]);

  /**
   * Add a batch of stars
   */
  const addBatch = useCallback(
    (count: number = STAR_STACK_CONFIG.BATCH_SIZE) => {
      if (stars.length >= STAR_STACK_CONFIG.MAX_STARS) return;

      const batchSize = Math.min(count, STAR_STACK_CONFIG.MAX_STARS - stars.length);
      const newStars: StarInstance[] = [];

      for (let i = 0; i < batchSize; i++) {
        newStars.push(createStarInstance(i));
      }

      setStars((prev) => [...prev, ...newStars]);
    },
    [stars.length]
  );

  /**
   * Reset all stars
   */
  const resetStars = useCallback(() => {
    setStars([]);
  }, []);

  return {
    stars,
    isLoading,
    totalStars: starStackData.totalStars + newStarsCount,
    newStarsCount,
    showCork,
    addStar,
    addBatch,
    resetStars,
    syncWithSupabase,
  };
}
