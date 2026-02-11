import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { NavigationProvider, useNavigation } from '../../contexts/navigation';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useBoards } from '../../hooks/useBoards';
import { useI18n } from '../../contexts/i18n';

function MainLayoutContent() {
  const { drawerOpen, setDrawerOpen, selectedBoardId, setSelectedBoardId } = useNavigation();
  const { user } = useAuth();
  const { t } = useI18n();
  const { boards, createBoard, deleteBoard, updateBoardTitle } = useBoards(user?.id ?? null);

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

  const handleDeleteBoard = useCallback(async (boardId: string) => {
    await deleteBoard(boardId);
    if (selectedBoardId === boardId) {
      setSelectedBoardId(null);
    }
  }, [deleteBoard, selectedBoardId, setSelectedBoardId]);

  const handleUpdateBoardTitle = useCallback(async (boardId: string, title: string) => {
    await updateBoardTitle(boardId, title);
  }, [updateBoardTitle]);

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="board/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="subscription" />
        <Stack.Screen
          name="page/[nodeId]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
      </Stack>

      <Sidebar
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boards={boards}
        selectedBoardId={selectedBoardId}
        onBoardSelect={handleBoardSelect}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        onUpdateBoardTitle={handleUpdateBoardTitle}
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
