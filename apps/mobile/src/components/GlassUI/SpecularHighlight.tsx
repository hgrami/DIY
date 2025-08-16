import React, { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SpecularHighlightSettings, InteractionState } from './types';
import { useDeviceMotion } from '../../hooks/useDeviceMotion';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpecularHighlightProps {
  settings: SpecularHighlightSettings;
  borderRadius?: number;
  interactionState?: InteractionState;
  width?: number;
  height?: number;
  isReducedMotionEnabled?: boolean;
}

/**
 * Specular Highlight Component for iOS 26 Liquid Glass lighting effects
 * Creates dynamic highlights that respond to device motion and user interaction
 */
export const SpecularHighlight: React.FC<SpecularHighlightProps> = ({
  settings,
  borderRadius = 12,
  interactionState,
  width = 100,
  height = 100,
  isReducedMotionEnabled = false,
}) => {
  const {
    enabled = true,
    intensity = 0.6,
    size = 1.0,
    motionResponse = true,
    interactionResponse = true,
    animationDuration = 200,
  } = settings;

  // Device motion for light positioning
  const deviceMotion = useDeviceMotion({
    enabled: enabled && motionResponse && !isReducedMotionEnabled,
    updateInterval: 16, // 60fps for smooth highlights
    smoothingFactor: 0.7, // Medium smoothing for responsive but stable highlights
  });

  // Animated values
  const highlightX = useSharedValue(0.5); // 0-1 normalized position
  const highlightY = useSharedValue(0.5);
  const highlightOpacity = useSharedValue(intensity);
  const highlightScale = useSharedValue(size);
  const interactionScale = useSharedValue(1);
  const interactionOpacity = useSharedValue(0);

  // Spring configuration for natural movement
  const springConfig = useMemo(() => ({
    stiffness: 80,
    damping: 12,
    mass: 1,
  }), []);

  // Fast spring for interactions
  const interactionSpringConfig = useMemo(() => ({
    stiffness: 200,
    damping: 20,
    mass: 0.8,
  }), []);

  // Update highlight position based on device motion
  useEffect(() => {
    if (!enabled || !motionResponse || isReducedMotionEnabled || !deviceMotion.isActive) {
      // Reset to center when disabled
      highlightX.value = withSpring(0.5, springConfig);
      highlightY.value = withSpring(0.5, springConfig);
      return;
    }

    // Get specular position from device motion
    const position = deviceMotion.getSpecularPosition(intensity);
    
    highlightX.value = withSpring(position.x, springConfig);
    highlightY.value = withSpring(position.y, springConfig);
  }, [
    deviceMotion.motionData,
    enabled,
    motionResponse,
    isReducedMotionEnabled,
    intensity,
    deviceMotion.isActive,
    springConfig,
  ]);

  // Handle interaction responses
  useEffect(() => {
    if (!enabled || !interactionResponse || !interactionState) return;

    const { isPressed, pressLocation, pressIntensity } = interactionState;

    if (isPressed) {
      // Create highlight at press location
      if (pressLocation) {
        const normalizedX = pressLocation.x / width;
        const normalizedY = pressLocation.y / height;
        
        highlightX.value = withSpring(Math.max(0, Math.min(1, normalizedX)), interactionSpringConfig);
        highlightY.value = withSpring(Math.max(0, Math.min(1, normalizedY)), interactionSpringConfig);
      }

      // Enhance highlight on press
      const pressIntensityFactor = pressIntensity ? 1 + pressIntensity * 0.5 : 1.2;
      interactionScale.value = withSpring(pressIntensityFactor, interactionSpringConfig);
      interactionOpacity.value = withTiming(0.3, { duration: animationDuration / 2 });
    } else {
      // Return to normal state
      interactionScale.value = withSpring(1, interactionSpringConfig);
      interactionOpacity.value = withTiming(0, { duration: animationDuration });
    }
  }, [
    interactionState,
    enabled,
    interactionResponse,
    width,
    height,
    animationDuration,
    interactionSpringConfig,
  ]);

  // Update overall highlight properties
  useEffect(() => {
    highlightOpacity.value = withTiming(enabled ? intensity : 0, { duration: animationDuration });
    highlightScale.value = withTiming(enabled ? size : 0, { duration: animationDuration });
  }, [enabled, intensity, size, animationDuration]);

  // Create multiple gradient stops for realistic lighting
  const createHighlightGradient = useCallback((opacity: number) => {
    const center = opacity;
    const edge = opacity * 0.3;
    const outer = 0;

    return [
      `rgba(255, 255, 255, ${center})`,
      `rgba(255, 255, 255, ${edge})`,
      `rgba(255, 255, 255, ${outer})`,
    ];
  }, []);

  // Primary highlight animated style
  const primaryHighlightStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      highlightX.value,
      [0, 1],
      [-width * 0.3, width * 0.3],
      Extrapolate.CLAMP
    );
    
    const translateY = interpolate(
      highlightY.value,
      [0, 1],
      [-height * 0.3, height * 0.3],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { scale: highlightScale.value },
      ],
      opacity: highlightOpacity.value,
    };
  });

  // Secondary highlight for depth
  const secondaryHighlightStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      highlightX.value,
      [0, 1],
      [-width * 0.2, width * 0.2],
      Extrapolate.CLAMP
    );
    
    const translateY = interpolate(
      highlightY.value,
      [0, 1],
      [-height * 0.2, height * 0.2],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { scale: highlightScale.value * 1.2 },
      ],
      opacity: highlightOpacity.value * 0.5,
    };
  });

  // Interaction highlight style
  const interactionHighlightStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interactionScale.value },
    ],
    opacity: interactionOpacity.value,
  }));

  if (!enabled) {
    return null;
  }

  return (
    <View style={[styles.container, { borderRadius }]} pointerEvents="none">
      {/* Secondary highlight for depth */}
      <Animated.View style={[styles.highlight, styles.secondaryHighlight, secondaryHighlightStyle]}>
        <LinearGradient
          colors={createHighlightGradient(intensity * 0.4) as any}
          style={[styles.gradientFill, { borderRadius: width }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Primary specular highlight */}
      <Animated.View style={[styles.highlight, styles.primaryHighlight, primaryHighlightStyle]}>
        <LinearGradient
          colors={createHighlightGradient(intensity) as any}
          style={[styles.gradientFill, { borderRadius: width * 0.6 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Interaction highlight overlay */}
      {interactionResponse && (
        <Animated.View style={[styles.highlight, styles.interactionHighlight, interactionHighlightStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.4)',
              'rgba(255, 255, 255, 0.2)',
              'rgba(255, 255, 255, 0)',
            ]}
            style={[styles.gradientFill, { borderRadius: width * 0.8 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Edge highlights for glass rim effect */}
      <View style={[styles.edgeHighlights, { borderRadius }]}>
        {/* Top edge highlight */}
        <LinearGradient
          colors={[
            `rgba(255, 255, 255, ${intensity * 0.6})`,
            `rgba(255, 255, 255, ${intensity * 0.3})`,
            'rgba(255, 255, 255, 0)',
          ]}
          style={styles.topEdge}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        {/* Left edge highlight */}
        <LinearGradient
          colors={[
            `rgba(255, 255, 255, ${intensity * 0.4})`,
            `rgba(255, 255, 255, ${intensity * 0.2})`,
            'rgba(255, 255, 255, 0)',
          ]}
          style={styles.leftEdge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryHighlight: {
    width: '60%',
    height: '60%',
    top: '20%',
    left: '20%',
  },
  secondaryHighlight: {
    width: '80%',
    height: '80%',
    top: '10%',
    left: '10%',
  },
  interactionHighlight: {
    width: '40%',
    height: '40%',
    top: '30%',
    left: '30%',
  },
  gradientFill: {
    flex: 1,
    width: '100%',
  },
  edgeHighlights: {
    ...StyleSheet.absoluteFillObject,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
  },
  leftEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '20%',
  },
});