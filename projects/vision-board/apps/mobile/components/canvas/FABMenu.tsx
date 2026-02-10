import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { FAB, FABMenuItem } from '../ui/FAB';
import { LucideIcon } from '../ui/LucideIcon';

interface FABMenuProps {
  onAddImage: () => void;
  onAddText: () => void;
  onDone?: () => void;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 0.8,
};

// TabBar: gradient(16) + pill(62) + bottom inset
const TAB_BAR_CONTENT_HEIGHT = 78;

export function FABMenu({ onAddImage, onAddText, onDone }: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const progress = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  const toggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    progress.value = withSpring(newState ? 1 : 0, SPRING_CONFIG);
  }, [isOpen, progress]);

  const close = useCallback(() => {
    setIsOpen(false);
    progress.value = withSpring(0, SPRING_CONFIG);
  }, [progress]);

  const handleAddImage = useCallback(() => {
    close();
    onAddImage();
  }, [close, onAddImage]);

  const handleAddText = useCallback(() => {
    close();
    onAddText();
  }, [close, onAddText]);

  // Overlay animation
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.6]),
    pointerEvents: progress.value > 0.01 ? 'auto' as const : 'none' as const,
  }));

  // Menu items slide up animation
  const menuItem1Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0]) },
    ],
  }));

  const menuItem2Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 0.8], [0, 0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
    ],
  }));

  // FAB icon rotation
  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  return (
    <>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Menu items */}
      <View
        pointerEvents={isOpen ? 'auto' : 'box-none'}
        style={[styles.menuContainer, { bottom: tabBarHeight + 16 }]}
      >
        <Animated.View style={[styles.menuItem, menuItem2Style]}>
          <FABMenuItem
            icon="image"
            label="画像を追加"
            onPress={handleAddImage}
          />
        </Animated.View>

        <Animated.View style={[styles.menuItem, menuItem1Style]}>
          <FABMenuItem
            icon="type"
            label="テキストを追加"
            onPress={handleAddText}
          />
        </Animated.View>

        {/* FAB button row */}
        <View style={styles.fabRow}>
          {onDone && (
            <Pressable onPress={onDone} style={styles.doneButton}>
              <LucideIcon name="check" size={20} color="#FFFFFF" />
            </Pressable>
          )}
          <Animated.View style={fabStyle}>
            <FAB icon="plus" onPress={toggle} />
          </Animated.View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 90,
  },
  menuContainer: {
    position: 'absolute',
    right: 24,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 100,
  },
  menuItem: {
    marginBottom: 4,
  },
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
