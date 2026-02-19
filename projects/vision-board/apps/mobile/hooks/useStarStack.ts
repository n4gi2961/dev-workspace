import { useState, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@vision-board/supabase';
import { STAR_STACK_CONFIG } from '@vision-board/shared/constants';
import { SimplePhysics } from '../components/star-stack/SimplePhysics';
import { getRandomStarColorHex } from '../components/star-stack/starColors';

interface PendingStar {
  color: string;
  meteor: boolean;
}

interface ColorCount {
  color: string;
  count: number;
  meteorCount?: number;
}

interface StarStackData {
  totalStars: number;
  lastSyncedTotal: number;
  colorCounts: ColorCount[];
}

interface Routine {
  id: string;
  history?: Record<string, boolean>;
  color?: string;
}

interface UseStarStackProps {
  userId?: string;
  boardId?: string;
  routines: Record<string, Routine>;
}

interface UseStarStackReturn {
  physicsRef: React.MutableRefObject<SimplePhysics>;
  colors: string[];
  meteorFlags: boolean[];
  isLoading: boolean;
  totalStars: number;
  newStarsCount: number;
  showCork: boolean;
}

const CACHE_PREFIX = 'star_stack_cache_';
const PENDING_COLORS_PREFIX = 'star_pending_colors_';
const CONFIG = STAR_STACK_CONFIG;

// セッション中に一度アニメーション済みのボードを記録（アプリ再起動でリセット）
const animatedSessionBoards = new Set<string>();

function cacheKey(boardId: string) {
  return `${CACHE_PREFIX}${boardId}`;
}

/**
 * 全ルーティンの完了回数合計を計算
 */
function calculateTotalCompletedRoutines(routines: Record<string, Routine>): number {
  return Object.values(routines).reduce((count, routine) => {
    return count + Object.values(routine.history || {}).filter(Boolean).length;
  }, 0);
}

/**
 * pendingStarColorsをAsyncStorageから読み取って消費
 * 後方互換: string[] → PendingStar[] 変換
 */
async function consumePendingColors(boardId: string): Promise<PendingStar[]> {
  const key = `${PENDING_COLORS_PREFIX}${boardId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      await AsyncStorage.removeItem(key);
      const parsed = JSON.parse(raw);
      // 後方互換: 旧形式(string[])→新形式(PendingStar[])
      return (parsed as unknown[]).map((item) => {
        if (typeof item === 'string') return { color: item, meteor: false };
        return item as PendingStar;
      });
    }
  } catch {}
  return [];
}

export function useStarStack({ userId, boardId, routines }: UseStarStackProps): UseStarStackReturn {
  const supabase = useMemo(() => createClient(), []);
  const physicsRef = useRef(new SimplePhysics());
  const [colors, setColors] = useState<string[]>([]);
  const [meteorFlags, setMeteorFlags] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);
  const [newStarsCount, setNewStarsCount] = useState(0);
  const [showCork, setShowCork] = useState(true);

  // 一度だけ同期するためのフラグ
  const hasSyncedRef = useRef(false);
  // routinesの最新値をrefで参照（useEffect deps変更を避ける）
  const routinesRef = useRef(routines);
  routinesRef.current = routines;

  useEffect(() => {
    if (!userId || !boardId || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const doSync = async () => {
      try {
        // 1. pendingColorsを消費
        const pendingStars = await consumePendingColors(boardId);

        // 2. AsyncStorageキャッシュから先にロード
        let cachedData: StarStackData | null = null;
        try {
          const raw = await AsyncStorage.getItem(cacheKey(boardId));
          if (raw) cachedData = JSON.parse(raw);
        } catch {}

        // 3. Supabaseからfetch
        const { data, error } = await supabase
          .from('star_stacking')
          .select('total_stars, last_synced_total, color_counts')
          .eq('user_id', userId)
          .eq('board_id', boardId)
          .single();

        // routinesの最新値から完了数を計算
        const currentTotal = calculateTotalCompletedRoutines(routinesRef.current);

        let existingTotalStars = 0;
        let lastSyncedTotal = 0;
        let colorCounts: ColorCount[] = [];
        let isNewRecord = false;

        if (data && !error) {
          existingTotalStars = data.total_stars;
          lastSyncedTotal = data.last_synced_total;
          colorCounts = data.color_counts || [];
        } else if (error && error.code === 'PGRST116') {
          // レコード未存在
          isNewRecord = true;
          lastSyncedTotal = currentTotal;
        } else if (cachedData) {
          existingTotalStars = cachedData.totalStars;
          lastSyncedTotal = cachedData.lastSyncedTotal;
          colorCounts = cachedData.colorCounts;
        }

        // 4. 新しい星の数を計算
        // dbDiff = ルーティン完了数の純増分（ON→OFF→ONは純増0）
        // 初回レコード: pendingが唯一のソース（まだlastSyncedTotalの基準がない）
        // 既存レコード: dbDiffが権威（check/uncheck cycle で二重カウントしない）
        const dbDiff = Math.max(0, currentTotal - lastSyncedTotal);
        const newStars = isNewRecord ? pendingStars.length : dbDiff;
        const updatedTotalStars = existingTotalStars + newStars;

        // 5. 色カウント更新 (meteorCount含む)
        const colorMap = new Map<string, { count: number; meteorCount: number }>(
          colorCounts.map(cc => [cc.color, { count: cc.count, meteorCount: cc.meteorCount || 0 }])
        );
        const colorsToUse: string[] = [];
        const newMeteorFlags: boolean[] = [];
        for (let i = 0; i < newStars; i++) {
          const pending = pendingStars[i];
          const color = pending?.color || getRandomStarColorHex();
          const isMeteor = pending?.meteor || false;
          colorsToUse.push(color);
          newMeteorFlags.push(isMeteor);
          const entry = colorMap.get(color) || { count: 0, meteorCount: 0 };
          entry.count += 1;
          if (isMeteor) entry.meteorCount += 1;
          colorMap.set(color, entry);
        }
        const updatedColorCounts: ColorCount[] = Array.from(colorMap.entries())
          .map(([color, { count, meteorCount }]) => ({
            color,
            count,
            ...(meteorCount > 0 ? { meteorCount } : {}),
          }));

        // 6. ステート更新
        setTotalStars(updatedTotalStars);
        setNewStarsCount(newStars);

        // AsyncStorageキャッシュ保存
        const updatedData: StarStackData = {
          totalStars: updatedTotalStars,
          lastSyncedTotal: currentTotal,
          colorCounts: updatedColorCounts,
        };
        try {
          await AsyncStorage.setItem(cacheKey(boardId), JSON.stringify(updatedData));
        } catch {}

        // 7. 既存星の復元
        const physics = physicsRef.current;
        physics.reset();
        const restoredColors: string[] = [];
        const restoredMeteorFlags: boolean[] = [];

        const yOffset = CONFIG.BOTTLE.Y_OFFSET; // -1.25
        const bottomCurve = CONFIG.BOTTLE_PROFILE.BOTTOM_CURVE; // 0.15
        const maxR = (CONFIG.BOTTLE_PROFILE.BODY_RADIUS - 0.1) * 0.7;
        const isFirstOpen = !animatedSessionBoards.has(boardId);

        if (existingTotalStars > 0 && !isFirstOpen) {
          // 2回目以降: オフスクリーン物理で瞬時復元
          for (const cc of colorCounts) {
            const mc = cc.meteorCount || 0;
            for (let i = 0; i < cc.count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const r = Math.sqrt(Math.random()) * maxR;
              const layer = Math.floor(restoredColors.length / 10);
              physics.addStar(
                r * Math.cos(angle),
                yOffset + bottomCurve + 0.3 + layer * 0.15 + Math.random() * 0.05,
                r * Math.sin(angle),
              );
              restoredColors.push(cc.color);
              restoredMeteorFlags.push(i < mc);
            }
          }
          physics.warmup(300);
          physics.settleAll();
          setColors(restoredColors);
          setMeteorFlags(restoredMeteorFlags);
        }

        // 復元色リストを作成（初回アニメ用）
        const restoreColorList: string[] = [];
        const restoreMeteorList: boolean[] = [];
        if (existingTotalStars > 0 && isFirstOpen) {
          for (const cc of colorCounts) {
            const mc = cc.meteorCount || 0;
            for (let i = 0; i < cc.count; i++) {
              restoreColorList.push(cc.color);
              restoreMeteorList.push(i < mc);
            }
          }
        }

        // 8. スポーンアニメーション（復元 + 新規星）
        const hasRestoreAnim = restoreColorList.length > 0;
        const hasNewStars = newStars > 0;

        if (hasRestoreAnim || hasNewStars) {
          setShowCork(false);

          // --- 復元星のバッチスポーンアニメーション（初回のみ） ---
          const restoreBatchSize = 10;
          const restoreBatchInterval = 50;
          const restoreBatches = Math.ceil(restoreColorList.length / restoreBatchSize);
          const restoreTotalTime = hasRestoreAnim
            ? 300 + restoreBatches * restoreBatchInterval
            : 0;

          if (hasRestoreAnim) {
            const spawnY = yOffset + 1.6;

            setTimeout(() => {
              for (let batch = 0; batch < restoreBatches; batch++) {
                setTimeout(() => {
                  const start = batch * restoreBatchSize;
                  const end = Math.min(start + restoreBatchSize, restoreColorList.length);
                  const batchColors: string[] = [];
                  const batchMeteors: boolean[] = [];

                  for (let i = start; i < end; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(Math.random()) * maxR * 0.5;
                    physics.addStar(
                      r * Math.cos(angle),
                      spawnY + Math.random() * 0.3,
                      r * Math.sin(angle),
                    );
                    batchColors.push(restoreColorList[i]);
                    batchMeteors.push(restoreMeteorList[i]);
                  }
                  setColors(prev => [...prev, ...batchColors]);
                  setMeteorFlags(prev => [...prev, ...batchMeteors]);
                }, batch * restoreBatchInterval);
              }
            }, 300);

            animatedSessionBoards.add(boardId);
          }

          // --- 新しい星のスポーン ---
          if (hasNewStars) {
            const newStarDelay = restoreTotalTime + 800;
            const starInterval = 100;

            setTimeout(() => {
              for (let i = 0; i < newStars; i++) {
                setTimeout(() => {
                  const color = colorsToUse[i] || getRandomStarColorHex();
                  const spread = CONFIG.SPAWN.HORIZONTAL_SPREAD;
                  physics.addStar(
                    (Math.random() - 0.5) * spread,
                    CONFIG.SPAWN.HEIGHT_BASE + Math.random() * CONFIG.SPAWN.HEIGHT_VARIANCE - yOffset,
                    (Math.random() - 0.5) * spread,
                  );
                  setColors(prev => [...prev, color]);
                  setMeteorFlags(prev => [...prev, newMeteorFlags[i] || false]);
                }, i * starInterval);
              }
            }, newStarDelay);

            // コルク再表示
            const corkDelay = newStarDelay + (newStars - 1) * starInterval + 1500;
            setTimeout(() => setShowCork(true), corkDelay);
          } else if (hasRestoreAnim) {
            setTimeout(() => setShowCork(true), restoreTotalTime + 2000);
          }
        } else if (!hasRestoreAnim && restoredColors.length > 0) {
          // 2回目以降の瞬時復元（コルク表示済み）
        }

        // 9. DB更新
        if (isNewRecord) {
          await supabase
            .from('star_stacking')
            .insert({
              user_id: userId,
              board_id: boardId,
              total_stars: updatedTotalStars,
              last_synced_total: currentTotal,
              color_counts: updatedColorCounts,
            });
        } else if (newStars > 0) {
          await supabase
            .from('star_stacking')
            .update({
              total_stars: updatedTotalStars,
              last_synced_total: currentTotal,
              color_counts: updatedColorCounts,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('board_id', boardId);
        }
      } catch (err) {
        console.error('Error syncing star stack:', err);
      } finally {
        setIsLoading(false);
      }
    };

    doSync();
  }, [userId, boardId, supabase]);

  return {
    physicsRef,
    colors,
    meteorFlags,
    isLoading,
    totalStars,
    newStarsCount,
    showCork,
  };
}

/**
 * ルーティンチェック時にAsyncStorageに色をキューイング
 * useRoutines.tsから呼び出す
 */
export async function queueStarColor(boardId: string, color: string, meteor: boolean = false): Promise<void> {
  const key = `${PENDING_COLORS_PREFIX}${boardId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const arr: PendingStar[] = raw ? JSON.parse(raw) : [];
    arr.push({ color, meteor });
    await AsyncStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

/**
 * ルーティンチェック解除時にキューから対応する星を1つ取り除く
 * チェックON→OFF→ONで二重カウントされるのを防止
 */
export async function dequeueStarColor(boardId: string, color: string): Promise<void> {
  const key = `${PENDING_COLORS_PREFIX}${boardId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const arr: PendingStar[] = JSON.parse(raw);
    // 同じ色の最後のエントリを1つだけ削除（後方から検索）
    const idx = arr.findLastIndex(s => s.color === color);
    if (idx >= 0) {
      arr.splice(idx, 1);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {}
}
