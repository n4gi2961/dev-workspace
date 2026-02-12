import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../hooks/useAuth';
import { useBoards } from '../../../hooks/useBoards';
import { useI18n } from '../../../contexts/i18n';
import { BOARD_BACKGROUNDS, type BackgroundType } from '../../../constants/boardBackgrounds';

const COLUMNS = 2;

export default function BoardBackgroundScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getBoard, updateBoardBackground } = useBoards(user?.id ?? null);
  const { t } = useI18n();

  const board = boardId ? getBoard(boardId) : undefined;
  const currentType = (board?.background_type || 'default') as BackgroundType;

  const handleSelect = useCallback(async (type: BackgroundType) => {
    if (!boardId || type === currentType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateBoardBackground(boardId, type);
    router.back();
  }, [boardId, currentType, updateBoardBackground]);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ChevronLeft size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
          {t.boardBackground?.title || 'Board template'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Background Options - 2 column grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: Math.ceil(BOARD_BACKGROUNDS.length / COLUMNS) }).map((_, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 12 }}>
            {BOARD_BACKGROUNDS.slice(rowIdx * COLUMNS, rowIdx * COLUMNS + COLUMNS).map((bg) => {
              const isSelected = bg.type === currentType;
              return (
                <Pressable
                  key={bg.type}
                  onPress={() => handleSelect(bg.type)}
                  style={{ flex: 1 }}
                >
                  {/* Preview Card */}
                  <View
                    style={{
                      height: 120,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? '#5865f2' : 'transparent',
                    }}
                  >
                    {bg.pattern ? (
                      <Image
                        source={bg.pattern}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ flex: 1, backgroundColor: bg.color || '#111827' }}>
                        <View style={{ flex: 1, padding: 10, justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                            {[0.12, 0.10, 0.08, 0.10].map((opacity, i) => (
                              <View
                                key={i}
                                style={{
                                  width: 40,
                                  height: 30,
                                  borderRadius: 6,
                                  backgroundColor: `rgba(255,255,255,${opacity})`,
                                }}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Radio Check */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#5865f2' : 'rgba(255,255,255,0.4)',
                        backgroundColor: isSelected ? '#5865f2' : 'rgba(0,0,0,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </View>

                  {/* Label */}
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : '#9CA3AF',
                      fontSize: 13,
                      fontWeight: '500',
                      marginTop: 6,
                    }}
                  >
                    {bg.label}
                  </Text>
                </Pressable>
              );
            })}
            {/* Fill empty space if odd number in last row */}
            {rowIdx * COLUMNS + COLUMNS > BOARD_BACKGROUNDS.length && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
