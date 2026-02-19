import React, { useCallback, useEffect } from 'react';
import { View, InteractionManager } from 'react-native';
import { Stack, router } from 'expo-router';
import { NavigationProvider, useNavigation } from '../../contexts/navigation';
import { TimerProvider } from '../../contexts/timer';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { useBoards } from '../../hooks/useBoards';
import { preloadBoardNodes } from '../../hooks/useNodes';
import { preloadBoardRoutines } from '../../hooks/useRoutines';
import { preloadBoardViewports } from '../../components/canvas/BoardCanvas';
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

  const handleChangeBoardBackground = useCallback((boardId: string) => {
    setDrawerOpen(false);
    router.push(`/(main)/board-background/${boardId}`);
  }, [setDrawerOpen]);

  // Preload other boards' data after current board renders (background, lower priority)
  useEffect(() => {
    if (boards.length > 0 && selectedBoardId) {
      const task = InteractionManager.runAfterInteractions(() => {
        const otherIds = boards.map((b) => b.id).filter((id) => id !== selectedBoardId);
        if (otherIds.length === 0) return;
        preloadBoardNodes(otherIds);
        preloadBoardRoutines(otherIds);
        preloadBoardViewports(otherIds);
      });
      return () => task.cancel();
    }
  }, [boards, selectedBoardId]);

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
        <Stack.Screen
          name="board-background/[boardId]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="star-stack/[boardId]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
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
        onChangeBoardBackground={handleChangeBoardBackground}
      />
    </View>
  );
}

export default function MainLayout() {
  return (
    <NavigationProvider>
      <TimerProvider>
        <MainLayoutContent />
      </TimerProvider>
    </NavigationProvider>
  );
}
