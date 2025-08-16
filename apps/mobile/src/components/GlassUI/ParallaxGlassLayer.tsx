import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { RefractionSettings, MotionData } from './types';
import { useDeviceMotion } from '../../hooks/useDeviceMotion';

interface ParallaxGlassLayerProps {
  settings: RefractionSettings;
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'systemUltraThinMaterial';
  borderRadius?: number;
  style?: any;
  children?: React.ReactNode;
  isReducedMotionEnabled?: boolean;
}

/**
 * Parallax Glass Layer Component for iOS 26 Liquid Glass refraction effects
 * Creates multi-layered depth with motion-responsive parallax
 */
export const ParallaxGlassLayer: React.FC<ParallaxGlassLayerProps> = ({
  settings,
  blurIntensity = 20,
  tint = 'light',
  borderRadius = 12,
  style,
  children,
  isReducedMotionEnabled = false,
}) => {
  const {
    enabled = true,
    intensity = 0.5,
    layers = 2,
    motionSensitivity = 0.8,
  } = settings;

  // Device motion hook
  const deviceMotion = useDeviceMotion({
    enabled: enabled && !isReducedMotionEnabled,
    updateInterval: 16, // 60fps for smooth parallax
    smoothingFactor: 0.9, // High smoothing for parallax
    motionThreshold: 0.005, // Sensitive to small movements
  });

  // Animated values for each layer
  const layer1X = useSharedValue(0);
  const layer1Y = useSharedValue(0);
  const layer2X = useSharedValue(0);
  const layer2Y = useSharedValue(0);
  const layer3X = useSharedValue(0);
  const layer3Y = useSharedValue(0);

  // Spring configuration for natural movement
  const springConfig = useMemo(() => ({
    stiffness: 120,
    damping: 15,
    mass: 1,
    overshootClamping: true,
  }), []);

  // Update parallax positions based on device motion
  useEffect(() => {
    if (!enabled || isReducedMotionEnabled || !deviceMotion.isActive) {
      // Reset to center when disabled
      layer1X.value = withSpring(0, springConfig);
      layer1Y.value = withSpring(0, springConfig);
      layer2X.value = withSpring(0, springConfig);
      layer2Y.value = withSpring(0, springConfig);
      layer3X.value = withSpring(0, springConfig);
      layer3Y.value = withSpring(0, springConfig);
      return;
    }

    const maxOffset = 12; // Maximum parallax offset in pixels
    const motionScale = intensity * motionSensitivity;

    // Calculate offsets for each layer with different intensities
    // Layer 1 (bottom): Subtle movement
    const offset1 = deviceMotion.getParallaxOffset(motionScale * 0.3, { x: maxOffset * 0.5, y: maxOffset * 0.5 });
    layer1X.value = withSpring(offset1.x, springConfig);
    layer1Y.value = withSpring(offset1.y, springConfig);

    // Layer 2 (middle): Medium movement
    const offset2 = deviceMotion.getParallaxOffset(motionScale * 0.6, { x: maxOffset * 0.8, y: maxOffset * 0.8 });
    layer2X.value = withSpring(offset2.x, springConfig);
    layer2Y.value = withSpring(offset2.y, springConfig);

    // Layer 3 (top): Most pronounced movement
    if (layers >= 3) {
      const offset3 = deviceMotion.getParallaxOffset(motionScale, { x: maxOffset, y: maxOffset });
      layer3X.value = withSpring(offset3.x, springConfig);
      layer3Y.value = withSpring(offset3.y, springConfig);
    }
  }, [
    deviceMotion.motionData,
    enabled,
    isReducedMotionEnabled,
    intensity,
    motionSensitivity,
    layers,
    deviceMotion.isActive,
    springConfig,
  ]);

  // Animated styles for each layer
  const layer1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: layer1X.value },
      { translateY: layer1Y.value },
    ],
    opacity: 0.4,
  }));

  const layer2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: layer2X.value },
      { translateY: layer2Y.value },
    ],
    opacity: 0.6,
  }));

  const layer3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: layer3X.value },
      { translateY: layer3Y.value },
    ],
    opacity: 0.8,
  }));

  // Get optimized blur intensity for each layer
  const getLayerBlurIntensity = (layerIndex: number): number => {
    const baseIntensity = blurIntensity;
    const layerFactors = [0.6, 0.8, 1.0]; // Each layer gets progressively stronger blur
    
    return Math.max(5, Math.min(35, baseIntensity * layerFactors[layerIndex]));
  };

  // Get optimized tint for platform
  const getOptimizedTint = (): 'light' | 'dark' | 'systemUltraThinMaterial' => {
    if (Platform.OS === 'ios') {
      return tint === 'systemUltraThinMaterial' ? 'systemUltraThinMaterial' : tint;
    }
    return tint === 'systemUltraThinMaterial' ? 'light' : tint;
  };

  if (!enabled) {
    return (
      <View style={[styles.container, style, { borderRadius }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style, { borderRadius }]}>
      {/* Layer 1 - Base parallax layer */}
      <Animated.View style={[StyleSheet.absoluteFill, layer1Style]}>
        <BlurView
          intensity={getLayerBlurIntensity(0)}
          tint={getOptimizedTint()}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      </Animated.View>

      {/* Layer 2 - Middle parallax layer */}
      {layers >= 2 && (
        <Animated.View style={[StyleSheet.absoluteFill, layer2Style]}>
          <BlurView
            intensity={getLayerBlurIntensity(1)}
            tint={getOptimizedTint()}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
        </Animated.View>
      )}

      {/* Layer 3 - Top parallax layer */}
      {layers >= 3 && (
        <Animated.View style={[StyleSheet.absoluteFill, layer3Style]}>
          <BlurView
            intensity={getLayerBlurIntensity(2)}
            tint={getOptimizedTint()}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
        </Animated.View>
      )}

      {/* Content layer */}
      {children && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});