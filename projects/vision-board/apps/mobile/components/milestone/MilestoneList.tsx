import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from '../ui/LucideIcon';
import type { Milestone } from '@vision-board/shared/lib';

interface MilestoneListProps {
  milestones: Milestone[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

// Format completedAt to YYYY/M/D
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
  onUpdateTitle,
}: {
  milestone: Milestone;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(milestone.title);
  const lastTapRef = useRef(0);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setEditText(milestone.title);
      setEditing(true);
    }
    lastTapRef.current = now;
  }, [milestone.title]);

  const handleEditBlur = useCallback(() => {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed === '') {
      onDelete(milestone.id);
    } else if (trimmed !== milestone.title) {
      onUpdateTitle(milestone.id, trimmed);
    }
  }, [editText, milestone.id, milestone.title, onDelete, onUpdateTitle]);

  const handleEditSubmit = useCallback(() => {
    handleEditBlur();
  }, [handleEditBlur]);

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(milestone.id);
  }, [milestone.id, onToggle]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        backgroundColor: '#1E293B80',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      {/* Drag handle (visual only) */}
      <LucideIcon name="grip-vertical" size={16} color="#64748B" />

      {/* Toggle check */}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.6}>
        {milestone.completed ? (
          <LucideIcon name="check-square" size={20} color="#10B981" />
        ) : (
          <LucideIcon name="square" size={20} color="#707070" />
        )}
      </TouchableOpacity>

      {/* Title or inline edit */}
      {editing ? (
        <TextInput
          value={editText}
          onChangeText={setEditText}
          onBlur={handleEditBlur}
          onSubmitEditing={handleEditSubmit}
          autoFocus
          style={{
            flex: 1,
            fontSize: 14,
            color: '#E2E8F0',
            padding: 0,
          }}
        />
      ) : (
        <TouchableOpacity
          onPress={handleDoubleTap}
          activeOpacity={0.8}
          style={{ flex: 1 }}
        >
          <Text
            style={{ fontSize: 14, color: '#E2E8F0' }}
            numberOfLines={1}
          >
            {milestone.title || ' '}
          </Text>
        </TouchableOpacity>
      )}

      {/* Completed date */}
      {milestone.completed && milestone.completedAt && (
        <Text style={{ fontSize: 12, color: '#64748B' }}>
          {formatDate(milestone.completedAt)}
        </Text>
      )}
    </View>
  );
}

function AddRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback(
    (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      const trimmed = e.nativeEvent.text.trim();
      if (trimmed) {
        onAdd(trimmed);
        setText('');
      }
    },
    [onAdd],
  );

  const handlePressAdd = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
  }, [text, onAdd]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        backgroundColor: '#1E293B40',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSubmit}
        placeholder="新しいマイルストーンを追加..."
        placeholderTextColor="#64748B"
        returnKeyType="done"
        style={{
          flex: 1,
          fontSize: 14,
          color: '#E2E8F0',
          padding: 0,
        }}
      />
      <TouchableOpacity onPress={handlePressAdd} activeOpacity={0.6}>
        <LucideIcon name="plus" size={20} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

export function MilestoneList({
  milestones,
  onToggle,
  onAdd,
  onDelete,
  onUpdateTitle,
}: MilestoneListProps) {
  return (
    <View style={{ gap: 12 }}>
      {/* Description */}
      <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>
        目標達成までの中長期的なステップを管理。
      </Text>

      {/* Milestone rows */}
      {milestones.map((m) => (
        <MilestoneRow
          key={m.id}
          milestone={m}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdateTitle={onUpdateTitle}
        />
      ))}

      {/* Add row */}
      <AddRow onAdd={onAdd} />
    </View>
  );
}
