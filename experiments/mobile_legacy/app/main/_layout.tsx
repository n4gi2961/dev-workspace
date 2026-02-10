import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { NavigationProvider, useNavigation } from '../../contexts/navigation';
import { Sidebar } from '../../components/navigation/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useBoards } from '../../hooks/useBoards';
import { useI18n } from '../../contexts/i18n';

function MainLayoutContent() {
  const { drawerOpen, setDrawerOpen, selectedBoardId, setSelectedBoardId } = useNavigation();
  const { user } = useAuth();
  const { t } = useI18n();
  const { boards, createBoard } = useBoards(user?.id ?? null);

  const handleBoardSelect = useCallback((boardId: string) => {
    setSelectedBoardId(boardId);
    setDrawerOpen(false);
  }, [setSelectedBoardId, setDrawerOpen]);

  const handleCreateBoard = useCallback(async () => {
    const newBoard = await createBoard(t.board.newBoardDefault);
    if (newBoard) {
      setSelectedBoardId(newBoard.id);
      setDrawerOpen(false);
    }
  }, [createBoard, t.board.newBoardDefault, setSelectedBoardId, setDrawerOpen]);

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="board/[id]" />
      </Stack>

      {/* Sidebar Overlay */}
      <Sidebar
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boards={boards}
        selectedBoardId={selectedBoardId}
        onBoardSelect={handleBoardSelect}
        onCreateBoard={handleCreateBoard}
      />
    </View>
  );
}

export default function MainLayout() {
  return (
    <NavigationProvider>
      <MainLayoutContent />
    </NavigationProvider>
  );
}
