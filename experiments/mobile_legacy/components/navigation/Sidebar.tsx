import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { X, Plus } from 'lucide-react-native';
import { useColorScheme } from '../../contexts/theme';
import { useI18n } from '../../contexts/i18n';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 320);

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
  loading?: boolean;
}

export function Sidebar({
  isOpen,
  onClose,
  boards,
  selectedBoardId,
  onBoardSelect,
  onCreateBoard,
  loading = false,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  // Animated styles for sidebar
  const sidebarStyle = useAnimatedStyle(() => {
    const translateX = withSpring(isOpen ? 0 : -SIDEBAR_WIDTH, {
      damping: 20,
      stiffness: 200,
    });
    return {
      transform: [{ translateX }],
    };
  });

  // Animated styles for overlay
  const overlayStyle = useAnimatedStyle(() => {
    const opacity = withSpring(isOpen ? 1 : 0, {
      damping: 20,
      stiffness: 200,
    });
    return {
      opacity,
      pointerEvents: isOpen ? 'auto' : 'none',
    };
  });

  const handleBoardPress = (boardId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBoardSelect(boardId);
    onClose();
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateBoard();
    onClose();
  };

  const renderBoardItem = ({ item, index }: { item: Board; index: number }) => {
    const isSelected = item.id === selectedBoardId;
    const displayNumber = String(index + 1).padStart(2, '0');
    const colors = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#00a8fc', '#9b59b6', '#1abc9c'];
    const color = item.color || colors[index % colors.length];

    return (
      <Pressable
        onPress={() => handleBoardPress(item.id)}
        className={`flex-row items-center px-4 py-3 ${
          isSelected
            ? isDark
              ? 'bg-gray-700'
              : 'bg-blue-50'
            : ''
        }`}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Text className="text-white font-semibold text-lg">{displayNumber}</Text>
        </View>
        <View className="flex-1 ml-4">
          <Text
            className={`font-medium text-base ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}
            numberOfLines={1}
          >
            {item.title || t.common?.untitled || 'Untitled'}
          </Text>
          <Text
            className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {item.node_count || 0} {t.sidebar?.memos || 'memos'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          },
          overlayStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            zIndex: 50,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
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
          className={`flex-row items-center justify-between px-4 pb-4 border-b ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text
            className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t.sidebar?.title || 'Boards'}
          </Text>
          <Pressable
            onPress={onClose}
            className={`p-2 -mr-2 rounded-full ${
              isDark ? 'active:bg-gray-700' : 'active:bg-gray-200'
            }`}
          >
            <X size={24} color={isDark ? '#D1D5DB' : '#374151'} />
          </Pressable>
        </View>

        {/* Board List */}
        <View className="flex-1">
          <FlashList
            data={boards}
            renderItem={renderBoardItem}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </View>

        {/* Create Board Button */}
        <View
          className={`px-4 pt-4 border-t ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Pressable
            onPress={handleCreatePress}
            className="bg-blue-500 active:bg-blue-600 py-3 rounded-xl flex-row items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2">
              {t.sidebar?.createBoard || 'New Board'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}
