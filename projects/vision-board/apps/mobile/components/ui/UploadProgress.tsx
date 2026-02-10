/**
 * UploadProgress — Overlay progress indicator for image uploads
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface UploadProgressProps {
  visible: boolean;
  progress: number;
}

export function UploadProgress({ visible, progress }: UploadProgressProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#0095F6" />
        <Text style={styles.text}>アップロード中...</Text>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.percent}>{progress}%</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 500,
  },
  card: {
    backgroundColor: '#1C1C1EEE',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    width: 200,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  barContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#0095F6',
    borderRadius: 2,
  },
  percent: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
