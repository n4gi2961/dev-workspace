import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LucideIcon } from '../ui/LucideIcon';
import {
  getMonthDates,
  getWeekDates,
  getDayLabel,
  getTodayString,
  getPreviousDate,
} from '@vision-board/shared/lib';
import type { Routine, Milestone } from '@vision-board/shared/lib';

// --- Colors (pen design) ---
const C = {
  monthLabel: '#E2E8F0',
  navArrow: '#94A3B8',
  todayBtnBg: '#1E293B',
  todayBtnText: '#E2E8F0',
  weekdayText: '#64748B',
  dateText: '#E2E8F0',
  otherMonthText: '#475569',
  todayHighlight: '#6366F140',
  milestoneStar: '#F59E0B',
  legendTitle: '#94A3B8',
  legendLabel: '#E2E8F0',
  // dataRow colors (from pen)
  starsColor: '#FFD60A',
  streakColor: '#32D74B',
  maxStreakColor: '#f74b4b',
  top3Label: '#bf5af2',
  statLabel: '#8E8E93',
  cardBorder: '#3A3A3A',
} as const;

interface CalendarDataViewProps {
  routines: Routine[];
  milestones: Milestone[];
  locked?: boolean;
}

// Extract YYYY-MM-DD from ISO string or date string
function toDateKey(isoString: string): string {
  if (isoString.length === 10) return isoString;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Streak computation ---

/** Collect all unique dates where ANY routine was checked */
function getAllCheckedDates(routines: Routine[]): Set<string> {
  const set = new Set<string>();
  for (const r of routines) {
    for (const [date, checked] of Object.entries(r.history)) {
      if (checked) set.add(date);
    }
  }
  return set;
}

/** Current streak: consecutive days ending today (or yesterday if today unchecked) */
function computeCurrentStreak(checkedDates: Set<string>): number {
  let date = getTodayString();
  // If today not checked yet, start from yesterday
  if (!checkedDates.has(date)) {
    date = getPreviousDate(date);
  }
  let streak = 0;
  while (checkedDates.has(date)) {
    streak++;
    date = getPreviousDate(date);
  }
  return streak;
}

/** Max streak across all dates */
function computeMaxStreak(checkedDates: Set<string>): number {
  if (checkedDates.size === 0) return 0;
  const sorted = Array.from(checkedDates).sort();
  let max = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    // Check if consecutive day
    const expected = sorted[i];
    const prev = sorted[i - 1];
    const nextDay = new Date(prev);
    nextDay.setDate(nextDay.getDate() + 1);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const d = String(nextDay.getDate()).padStart(2, '0');
    if (`${y}-${m}-${d}` === expected) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }
  return max;
}

/** Per-routine stats */
function computeRoutineStats(routine: Routine): { totalStars: number; maxStreak: number } {
  const checkedDates: string[] = [];
  for (const [date, checked] of Object.entries(routine.history)) {
    if (checked) checkedDates.push(date);
  }
  const totalStars = checkedDates.length;
  if (totalStars === 0) return { totalStars: 0, maxStreak: 0 };

  checkedDates.sort();
  let max = 1;
  let current = 1;
  for (let i = 1; i < checkedDates.length; i++) {
    const nextDay = new Date(checkedDates[i - 1]);
    nextDay.setDate(nextDay.getDate() + 1);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const d = String(nextDay.getDate()).padStart(2, '0');
    if (`${y}-${m}-${d}` === checkedDates[i]) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }
  return { totalStars, maxStreak: max };
}

// --- StatCard (pen: cornerRadius 12, stroke #3A3A3A 1.5, padding [10,4]) ---
function StatCard({
  value,
  label,
  valueColor,
}: {
  value: number | string;
  label: string;
  valueColor: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.cardBorder,
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: valueColor }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '500', color: C.statLabel }}>
        {label}
      </Text>
    </View>
  );
}

// --- SmallStatCard (compact for Top3 rows) ---
function SmallStatCard({
  value,
  label,
  valueColor,
}: {
  value: number;
  label: string;
  valueColor: string;
}) {
  return (
    <View
      style={{
        width: 72,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: C.cardBorder,
        paddingVertical: 8,
        paddingHorizontal: 4,
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: valueColor }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '500', color: C.statLabel }}>
        {label}
      </Text>
    </View>
  );
}

// --- PremiumBadge ---
function PremiumBadge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 20,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: '#F59E0B',
          backgroundColor: '#1C1C1E',
        }}
      >
        <LucideIcon name="lock" size={14} color="#F59E0B" />
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>
          PREMIUM
        </Text>
      </View>
    </View>
  );
}

// --- Top3Row ---
function Top3Row({
  rank,
  name,
  nameColor,
  totalStars,
  maxStreak,
}: {
  rank: number;
  name: string;
  nameColor: string;
  totalStars: number;
  maxStreak: number;
}) {
  const rankColors = ['#FFD60A', '#C0C0C0', '#CD7F32']; // gold, silver, bronze
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {/* Rank badge */}
      <Text style={{ fontSize: 14, fontWeight: '700', color: rankColors[rank] || C.statLabel, width: 16 }}>
        {rank + 1}
      </Text>
      {/* Name (no border, underline) */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: nameColor,
            textDecorationLine: 'underline',
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
      {/* Stats (fixed width, compact) */}
      <SmallStatCard value={totalStars} label="Stars" valueColor={C.starsColor} />
      <SmallStatCard value={maxStreak} label="Streak" valueColor={C.maxStreakColor} />
    </View>
  );
}

// --- DayCell ---
function DayCell({
  dateStr,
  isCurrentMonth,
  isToday,
  dots,
  hasMilestone,
}: {
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  dots: string[];
  hasMilestone: boolean;
}) {
  const dayNum = parseInt(dateStr.split('-')[2], 10);

  return (
    <View
      style={{
        width: '14.285%',
        height: 64,
        alignItems: 'center',
        paddingTop: 4,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: isToday ? C.todayHighlight : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: isCurrentMonth ? C.dateText : C.otherMonthText,
          }}
        >
          {dayNum}
        </Text>
        {hasMilestone && (
          <View style={{ position: 'absolute', top: -1, right: -1 }}>
            <LucideIcon name="star" size={10} color={C.milestoneStar} />
          </View>
        )}
      </View>

      {/* Dots grid: 5 columns × 3 rows max = 15 dots */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: 34,
          height: 20,
          marginTop: 1,
          gap: 1.5,
        }}
      >
        {dots.slice(0, 15).map((color, i) => (
          <View
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// --- Main Component ---
export function CalendarDataView({ routines, milestones, locked = true }: CalendarDataViewProps) {
  const today = getTodayString();
  const todayDate = new Date(today);
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth());

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }, []);

  const calendarDates = useMemo(
    () => getMonthDates(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // Pre-compute dots per date
  const dotsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const entry of calendarDates) {
      const colors: string[] = [];
      for (const r of routines) {
        if (r.history[entry.date] === true) {
          colors.push(r.color);
        }
      }
      if (colors.length > 0) {
        map[entry.date] = colors;
      }
    }
    return map;
  }, [calendarDates, routines]);

  // Pre-compute milestone dates set
  const milestoneDates = useMemo(() => {
    const set = new Set<string>();
    for (const m of milestones) {
      if (m.completed && m.completedAt) {
        const key = toDateKey(m.completedAt);
        if (key) set.add(key);
      }
    }
    return set;
  }, [milestones]);

  // --- dataRow stats ---
  const stats = useMemo(() => {
    const allChecked = getAllCheckedDates(routines);
    // totalStars = total number of routine checks (not unique dates)
    let totalStars = 0;
    for (const r of routines) {
      for (const checked of Object.values(r.history)) {
        if (checked) totalStars++;
      }
    }
    const dayStreak = computeCurrentStreak(allChecked);
    const maxStreak = computeMaxStreak(allChecked);

    // Per-routine stats, sorted by totalStars desc
    const perRoutine = routines
      .map(r => ({ ...computeRoutineStats(r), routine: r }))
      .sort((a, b) => b.totalStars - a.totalStars);

    return { totalStars, dayStreak, maxStreak, perRoutine };
  }, [routines]);

  // --- Weekly streak (any routine/milestone checked per day) ---
  const weekData = useMemo(() => {
    const weekDates = getWeekDates(0);
    const milestoneDateSet = new Set<string>();
    for (const m of milestones) {
      if (m.completed && m.completedAt) {
        const key = toDateKey(m.completedAt);
        if (key) milestoneDateSet.add(key);
      }
    }
    let checkedCount = 0;
    const days = weekDates.map(date => {
      const hasRoutineCheck = routines.some(r => r.history[date] === true);
      const hasMilestoneCheck = milestoneDateSet.has(date);
      const active = hasRoutineCheck || hasMilestoneCheck;
      if (active) checkedCount++;
      return { date, active };
    });
    return { days, checkedCount };
  }, [routines, milestones]);

  const top3 = stats.perRoutine.slice(0, 3);

  return (
    <View style={{ gap: 8 }}>
      {/* Calendar Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          paddingHorizontal: 10,
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={goToPrevMonth} activeOpacity={0.6}>
          <LucideIcon name="chevron-left" size={22} color={C.navArrow} />
        </TouchableOpacity>

        <Text style={{ fontSize: 20, fontWeight: '600', color: C.monthLabel }}>
          {currentYear}年 {currentMonth + 1}月
        </Text>

        <TouchableOpacity
          onPress={goToToday}
          activeOpacity={0.6}
          style={{
            backgroundColor: C.todayBtnBg,
            borderRadius: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 13, color: C.todayBtnText }}>今日</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextMonth} activeOpacity={0.6}>
          <LucideIcon name="chevron-right" size={22} color={C.navArrow} />
        </TouchableOpacity>
      </View>

      {/* Weekday Header */}
      <View style={{ flexDirection: 'row', height: 28 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: C.weekdayText }}>
              {getDayLabel(i)}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {calendarDates.map((entry) => (
          <DayCell
            key={entry.date}
            dateStr={entry.date}
            isCurrentMonth={entry.isCurrentMonth}
            isToday={entry.date === today}
            dots={dotsMap[entry.date] || []}
            hasMilestone={milestoneDates.has(entry.date)}
          />
        ))}
      </View>

      {/* Legend */}
      {(routines.length > 0 || milestones.some(m => m.completed)) && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 13, color: C.legendTitle, marginBottom: 8 }}>
            凡例
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 10 }}>
            {routines.map((r) => (
              <View
                key={r.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: r.color,
                  }}
                />
                <Text style={{ fontSize: 13, color: C.legendLabel }}>
                  {r.title}
                </Text>
              </View>
            ))}
            {milestones.some(m => m.completed) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LucideIcon name="star" size={10} color={C.milestoneStar} />
                <Text style={{ fontSize: 13, color: C.legendLabel }}>
                  マイルストーン達成日
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* === dataRow: Stats Section === */}
      {routines.length > 0 && (
        <View
          style={{
            marginTop: 24,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.cardBorder,
            padding: 16,
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
            Summary
          </Text>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatCard value={stats.totalStars} label="Stars" valueColor={C.starsColor} />
            <StatCard value={stats.dayStreak} label="Day Streak" valueColor={C.streakColor} />
            <StatCard value={stats.maxStreak} label="Max Streak" valueColor={C.maxStreakColor} />
          </View>

          {/* Weekly streak */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>🔥</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.dateText }}>
                  This Week
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: C.statLabel }}>
                {weekData.checkedCount}/7 days
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {weekData.days.map(({ date, active }, i) => (
                <View key={date} style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: active ? '#0A84FF' : 'transparent',
                      borderWidth: active ? 0 : 1.5,
                      borderColor: C.cardBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                  <Text style={{ fontSize: 11, color: active ? C.dateText : C.statLabel }}>
                    {getDayLabel(i)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top 3 section (premium locked) */}
          {top3.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.top3Label }}>
                Top 3
              </Text>
              <View
                style={{
                  height: 1,
                  backgroundColor: C.top3Label,
                  opacity: 0.3,
                  marginBottom: 4,
                }}
              />
              <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                <View style={{ opacity: locked ? 1 : 1 }}>
                  {top3.map(({ routine, totalStars, maxStreak }, i) => (
                    <Top3Row
                      key={routine.id}
                      rank={i}
                      name={routine.title}
                      nameColor={routine.color}
                      totalStars={totalStars}
                      maxStreak={maxStreak}
                    />
                  ))}
                </View>
                {locked && (
                  <>
                    <BlurView
                      intensity={40}
                      tint="dark"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: 12,
                      }}
                    />
                    <PremiumBadge />
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
