import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions, ScrollView, Alert, Platform, ActionSheetIOS, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useI18n } from '../../contexts/i18n';
import { Button } from './Button';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

interface Board {
  id: string;
  title: string;
  updated_at: string;
  color?: string;
  node_count?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  selectedBoardId: string | null;
  onBoardSelect: (boardId: string) => void;
  onCreateBoard: () => void;
  onDeleteBoard?: (boardId: string) => void;
  onUpdateBoardTitle?: (boardId: string, title: string) => void;
  onChangeBoardBackground?: (boardId: string) => void;
}

const BOARD_COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#00a8fc', '#9b59b6', '#1abc9c'];

function BoardAvatar({ color }: { color: string }) {
  return (
    <View
      className="w-[108px] h-[108px] rounded-xl"
      style={{ backgroundColor: color }}
    >
      {/* Thumbnail grid mimicking pen Board/Avatar */}
      <View className="flex-row flex-wrap p-1.5 gap-1.5">
        <View className="w-[45px] h-8 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.09)' }} />
        <View className="w-[45px] h-8 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.09)' }} />
        <View className="w-[45px] h-8 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <View className="w-[45px] h-8 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
      </View>
      <View className="px-1.5 gap-1 mt-1">
        <View className="w-10 h-1 rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View className="w-16 h-1 rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
      </View>
    </View>
  );
}

export function Sidebar({
  isOpen,
  onClose,
  boards,
  selectedBoardId,
  onBoardSelect,
  onCreateBoard,
  onDeleteBoard,
  onUpdateBoardTitle,
  onChangeBoardBackground,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const timingConfig = { duration: 250, easing: Easing.out(Easing.cubic) };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(isOpen ? 0 : -SIDEBAR_WIDTH, timingConfig) }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 1 : 0, timingConfig),
    pointerEvents: isOpen ? 'auto' as const : 'none' as const,
  }));

  const handleBoardPress = (boardId: string) => {
    if (editingBoardId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBoardSelect(boardId);
    onClose();
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateBoard();
    onClose();
  };

  const showDeleteConfirm = (board: Board) => {
    Alert.alert(
      t.sidebar?.deleteConfirmTitle || 'Delete Board',
      t.sidebar?.deleteConfirmMessage || 'Are you sure you want to delete this board? This action cannot be undone.',
      [
        { text: t.sidebar?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.sidebar?.delete || 'Delete',
          style: 'destructive',
          onPress: () => onDeleteBoard?.(board.id),
        },
      ],
    );
  };

  const startEditing = (board: Board) => {
    setEditingBoardId(board.id);
    setEditingTitle(board.title || '');
  };

  const commitEdit = () => {
    if (editingBoardId && editingTitle.trim()) {
      onUpdateBoardTitle?.(editingBoardId, editingTitle.trim());
    }
    setEditingBoardId(null);
    setEditingTitle('');
  };

  const handleLongPress = (board: Board) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const editLabel = t.sidebar?.editName || 'Edit Name';
    const changeBgLabel = t.sidebar?.changeBackground || 'Change Board';
    const deleteLabel = t.sidebar?.delete || 'Delete';
    const cancelLabel = t.sidebar?.cancel || 'Cancel';

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [cancelLabel, editLabel, changeBgLabel, deleteLabel],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) startEditing(board);
          if (buttonIndex === 2) onChangeBoardBackground?.(board.id);
          if (buttonIndex === 3) showDeleteConfirm(board);
        },
      );
    } else {
      // Android: use Alert as a simple menu
      Alert.alert(
        board.title || 'Board',
        undefined,
        [
          { text: cancelLabel, style: 'cancel' },
          { text: editLabel, onPress: () => startEditing(board) },
          { text: changeBgLabel, onPress: () => onChangeBoardBackground?.(board.id) },
          { text: deleteLabel, style: 'destructive', onPress: () => showDeleteConfirm(board) },
        ],
      );
    }
  };

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          },
          overlayStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sidebar Panel */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: SIDEBAR_WIDTH,
            zIndex: 50,
            backgroundColor: '#1F1F1F',
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
          },
          sidebarStyle,
        ]}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6 pb-6"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Text className="text-2xl font-semibold text-white">
            {t.sidebar?.title || 'Boards'}
          </Text>
          <Pressable onPress={onClose} className="active:opacity-70">
            <X size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Board List */}
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ gap: 8 }}>
          {boards.map((board, index) => {
            const color = board.color || BOARD_COLORS[index % BOARD_COLORS.length];
            const isEditing = editingBoardId === board.id;
            return (
              <Pressable
                key={board.id}
                onPress={() => handleBoardPress(board.id)}
                onLongPress={() => handleLongPress(board)}
                delayLongPress={400}
                className="flex-row items-center rounded-xl p-3 gap-3.5"
                style={{
                  backgroundColor: '#2A2A2A',
                  opacity: selectedBoardId === board.id ? 1 : 0.85,
                }}
              >
                <BoardAvatar color={color} />
                <View className="flex-1 gap-1">
                  {isEditing ? (
                    <TextInput
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      onBlur={commitEdit}
                      onSubmitEditing={commitEdit}
                      autoFocus
                      returnKeyType="done"
                      className="text-white font-semibold text-base"
                      style={{
                        padding: 0,
                        margin: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: '#5865f2',
                        paddingBottom: 2,
                      }}
                      placeholderTextColor="#8E8E93"
                      placeholder={t.sidebar?.editBoardPlaceholder || 'Board name'}
                    />
                  ) : (
                    <Text className="text-white font-semibold text-base" numberOfLines={1}>
                      {board.title || t.common?.untitled || 'Untitled'}
                    </Text>
                  )}
                  <Text className="text-xs" style={{ color: '#8E8E93' }}>
                    {board.node_count || 0} images
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Create Board Button */}
        <View className="px-4 py-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <Button
            variant="primary"
            label={t.sidebar?.createBoard || 'Create  New Board'}
            onPress={handleCreatePress}
            icon="plus"
          />
        </View>
      </Animated.View>
    </>
  );
}
