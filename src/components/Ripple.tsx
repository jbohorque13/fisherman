import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface RippleProps {
  cx: number;
  cy: number;
  delay: number;
  maxWidth: number;
  initialOpacity?: number;
  duration?: number;
}

/**
 * Anillo elíptico que simula una onda en la superficie del agua.
 * La elipse achatada (height = width * 0.28) da efecto de perspectiva 3D.
 */
export function Ripple({
  cx,
  cy,
  delay,
  maxWidth,
  initialOpacity = 0.65,
  duration = 620,
}: RippleProps) {
  const scale = useSharedValue(0.05);
  const opacity = useSharedValue(initialOpacity);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const w = maxWidth;
  const h = maxWidth * 0.28;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: w,
          height: h,
          borderRadius: w / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.8)',
          backgroundColor: 'transparent',
          left: cx - w / 2,
          top: cy - h / 2,
        },
        animStyle,
      ]}
    />
  );
}
