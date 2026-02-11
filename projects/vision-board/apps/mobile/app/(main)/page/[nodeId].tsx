import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, FlatList, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageContent } from '../../../components/page/PageContent';
import { useAuth } from '../../../hooks/useAuth';
import { useNodes, type Node } from '../../../hooks/useNodes';
import { useNavigation } from '../../../contexts/navigation';

// Horizontal page indicator (based on FocusScreen's vertical PageIndicator)
function HorizontalPageIndicator({ total, current }: { total: number; current: number }) {
  const MAX_VISIBLE = 7;
  const showAll = total <= MAX_VISIBLE;

  let startIndex = 0;
  let endIndex = total;

  if (!showAll) {
    const half = Math.floor(MAX_VISIBLE / 2);
    startIndex = Math.max(0, current - half);
    endIndex = Math.min(total, startIndex + MAX_VISIBLE);
    if (endIndex - startIndex < MAX_VISIBLE) {
      startIndex = Math.max(0, endIndex - MAX_VISIBLE);
    }
  }

  const dots = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top - 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      pointerEvents="none"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(80,80,80,0.5)',
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        {dots.map((index) => (
          <View
            key={index}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#FFFFFF',
              opacity: index === current ? 1.0 : 0.3,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function PageScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const { user, session } = useAuth();
  const { selectedBoardId } = useNavigation();
  const { nodes } = useNodes(selectedBoardId, user?.id ?? null, session?.access_token ?? null);
  const { width: screenWidth } = useWindowDimensions();

  // Sort image nodes by position: y ascending, then x ascending
  const sortedImageNodes = useMemo(() =>
    nodes
      .filter(n => n.type === 'image' && n.src)
      .sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x),
    [nodes],
  );

  const initialIndex = sortedImageNodes.findIndex(n => n.id === nodeId);
  const [currentPage, setCurrentPage] = useState(Math.max(0, initialIndex));

  const handleClose = () => router.back();

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item }: { item: Node }) => (
    <View style={{ width: screenWidth, flex: 1 }}>
      <PageContent nodeId={item.id} onClose={handleClose} />
    </View>
  ), [screenWidth, handleClose]);

  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  }), [screenWidth]);

  // Single node or text node: no pager needed
  if (sortedImageNodes.length <= 1 || initialIndex < 0) {
    return <PageContent nodeId={nodeId!} onClose={handleClose} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <FlatList
        data={sortedImageNodes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Horizontal dot indicator */}
      <HorizontalPageIndicator total={sortedImageNodes.length} current={currentPage} />
    </View>
  );
}
