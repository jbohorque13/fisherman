import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Ripple } from './Ripple';

// ─── Timing ──────────────────────────────────────────────────────────────────
const FALL_DURATION = 300;  // ms de caída de cada gota
const DROP_STAGGER  = 160;  // ms entre gotas
const FADE_START    = 900;  // ms hasta iniciar fade-out (deja ver las ondas)
const FADE_DURATION = 320;  // ms del fade-out final

// 3 anillos por impacto: [delay extra, tamaño relativo, opacidad inicial, duracion]
const RINGS: [number, number, number, number][] = [
  [  0, 0.18, 0.75, 560],  // anillo interior: rápido y opaco
  [ 80, 0.32, 0.50, 660],  // anillo medio
  [160, 0.48, 0.28, 780],  // anillo exterior: lento y sutil
];

const DROPS: { xRatio: number }[] = [
  { xRatio: 0.26 },
  { xRatio: 0.52 },
  { xRatio: 0.74 },
];

// ─── Gota ─────────────────────────────────────────────────────────────────────

interface WaterDropProps {
  x: number;
  startY: number;
  endY: number;
  delay: number;
}

/**
 * Gota con forma de lágrima (redondeada abajo, levemente puntuda arriba).
 * Cae con aceleración gravitacional (easeIn) y desaparece al impactar.
 */
function WaterDrop({ x, startY, endY, delay }: WaterDropProps) {
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0.9);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(endY - startY, {
        duration: FALL_DURATION,
        easing: Easing.in(Easing.quad),
      }),
    );
    // Desaparece justo al impactar
    opacity.value = withDelay(
      delay + FALL_DURATION - 40,
      withTiming(0, { duration: 40 }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.drop, { left: x - 3, top: startY }, animStyle]}>
      {/* Cuerpo redondeado */}
      <View style={styles.dropBody} />
      {/* Punta superior (triángulo pequeño usando borders) */}
      <View style={styles.dropTip} />
    </Animated.View>
  );
}

// ─── Flash de impacto ─────────────────────────────────────────────────────────

interface ImpactBurstProps {
  x: number;
  y: number;
  delay: number;
}

/**
 * Breve destello oval al contacto de la gota con el agua.
 * Se expande horizontalmente y se aplana mientras se desvanece.
 */
function ImpactBurst({ x, y, delay }: ImpactBurstProps) {
  const opacity = useSharedValue(0);
  const scaleX  = useSharedValue(0.2);
  const scaleY  = useSharedValue(0.8);

  useEffect(() => {
    // Aparece rápido, luego se expande y desvanece
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.85, { duration: 50 }),
        withTiming(0,    { duration: 240, easing: Easing.out(Easing.quad) }),
      ),
    );
    scaleX.value = withDelay(
      delay,
      withSequence(
        withTiming(1,   { duration: 50 }),
        withTiming(2.8, { duration: 240, easing: Easing.out(Easing.cubic) }),
      ),
    );
    scaleY.value = withDelay(
      delay,
      withSequence(
        withTiming(1,   { duration: 50 }),
        withTiming(0.2, { duration: 240, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.burst,
        { left: x - 8, top: y - 4 },
        animStyle,
      ]}
    />
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

interface AnimatedSplashProps {
  onFinish: () => void;
}

/**
 * Pantalla animada post-splash:
 *  - Gotas con forma de lágrima caen con gravedad
 *  - Flash de impacto al tocar el agua
 *  - 3 anillos de onda concéntricos por gota
 *  - Fade-out suave al finalizar → llama onFinish()
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  const screenOpacity = useSharedValue(1);

  const waterY     = height * 0.54;
  const dropStartY = height * 0.20;

  useEffect(() => {
    screenOpacity.value = withDelay(
      FADE_START,
      withTiming(
        0,
        { duration: FADE_DURATION, easing: Easing.out(Easing.quad) },
        (finished) => { if (finished) runOnJS(onFinish)(); },
      ),
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Título */}
      <Text style={[styles.title, { top: height * 0.38 }]}>Fisherman</Text>

      {/* Línea de agua */}
      <View style={[styles.waterLine, { top: waterY }]} />

      {DROPS.map((cfg, i) => {
        const x           = width * cfg.xRatio;
        const dropDelay   = i * DROP_STAGGER;
        const impactDelay = dropDelay + FALL_DURATION;

        return (
          <React.Fragment key={i}>
            {/* Gota */}
            <WaterDrop
              x={x}
              startY={dropStartY}
              endY={waterY}
              delay={dropDelay}
            />

            {/* Flash al impactar */}
            <ImpactBurst x={x} y={waterY} delay={impactDelay} />

            {/* 3 anillos concéntricos */}
            {RINGS.map(([ringDelay, sizeRatio, initOpacity, dur], j) => (
              <Ripple
                key={j}
                cx={x}
                cy={waterY}
                delay={impactDelay + ringDelay}
                maxWidth={width * sizeRatio}
                initialOpacity={initOpacity}
                duration={dur}
              />
            ))}
          </React.Fragment>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2563EB',
  },
  title: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  waterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Gota: contenedor posicionado
  drop: {
    position: 'absolute',
    width: 6,
    height: 14,
    alignItems: 'center',
  },
  // Cuerpo oval de la gota
  dropBody: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.90)',
  },
  // Punta superior (triángulo via border trick)
  dropTip: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.90)',
  },
  // Flash de impacto
  burst: {
    position: 'absolute',
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
