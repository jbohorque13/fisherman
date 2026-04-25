import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

type Props = { onDismiss: () => void };

const FAB_SIZE = 56;
const FAB_RIGHT = 20;
const FAB_BOTTOM_FROM_SCREEN_CONTENT = 16;

export default function IntegrarHelpOverlay({ onDismiss }: Props) {
  const theme = useTheme();

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.45 }],
    opacity: 0.7 - pulse.value * 0.7,
  }));

  const ringCenterRight = FAB_RIGHT - 14;
  const ringCenterBottom = FAB_BOTTOM_FROM_SCREEN_CONTENT - 14;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        <View style={styles.dim} />
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            right: ringCenterRight,
            bottom: ringCenterBottom,
            borderColor: theme.primary,
          },
          ringStyle,
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.dashedRing,
          {
            right: FAB_RIGHT - 8,
            bottom: FAB_BOTTOM_FROM_SCREEN_CONTENT - 8,
          },
        ]}
      />

      <View pointerEvents="box-none" style={styles.bubbleWrap}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            Presioná aquí para integrar una nueva persona.
          </Text>
          <View style={styles.bubbleTail} />
        </View>
      </View>

      <View style={styles.gotItWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.gotItBtn, { backgroundColor: theme.primary }]}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.gotItText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.7)' },
  pulseRing: {
    position: 'absolute',
    width: FAB_SIZE + 28,
    height: FAB_SIZE + 28,
    borderRadius: (FAB_SIZE + 28) / 2,
    borderWidth: 3,
  },
  dashedRing: {
    position: 'absolute',
    width: FAB_SIZE + 16,
    height: FAB_SIZE + 16,
    borderRadius: (FAB_SIZE + 16) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
  bubbleWrap: {
    position: 'absolute',
    right: 16,
    bottom: FAB_BOTTOM_FROM_SCREEN_CONTENT + FAB_SIZE + 32,
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: 260,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 20, fontWeight: '500' },
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    right: 26,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  arrowIcon: { marginTop: 4, marginRight: 28 },
  gotItWrap: {
    position: 'absolute',
    top: 24,
    right: 20,
  },
  gotItBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gotItText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
