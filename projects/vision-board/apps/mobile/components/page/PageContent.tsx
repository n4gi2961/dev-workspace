import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from '../ui/LucideIcon';
import { UploadProgress } from '../ui/UploadProgress';
import { ImageCropModal, type CropPosition } from './ImageCropModal';
import { RoutineWeeklyTable } from '../routine/RoutineWeeklyTable';
import { MilestoneList } from '../milestone/MilestoneList';
import { CalendarDataView } from '../calendar/CalendarDataView';
import { useAuth } from '../../hooks/useAuth';
import { useNodes } from '../../hooks/useNodes';
import { usePages, type Page } from '../../hooks/usePages';
import { useRoutines } from '../../hooks/useRoutines';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useNavigation } from '../../contexts/navigation';
import { CATEGORIES, DECADES } from '@vision-board/shared/constants';
import { generateId } from '@vision-board/shared/lib';

type TabId = 'routine' | 'milestone' | 'data';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'routine', label: 'ルーティン', icon: 'clipboard-check' },
  { id: 'milestone', label: 'マイルストーン', icon: 'target' },
  { id: 'data', label: 'データ', icon: 'bar-chart-3' },
];

const CATEGORY_LABELS: Record<string, string> = {
  place: '行きたい場所',
  state: 'なりたい状態',
  experience: '経験したいこと',
};

const CATEGORY_COLORS: Record<string, string> = {
  place: '#3B82F6',
  state: '#22C55E',
  experience: '#A855F7',
};

const DECADE_LABELS: Record<string, string> = {
  '2020s': '2020年代',
  '2030s': '2030年代',
  '2040s': '2040年代',
  '2050s': '2050年代',
  '2060s': '2060年代',
};

// --- Layout constants ---
const HEADER_IMAGE_HEIGHT = 240;
const COMPACT_BAR_HEIGHT = 48;

// Selector dropdown component
function SelectorDropdown({
  label,
  value,
  options,
  color,
  onSelect,
}: {
  label: string;
  value: string | undefined;
  options: { id: string; label: string; color?: string }[];
  color?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: color || '#2A2A2A',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 6,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
          {value ? options.find(o => o.id === value)?.label || label : label}
        </Text>
        <LucideIcon name="chevron-down" size={14} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 }}
          onPress={() => setVisible(false)}
        >
          <View style={{ backgroundColor: '#1E1E1E', borderRadius: 16, overflow: 'hidden' }}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  onSelect(opt.id === value ? undefined : opt.id);
                  setVisible(false);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: opt.id === value ? '#2A2A2A' : 'transparent',
                  gap: 10,
                }}
              >
                {opt.color && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.color }} />
                )}
                <Text style={{ color: '#FFFFFF', fontSize: 15 }}>{opt.label}</Text>
                {opt.id === value && <LucideIcon name="check" size={16} color="#0095F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// --- Action buttons (shared between large header and compact bar) ---
function HeaderActions({
  onClose,
  onImageEdit,
  size = 44,
}: {
  onClose: () => void;
  onImageEdit?: () => void;
  size?: number;
}) {
  const r = size / 2;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <TouchableOpacity
        onPress={onImageEdit}
        activeOpacity={0.6}
        style={{
          width: size, height: size, borderRadius: r,
          backgroundColor: 'rgba(80,80,80,0.3)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <LucideIcon name="image" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.6}
        style={{
          width: size, height: size, borderRadius: r,
          backgroundColor: 'rgba(80,80,80,0.3)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <LucideIcon name="x" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// --- Main PageContent component ---

interface PageContentProps {
  nodeId: string;
  onClose: () => void;
}

export function PageContent({ nodeId, onClose }: PageContentProps) {
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { selectedBoardId } = useNavigation();
  const { nodes } = useNodes(selectedBoardId, user?.id ?? null, session?.access_token ?? null);
  const { getPage, savePage, saveMilestones, loading } = usePages(user?.id ?? null);
  const {
    isUploading,
    progress: uploadProgress,
    pickImage,
    uploadImage,
  } = useImageUpload(user?.id ?? null, session?.access_token ?? null);

  const {
    getRoutinesForNode,
    getStacksForNode,
    toggleRoutineCheck,
    createRoutine,
    deleteRoutine,
    updateRoutineTitle,
    updateRoutineColor,
    updateRoutineActiveDays,
    createStack,
    deleteStack,
    updateStackTitle,
    toggleStackCheck,
    reorderRoutineInStack,
    reorderTopLevel,
    moveRoutineToStackAtPosition,
    moveRoutineOutOfStack,
  } = useRoutines(selectedBoardId, user?.id ?? null);

  const [page, setPage] = useState<Page | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('routine');
  const [titleText, setTitleText] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [compactVisible, setCompactVisible] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [headerImgNatural, setHeaderImgNatural] = useState<{ w: number; h: number } | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  const node = nodes.find(n => n.id === nodeId);
  const nodeRoutines = getRoutinesForNode(nodeId);
  const nodeStacks = getStacksForNode(nodeId);

  // --- Scroll tracking for collapsing header ---
  const scrollY = useSharedValue(0);
  const collapsePoint = HEADER_IMAGE_HEIGHT - insets.top - COMPACT_BAR_HEIGHT;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Toggle compact header pointer events via JS state
  useAnimatedReaction(
    () => scrollY.value > collapsePoint * 0.5,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setCompactVisible)(current);
      }
    },
  );

  // Compact header animated style
  const compactHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [collapsePoint * 0.5, collapsePoint],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Routine handlers
  const handleCreateRoutine = useCallback((title: string) => {
    createRoutine(title, nodeId);
  }, [nodeId, createRoutine]);

  // Milestone handlers
  const handleToggleMilestone = useCallback((id: string) => {
    if (!page) return;
    const updated = page.milestones.map(m =>
      m.id === id
        ? {
          ...m,
          completed: !m.completed,
          completedAt: !m.completed ? new Date().toISOString() : undefined,
        }
        : m
    );
    setPage(prev => prev ? { ...prev, milestones: updated } : prev);
    saveMilestones(nodeId, updated);
  }, [nodeId, page, saveMilestones]);

  const handleAddMilestone = useCallback((title: string) => {
    if (!page) return;
    const newMilestone = { id: generateId(), title, completed: false };
    const updated = [...page.milestones, newMilestone];
    setPage(prev => prev ? { ...prev, milestones: updated } : prev);
    saveMilestones(nodeId, updated);
  }, [nodeId, page, saveMilestones]);

  const handleDeleteMilestone = useCallback((id: string) => {
    if (!page) return;
    const updated = page.milestones.filter(m => m.id !== id);
    setPage(prev => prev ? { ...prev, milestones: updated } : prev);
    saveMilestones(nodeId, updated);
  }, [nodeId, page, saveMilestones]);

  const handleUpdateMilestoneTitle = useCallback((id: string, title: string) => {
    if (!page) return;
    const updated = page.milestones.map(m =>
      m.id === id ? { ...m, title } : m
    );
    setPage(prev => prev ? { ...prev, milestones: updated } : prev);
    saveMilestones(nodeId, updated);
  }, [nodeId, page, saveMilestones]);

  const handleReorderMilestones = useCallback((fromIndex: number, toIndex: number) => {
    if (!page) return;
    const arr = [...page.milestones];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    setPage(prev => prev ? { ...prev, milestones: arr } : prev);
    saveMilestones(nodeId, arr);
  }, [nodeId, page, saveMilestones]);

  // Load page data
  useEffect(() => {
    getPage(nodeId).then(p => {
      setPage(p);
      setTitleText(p.title);
    });
  }, [nodeId, getPage]);

  // Save title on blur
  const handleTitleBlur = useCallback(() => {
    if (!page) return;
    if (titleText !== page.title) {
      savePage(nodeId, { ...page, title: titleText });
      setPage(prev => prev ? { ...prev, title: titleText } : prev);
    }
  }, [nodeId, page, titleText, savePage]);

  // Save category
  const handleCategorySelect = useCallback((category: string | undefined) => {
    if (!page) return;
    const updated = { ...page, category };
    setPage(updated);
    savePage(nodeId, updated);
  }, [nodeId, page, savePage]);

  // Save decade
  const handleDecadeSelect = useCallback((targetDecade: string | undefined) => {
    if (!page) return;
    const updated = { ...page, targetDecade };
    setPage(updated);
    savePage(nodeId, updated);
  }, [nodeId, page, savePage]);

  const headerImage = page?.headerImage || node?.src;

  // Replace header image via gallery picker
  const handleReplaceImage = useCallback(async () => {
    setShowImageMenu(false);
    if (!selectedBoardId) return;

    const asset = await pickImage('gallery');
    if (!asset) return;

    try {
      const result = await uploadImage(asset, selectedBoardId, nodeId);
      const url = result.publicUrl || result.localUri;
      setHeaderImgNatural(null);
      setPage(prev => {
        const updated = prev
          ? { ...prev, headerImage: url, headerImageCrop: undefined }
          : prev;
        if (updated) savePage(nodeId, updated);
        return updated;
      });
    } catch {
      // Error handled by useImageUpload
    }
  }, [nodeId, selectedBoardId, pickImage, uploadImage, savePage]);

  // Image edit: show menu if image exists, else open gallery directly
  const handleImageEdit = useCallback(() => {
    if (headerImage) {
      setShowImageMenu(true);
    } else {
      handleReplaceImage();
    }
  }, [headerImage, handleReplaceImage]);

  // Open crop modal
  const handleOpenCrop = useCallback(() => {
    setShowImageMenu(false);
    setShowCropModal(true);
  }, []);

  // Handle crop position confirmation
  const handleCropConfirm = useCallback((position: CropPosition) => {
    setShowCropModal(false);
    setPage(prev => {
      const updated = prev ? { ...prev, headerImageCrop: position } : prev;
      if (updated) savePage(nodeId, updated);
      return updated;
    });
  }, [nodeId, savePage]);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* ===== Compact sticky header (fades in on scroll) ===== */}
      <Animated.View
        pointerEvents={compactVisible ? 'auto' : 'none'}
        style={[
          compactHeaderAnimStyle,
          {
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
            backgroundColor: '#121212',
            paddingTop: insets.top,
            borderBottomWidth: 1,
            borderBottomColor: '#1E293B',
          },
        ]}
      >
        <View style={{
          height: COMPACT_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 12,
        }}>
          <Text
            style={{ flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}
            numberOfLines={1}
          >
            {titleText || 'タイトルを入力'}
          </Text>
          <HeaderActions onClose={onClose} onImageEdit={handleImageEdit} size={32} />
        </View>
      </Animated.View>

      {/* ===== Main scrollable content ===== */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 400 }}
        bounces={false}
      >
        {/* Header image area */}
        <View style={{ height: HEADER_IMAGE_HEIGHT, position: 'relative' }}>
          {headerImage ? (
            <View style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <Image
                source={{ uri: headerImage }}
                onLoad={(e: { source: { width: number; height: number } }) => {
                  setHeaderImgNatural({ w: e.source.width, h: e.source.height });
                }}
                style={(() => {
                  if (!headerImgNatural) {
                    return { width: '100%', height: '100%' } as const;
                  }
                  const crop = page?.headerImageCrop;
                  const natW = headerImgNatural.w;
                  const natH = headerImgNatural.h;

                  const coverScale = Math.max(
                    screenWidth / natW,
                    HEADER_IMAGE_HEIGHT / natH,
                  );
                  const userZoom = crop?.scale ?? 1;
                  const totalScale = coverScale * userZoom;

                  const displayW = natW * totalScale;
                  const displayH = natH * totalScale;

                  const px = crop?.x ?? 50;
                  const py = crop?.y ?? 50;

                  const maxTx = Math.max(0, (displayW - screenWidth) / 2);
                  const maxTy = Math.max(0, (displayH - HEADER_IMAGE_HEIGHT) / 2);

                  const tx = maxTx > 0 ? maxTx * (1 - px / 50) : 0;
                  const ty = maxTy > 0 ? maxTy * (1 - py / 50) : 0;

                  const left = (screenWidth - displayW) / 2 + tx;
                  const top = (HEADER_IMAGE_HEIGHT - displayH) / 2 + ty;

                  return {
                    position: 'absolute' as const,
                    left,
                    top,
                    width: displayW,
                    height: displayH,
                  };
                })()}
                contentFit={headerImgNatural ? 'fill' : 'cover'}
              />
            </View>
          ) : (
            <View style={{ flex: 1, backgroundColor: '#1E1E1E' }} />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(18,18,18,0.8)', '#121212']}
            locations={[0.3, 0.7, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}
          />

          {/* Top bar icons */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              right: 16,
            }}
          >
            <HeaderActions onClose={onClose} onImageEdit={handleImageEdit} />
          </View>

          {/* Title over image */}
          <View style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <TextInput
              value={titleText}
              onChangeText={setTitleText}
              onBlur={handleTitleBlur}
              placeholder="タイトルを入力"
              placeholderTextColor="#6B7280"
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#FFFFFF',
                padding: 0,
              }}
            />
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0095F6" />
          </View>
        )}

        {/* Category & Decade selectors */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
          <SelectorDropdown
            label="カテゴリー未設定"
            value={page?.category}
            color={page?.category ? CATEGORY_COLORS[page.category] : undefined}
            options={CATEGORIES.map(c => ({
              id: c.id,
              label: CATEGORY_LABELS[c.id] || c.id,
              color: CATEGORY_COLORS[c.id],
            }))}
            onSelect={handleCategorySelect}
          />
          <SelectorDropdown
            label="達成年代未設定"
            value={page?.targetDecade}
            options={DECADES.map(d => ({
              id: d.id,
              label: DECADE_LABELS[d.id] || d.id,
            }))}
            onSelect={handleDecadeSelect}
          />
        </View>

        {/* Tab bar */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingTop: 20,
            gap: 8,
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isActive ? '#0095F6' : '#2A2A2A',
                }}
              >
                <LucideIcon
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? '#FFFFFF' : '#9CA3AF',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, minHeight: 300 }}>
          {activeTab === 'routine' && (
            <RoutineWeeklyTable
              nodeId={nodeId}
              routines={nodeRoutines}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
              onToggle={toggleRoutineCheck}
              onCreate={handleCreateRoutine}
              onDelete={deleteRoutine}
              onUpdateTitle={updateRoutineTitle}
              onUpdateColor={updateRoutineColor}
              onUpdateActiveDays={updateRoutineActiveDays}
              stacks={nodeStacks}
              onCreateStack={(title) => createStack(nodeId, title)}
              onDeleteStack={deleteStack}
              onUpdateStackTitle={updateStackTitle}
              onToggleStack={toggleStackCheck}
              onReorderInStack={reorderRoutineInStack}
              onReorderTopLevel={reorderTopLevel}
              onMoveToStack={moveRoutineToStackAtPosition}
              onMoveOutOfStack={moveRoutineOutOfStack}
            />
          )}
          {activeTab === 'milestone' && (
            <MilestoneList
              milestones={page?.milestones ?? []}
              onToggle={handleToggleMilestone}
              onAdd={handleAddMilestone}
              onDelete={handleDeleteMilestone}
              onUpdateTitle={handleUpdateMilestoneTitle}
              onReorder={handleReorderMilestones}
            />
          )}
          {activeTab === 'data' && (
            <CalendarDataView
              routines={nodeRoutines}
              milestones={page?.milestones ?? []}
            />
          )}
        </View>
      </Animated.ScrollView>

      {/* Upload progress overlay */}
      <UploadProgress visible={isUploading} progress={uploadProgress} />

      {/* Image action menu (bottom sheet style) */}
      <Modal visible={showImageMenu} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowImageMenu(false)}
        >
          <View style={{
            backgroundColor: '#1E1E1E',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 8,
          }}>
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#4B5563' }} />
            </View>

            {/* 2-row grid: icon + text horizontal per item */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 }}>
              <TouchableOpacity
                onPress={handleOpenCrop}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flex: 1,
                  minWidth: '45%',
                }}
              >
                <LucideIcon name="crop" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14 }}>表示位置を調整</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReplaceImage}
                activeOpacity={0.6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#2A2A2A',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flex: 1,
                  minWidth: '45%',
                }}
              >
                <LucideIcon name="image-plus" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14 }}>画像を差し替え</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Crop modal */}
      <ImageCropModal
        visible={showCropModal}
        imageUri={headerImage ?? null}
        initialPosition={page?.headerImageCrop}
        onConfirm={handleCropConfirm}
        onCancel={() => setShowCropModal(false)}
      />
    </View>
  );
}
