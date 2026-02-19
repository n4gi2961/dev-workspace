import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from '../../../components/ui/LucideIcon';
import { useAuth } from '../../../hooks/useAuth';
import { useRoutines } from '../../../hooks/useRoutines';
import { useStarStack } from '../../../hooks/useStarStack';
import { StarStackScene } from '../../../components/star-stack/StarStackScene';

export default function StarStackScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { routines } = useRoutines(boardId ?? null, user?.id ?? null);

  // routinesをRecord<string, Routine>形式に変換
  const routineRecord = routines as unknown as Record<string, any>;

  const {
    physicsRef,
    colors,
    meteorFlags,
    isLoading,
    totalStars,
    newStarsCount,
    showCork,
  } = useStarStack({
    userId: user?.id,
    boardId: boardId ?? undefined,
    routines: routineRecord,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <LucideIcon name="chevron-left" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Star Stack</Text>
        <View style={styles.starCount}>
          <LucideIcon name="sparkles" size={16} color="#FFD700" />
          <Text style={styles.starCountText}>{totalStars}</Text>
        </View>
      </View>

      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <StarStackScene
            physicsRef={physicsRef}
            colors={colors}
            meteorFlags={meteorFlags}
            showCork={showCork}
          />
        )}
      </View>

      {/* Footer */}
      {newStarsCount > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Today: +{newStarsCount} ★</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  starCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  starCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  canvasContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFD700',
  },
});
