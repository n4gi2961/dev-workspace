import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { LucideIcon } from '../ui/LucideIcon';
import { ROUTINE_COLORS } from '@vision-board/shared/constants';
import {
  getWeekDates,
  getTodayString,
  getDayLabel,
  isRoutineActiveOnDate,
  getDayOfWeekIndex,
} from '@vision-board/shared/lib';
import type { Routine } from '@vision-board/shared/lib';

// --- Colors (pen design) ---
const C = {
  bg: '#121212',
  rowBg: '#1E293B99',     // #1E293B60 in hex opacity
  addRowBg: '#1E293B66',  // #1E293B40
  headerText: '#94A3B8',
  dateText: '#64748B',
  routineName: '#E2E8F0',
  divider: '#334155',
  unchecked: '#64748B',
  weekLabel: '#6366F1',
  addText: '#595959',
  grip: '#64748B',
  white: '#FFFFFF',
} as const;

// --- Types ---
interface RoutineWeeklyTableProps {
  routines: Routine[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onToggle: (routineId: string, date: string) => void;
  onCreate: (title: string) => void;
  onDelete: (routineId: string) => void;
  onUpdateTitle: (routineId: string, title: string) => void;
  onUpdateColor: (routineId: string, color: string) => void;
  onUpdateActiveDays: (routineId: string, days: number[] | undefined) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

// --- Main Component ---
export function RoutineWeeklyTable({
  routines,
  weekOffset,
  onWeekChange,
  onToggle,
  onCreate,
  onDelete,
  onUpdateTitle,
  onUpdateColor,
  onUpdateActiveDays,
  onReorder,
}: RoutineWeeklyTableProps) {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [isActiveDaysMode, setIsActiveDaysMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const addInputRef = useRef<TextInput>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayString = useMemo(() => getTodayString(), []);

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

  const handleToggleActiveDay = useCallback((routineId: string, dayIndex: number) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const currentDays = routine.activeDays || [0, 1, 2, 3, 4, 5, 6];

    let newDays: number[];
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex);
      if (newDays.length === 0) return; // at least 1 day required
    } else {
      newDays = [...currentDays, dayIndex].sort((a, b) => a - b);
    }

    onUpdateActiveDays(routineId, newDays.length === 7 ? undefined : newDays);
  }, [routines, onUpdateActiveDays]);

  // Day indices for active_days: Mon=1..Sun=0 mapping to JS getDay()
  // getWeekDates returns Mon..Sun, getDayOfWeekIndex returns 0=Sun..6=Sat
  const weekDayIndices = useMemo(() => weekDates.map(d => getDayOfWeekIndex(d)), [weekDates]);

  return (
    <View>
      {/* Week Selector */}
      <WeekSelector
        weekOffset={weekOffset}
        onWeekChange={onWeekChange}
        disabled={isActiveDaysMode}
      />

      {/* Description */}
      <Text style={{ color: C.headerText, fontSize: 12, marginTop: 16, marginBottom: 12 }}>
        日々の習慣を管理。「編集」で曜日設定・並び替え。
      </Text>

      {/* Table */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left fixed column */}
        <View style={{ width: 132 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8, gap: 12,
          }}>
            <Text style={{ color: C.headerText, fontSize: 14, fontWeight: '600' }}>タスク</Text>
            <Pressable onPress={() => setIsActiveDaysMode(!isActiveDaysMode)}>
              <Text style={{
                color: isActiveDaysMode ? C.white : C.headerText,
                fontSize: 14, fontWeight: '600',
              }}>
                {isActiveDaysMode ? '完了' : '編集'}
              </Text>
            </Pressable>
          </View>
          <Divider />

          {/* Routine rows - left */}
          {routines.map((routine, index) => (
            <View key={routine.id}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', height: 56,
                paddingHorizontal: 4, gap: 8,
                backgroundColor: C.rowBg,
                borderTopLeftRadius: index === 0 ? 6 : 0,
                borderBottomLeftRadius: index === routines.length - 1 ? 6 : 0,
              }}>
                {/* Drag handle (edit mode only) */}
                {isActiveDaysMode && (
                  <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <LucideIcon name="grip-vertical" size={14} color={C.grip} />
                  </View>
                )}
                {!isActiveDaysMode && <View style={{ width: 4 }} />}

                {/* Color dot */}
                <Pressable onPress={() => setColorPickerId(routine.id)}>
                  <View style={{
                    width: 15, height: 15, borderRadius: 8,
                    backgroundColor: routine.color,
                  }} />
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
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => {
                      setEditingId(routine.id);
                      setEditingTitle(routine.title);
                    }}
                  >
                    <Text
                      style={{ color: C.routineName, fontSize: 14, fontWeight: '500' }}
                      numberOfLines={1}
                    >
                      {routine.title}
                    </Text>
                  </Pressable>
                )}
              </View>
              {index < routines.length - 1 && <Divider />}
            </View>
          ))}

          {routines.length > 0 && <Divider />}

          {/* Add row - left */}
          <Pressable
            onPress={() => { setAddMode(true); setTimeout(() => addInputRef.current?.focus(), 100); }}
            style={{
              flexDirection: 'row', alignItems: 'center', height: 48,
              paddingHorizontal: 8, gap: 6,
              backgroundColor: C.addRowBg,
              borderBottomLeftRadius: 6,
            }}
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
        </View>

        {/* Right scrollable columns — wrapped in View to avoid flex:1 on ScrollView in row layout */}
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            <View>
              {/* Header row */}
              <View style={{ flexDirection: 'row', height: 48 }}>
                {weekDates.map((date, i) => {
                  const isToday = date === todayString;
                  return (
                    <View
                      key={date}
                      style={{
                        width: 52, alignItems: 'center', justifyContent: 'center', gap: 2,
                        backgroundColor: isToday ? '#6366F120' : 'transparent',
                      }}
                    >
                      <Text style={{
                        color: isToday ? '#A78BFA' : C.headerText,
                        fontSize: 12, fontWeight: '500',
                      }}>
                        {getDayLabel(i)}
                      </Text>
                      {!isActiveDaysMode && (
                        <Text style={{
                          color: isToday ? '#A78BFA' : C.dateText,
                          fontSize: 12, fontWeight: 'normal',
                        }}>
                          {date.slice(8)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <Divider />

              {/* Routine rows - right (checks) */}
              {routines.map((routine, rowIndex) => (
                <View key={routine.id}>
                  <View style={{ flexDirection: 'row', height: 56 }}>
                    {weekDates.map((date, colIndex) => {
                      const isToday = date === todayString;
                      const isFuture = date > todayString;
                      const isChecked = routine.history?.[date] || false;
                      const isActive = isRoutineActiveOnDate(routine, date);

                      if (isActiveDaysMode) {
                        // Active days toggle mode
                        const dayIdx = weekDayIndices[colIndex];
                        const isOn = routine.activeDays
                          ? routine.activeDays.includes(dayIdx)
                          : true; // undefined = all active

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
                              {isOn && (
                                <View style={{
                                  width: 8, height: 8, borderRadius: 4,
                                  backgroundColor: C.white,
                                }} />
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      // Normal check mode
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
                              {isChecked && (
                                <LucideIcon name="check" size={22} color={C.white} />
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {rowIndex < routines.length - 1 && <Divider />}
                </View>
              ))}

              {routines.length > 0 && <Divider />}

              {/* Add row spacer (right side) */}
              <View style={{ height: 48 }} />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Color Picker Modal */}
      {colorPickerId && (
        <ColorPickerModal
          currentColor={routines.find(r => r.id === colorPickerId)?.color || '#8B5CF6'}
          onSelectColor={(color) => {
            onUpdateColor(colorPickerId, color);
            setColorPickerId(null);
          }}
          onClose={() => setColorPickerId(null)}
        />
      )}
    </View>
  );
}

// --- WeekSelector ---
function WeekSelector({
  weekOffset,
  onWeekChange,
  disabled,
}: {
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  disabled: boolean;
}) {
  if (disabled) return null;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40,
    }}>
      <Pressable
        onPress={() => onWeekChange(weekOffset - 1)}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      >
        <LucideIcon name="chevron-left" size={20} color={C.dateText} />
      </Pressable>

      <Pressable
        onPress={() => onWeekChange(0)}
        style={({ pressed }) => ({
          paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6,
          backgroundColor: weekOffset === 0 ? C.weekLabel : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{
          color: weekOffset === 0 ? C.white : C.headerText,
          fontSize: 14, fontWeight: '600',
        }}>
          今週
        </Text>
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

// --- Divider ---
function Divider() {
  return <View style={{ height: 1, backgroundColor: C.divider }} />;
}

// --- Color Picker Modal ---
function ColorPickerModal({
  currentColor,
  onSelectColor,
  onClose,
}: {
  currentColor: string;
  onSelectColor: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade">
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20,
            width: 200,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text style={{ color: C.white, fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
            色を選択
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {ROUTINE_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => onSelectColor(color)}
                activeOpacity={0.7}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: color,
                  borderWidth: color === currentColor ? 3 : 0,
                  borderColor: C.white,
                  margin: 6,
                }}
              />
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
