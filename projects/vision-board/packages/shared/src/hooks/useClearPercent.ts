'use client';

import { useCallback } from 'react';
import { Routine, FrozenDate } from '../lib/pageMapper';
import { getTodayString, getPreviousDate, getNextDate } from '../lib/utils';

/**
 * クリア度計算に関する定数
 */
const CLEAR_PERCENT_CONFIG = {
  /** 最大ブラー値（px） */
  MAX_BLUR: 20,
  /** 1日の上昇上限（%） */
  DAILY_MAX_INCREASE: 20,
  /** 最初のルーティンで得られる上昇率（%） */
  FIRST_ROUTINE_SHARE: 10,
  /** 残りのルーティンで分配される上昇率（%） */
  REMAINING_SHARE: 10,
  /** 連続未チェック時の下落率（%/日） */
  DAILY_DECREASE: 10,
  /** 下落が発生する連続未チェック日数 */
  DECREASE_THRESHOLD_DAYS: 3,
  /** 計算対象の最大日数 */
  MAX_CALCULATION_DAYS: 30,
  /** ルーティン有効開始の猶予期間（createdAtの何日前から有効とみなすか） */
  GRACE_PERIOD_DAYS: 5,
};

/**
 * 日付文字列からN日前の日付を取得
 */
function getDateNDaysAgo(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 1日のチェック数に応じた上昇率を計算
 * - 1個目: 10%
 * - 残り: 10% / (総数 - 1) ずつ
 */
function calculateDailyIncrease(
  checkedCount: number,
  totalRoutines: number
): number {
  if (checkedCount === 0 || totalRoutines === 0) return 0;

  const { FIRST_ROUTINE_SHARE, REMAINING_SHARE } = CLEAR_PERCENT_CONFIG;

  // ルーティンが1つだけの場合
  if (totalRoutines === 1) {
    return checkedCount === 1 ? FIRST_ROUTINE_SHARE + REMAINING_SHARE : 0;
  }

  // 複数ルーティンの場合
  const remainingSharePerRoutine = REMAINING_SHARE / (totalRoutines - 1);

  if (checkedCount === 1) {
    return FIRST_ROUTINE_SHARE;
  }

  return FIRST_ROUTINE_SHARE + remainingSharePerRoutine * (checkedCount - 1);
}

/**
 * 特定の日のclearPercentを計算
 */
function calculateDailyClearPercent(
  routines: Routine[],
  frozenDates: string[],
  targetDate: string,
  previousValue: number
): number {
  // 凍結日は変動なし
  if (frozenDates.includes(targetDate)) {
    return previousValue;
  }

  // 対象日の曜日を取得（0=日曜〜6=土曜）
  const targetDayIndex = new Date(targetDate).getDay();

  // 対象日時点で有効なルーティンのみ（createdAtの5日前 <= targetDate）
  const { GRACE_PERIOD_DAYS } = CLEAR_PERCENT_CONFIG;
  const activeRoutines = routines.filter((r) => {
    const createdDate = r.createdAt?.split('T')[0] || '1970-01-01';
    const effectiveStartDate = getDateNDaysAgo(createdDate, GRACE_PERIOD_DAYS);
    return effectiveStartDate <= targetDate;
  });

  // ★ その日が実行日のルーティンのみをカウント対象に
  const todayActiveRoutines = activeRoutines.filter((r) =>
    !r.activeDays || r.activeDays.includes(targetDayIndex)
  );

  // 実行日のルーティンがない場合は変動なし
  if (todayActiveRoutines.length === 0) {
    return previousValue;
  }

  // 上昇計算（実行日のルーティンのみでカウント）
  const checkedCount = todayActiveRoutines.filter(
    (r) => r.history[targetDate]
  ).length;
  const increase = calculateDailyIncrease(checkedCount, todayActiveRoutines.length);

  // 下落計算（3日連続未チェックで10%）
  let decrease = 0;
  const yesterday = getPreviousDate(targetDate);
  const dayBefore = getPreviousDate(yesterday);
  const twoDaysBefore = getPreviousDate(dayBefore);

  // 凍結日は下落計算から除外
  const checkDays = [yesterday, dayBefore, twoDaysBefore];
  const hasFrozenDay = checkDays.some((d) => frozenDates.includes(d));

  if (!hasFrozenDay) {
    // ★ 各日について「その日が実行日のルーティンがすべて未チェック」かを確認
    const noCheckAll = checkDays.every((day) => {
      const dayIndex = new Date(day).getDay();
      const dayActiveRoutines = activeRoutines.filter((r) =>
        !r.activeDays || r.activeDays.includes(dayIndex)
      );
      // その日に実行日のルーティンがない場合は「未チェック連続」とはカウントしない
      if (dayActiveRoutines.length === 0) return false;
      return dayActiveRoutines.every((r) => !r.history[day]);
    });

    if (noCheckAll) {
      decrease = CLEAR_PERCENT_CONFIG.DAILY_DECREASE;
    }
  }

  // 最終値を計算（0〜100にクランプ）
  const newValue = previousValue + increase - decrease;
  return Math.max(0, Math.min(100, newValue));
}

/**
 * 履歴全体からclearPercentを再計算
 * 今日から過去30日（または最古のルーティン作成日から）で計算
 */
function recalculateClearPercent(
  routines: Routine[],
  frozenDates: string[]
): number {
  if (routines.length === 0) return 0;

  const { GRACE_PERIOD_DAYS, MAX_CALCULATION_DAYS } = CLEAR_PERCENT_CONFIG;
  const today = getTodayString();

  // 30日前の日付
  const thirtyDaysAgo = getDateNDaysAgo(today, MAX_CALCULATION_DAYS);

  // 最も古いルーティンの有効開始日（作成日の5日前）
  const startDates = routines
    .map((r) => r.createdAt?.split('T')[0])
    .filter(Boolean) as string[];

  if (startDates.length === 0) return 0;

  const earliestCreatedDate = startDates.sort()[0];
  const earliestEffectiveDate = getDateNDaysAgo(earliestCreatedDate, GRACE_PERIOD_DAYS);

  // 計算開始日 = 30日前 または 最古の有効開始日 の遅い方
  const startDate = earliestEffectiveDate > thirtyDaysAgo
    ? earliestEffectiveDate
    : thirtyDaysAgo;

  // 日ごとに計算
  let clearPercent = 0;
  let currentDate = startDate;

  while (currentDate <= today) {
    clearPercent = calculateDailyClearPercent(
      routines,
      frozenDates,
      currentDate,
      clearPercent
    );
    currentDate = getNextDate(currentDate);
  }

  return clearPercent;
}

/**
 * clearPercentからブラー値を計算
 */
function clearPercentToBlur(clearPercent: number): number {
  return CLEAR_PERCENT_CONFIG.MAX_BLUR * (1 - clearPercent / 100);
}

/**
 * クリア度計算のカスタムフック
 */
export function useClearPercent() {
  /**
   * ルーティン履歴からclearPercentを再計算
   */
  const recalculate = useCallback(
    (routines: Routine[], frozenDates: FrozenDate[]): number => {
      const frozenDateStrings = frozenDates.map((f) => f.date);
      return recalculateClearPercent(routines, frozenDateStrings);
    },
    []
  );

  /**
   * clearPercentからブラー値を取得
   */
  const getBlurValue = useCallback((clearPercent: number): number => {
    return clearPercentToBlur(clearPercent);
  }, []);

  /**
   * チェック状態変更後の新しいclearPercentを計算
   * （楽観的更新用）
   */
  const calculateAfterToggle = useCallback(
    (
      currentClearPercent: number,
      routines: Routine[],
      frozenDates: FrozenDate[],
      routineId: string,
      date: string,
      isChecking: boolean
    ): number => {
      // 凍結日は変動なし
      const frozenDateStrings = frozenDates.map((f) => f.date);
      if (frozenDateStrings.includes(date)) {
        return currentClearPercent;
      }

      // 対象日の曜日を取得（0=日曜〜6=土曜）
      const targetDayIndex = new Date(date).getDay();

      // 対象日時点で有効なルーティン（createdAtの5日前から有効）
      const { GRACE_PERIOD_DAYS } = CLEAR_PERCENT_CONFIG;
      const activeRoutines = routines.filter((r) => {
        const createdDate = r.createdAt?.split('T')[0] || '1970-01-01';
        const effectiveStartDate = getDateNDaysAgo(createdDate, GRACE_PERIOD_DAYS);
        return effectiveStartDate <= date;
      });

      // ★ その日が実行日のルーティンのみをカウント対象に
      const todayActiveRoutines = activeRoutines.filter((r) =>
        !r.activeDays || r.activeDays.includes(targetDayIndex)
      );

      if (todayActiveRoutines.length === 0) {
        return currentClearPercent;
      }

      // 現在のチェック数（変更前、実行日のルーティンのみ）
      const currentCheckedCount = todayActiveRoutines.filter(
        (r) => r.history[date]
      ).length;

      // 変更後のチェック数
      const newCheckedCount = isChecking
        ? currentCheckedCount + 1
        : currentCheckedCount - 1;

      // 変更前後の上昇率の差分を計算
      const prevIncrease = calculateDailyIncrease(
        currentCheckedCount,
        todayActiveRoutines.length
      );
      const newIncrease = calculateDailyIncrease(
        newCheckedCount,
        todayActiveRoutines.length
      );
      const diff = newIncrease - prevIncrease;

      // 新しいclearPercentを計算（0〜100にクランプ）
      const newValue = currentClearPercent + diff;
      return Math.max(0, Math.min(100, newValue));
    },
    []
  );

  return {
    recalculate,
    getBlurValue,
    calculateAfterToggle,
    config: CLEAR_PERCENT_CONFIG,
  };
}
