import { useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { useBoards } from '../../../hooks/useBoards';
import { useNodes } from '../../../hooks/useNodes';
import { useI18n } from '../../../contexts/i18n';
import { useNavigation } from '../../../contexts/navigation';
import { TopBar } from '../../../components/ui/TopBar';
import { BoardCanvas } from '../../../components/canvas/BoardCanvas';
import { FABMenu } from '../../../components/canvas/FABMenu';

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toggleDrawer, selectedBoardId, setSelectedBoardId } = useNavigation();
  const { boards, createBoard, getBoard } = useBoards(user?.id ?? null);
  const {
    nodes,
    loading,
    selectedNodeId,
    selectNode,
    addNode,
    updateNode,
    deleteNode,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
  } = useNodes(selectedBoardId, user?.id ?? null);

  const selectedBoard = selectedBoardId ? getBoard(selectedBoardId) : undefined;

  const handleAddImage = useCallback(() => {
    if (!selectedBoardId) {
      Alert.alert(
        t.canvas?.selectBoard || 'ボードを選択してください',
        t.canvas?.selectBoardHint || '左上のメニューからボードを選択',
      );
      return;
    }
    // TODO: Phase 1b — expo-image-picker → R2 upload → node creation
    // For now, create a placeholder image node
    addNode({
      type: 'image',
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 300,
      width: 250,
      height: 250,
      zIndex: nodes.length,
      src: undefined,
      cornerRadius: 12,
    });
  }, [selectedBoardId, t, addNode, nodes.length]);

  const handleAddText = useCallback(() => {
    if (!selectedBoardId) {
      Alert.alert(
        t.canvas?.selectBoard || 'ボードを選択してください',
        t.canvas?.selectBoardHint || '左上のメニューからボードを選択',
      );
      return;
    }
    addNode({
      type: 'text',
      x: 300 + Math.random() * 300,
      y: 300 + Math.random() * 200,
      width: 200,
      height: 60,
      zIndex: nodes.length,
      content: 'テキスト',
      fontSize: 24,
      color: '#FFFFFF',
    });
  }, [selectedBoardId, t, addNode, nodes.length]);

  const handleCreateBoard = useCallback(async () => {
    const newBoard = await createBoard(t.board?.newBoardDefault);
    if (newBoard) {
      setSelectedBoardId(newBoard.id);
    }
  }, [createBoard, t.board?.newBoardDefault, setSelectedBoardId]);

  return (
    <View className="flex-1 bg-gray-900">
      {/* TopBar with board name */}
      <TopBar
        title={selectedBoard?.title || ''}
        leftIcon="menu"
        onLeftPress={toggleDrawer}
        rightIcon="sparkles"
        rightIconColor="#FFD700"
        showRight={!!selectedBoardId}
      />

      {/* Canvas Area */}
      <View className="flex-1">
        <BoardCanvas
          boardId={selectedBoardId}
          nodes={nodes}
          loading={loading}
          selectedNodeId={selectedNodeId}
          onSelectNode={selectNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onBringToFront={bringToFront}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onSendToBack={sendToBack}
        />
      </View>

      {/* FAB Menu */}
      {selectedBoardId && (
        <FABMenu onAddImage={handleAddImage} onAddText={handleAddText} />
      )}
    </View>
  );
}
