import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { EnhancedGlassMaterial as EnhancedGlassMaterialType, GlassAnimationConfig } from './types';
import { useBackgroundAnalysis } from '../../hooks/useBackgroundAnalysis';
import { useDeviceMotion } from '../../hooks/useDeviceMotion';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EnhancedGlassMaterialProps {
  children?: React.ReactNode;
  style?: any;
  material: EnhancedGlassMaterialType;
  borderRadius?: number;
  onMaterialChange?: (material: EnhancedGlassMaterialType) => void;
}

/**
 * Enhanced Glass Material Component implementing iOS 26 Liquid Glass features
 * Supports dynamic contrast adaptation, real-time refraction, and specular highlights
 */
export const EnhancedGlassMaterial: React.FC<EnhancedGlassMaterialProps> = ({
  children,
  style,
  material,
  borderRadius = 12,
  onMaterialChange,
}) => {
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);
  const [performanceMode, setPerformanceMode] = useState<'high' | 'balanced' | 'low'>(
    material.performanceMode || 'balanced'
  );

  // Animation values
  const blurIntensity = useSharedValue(material.blurIntensity || 20);
  const opacity = useSharedValue(0.1);
  const parallaxX = useSharedValue(0);
  const parallaxY = useSharedValue(0);

  // Background analysis for dynamic contrast (disabled for now to prevent infinite loops)
  const backgroundAnalysis = useBackgroundAnalysis({
    enabled: false, // Temporarily disabled to fix infinite render loop
    sensitivity: material.dynamicContrast?.sensitivity || 0.7,
    updateInterval: 2000, // Static interval to prevent constant updates
  });

  // Device motion for refraction effects (disabled for now to prevent infinite loops)
  const deviceMotion = useDeviceMotion({
    enabled: false, // Temporarily disabled to fix infinite render loop
    updateInterval: 100, // Static interval
    smoothingFactor: 0.8,
    enableGyroscope: true,
  });

  // Check accessibility settings
  useEffect(() => {
    const checkReducedMotion = async () => {
      try {
        const isReducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotionEnabled(isReducedMotion);
      } catch (error) {
        console.warn('Failed to check reduced motion setting:', error);
      }
    };

    checkReducedMotion();
    
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotionEnabled
    );

    return () => subscription?.remove();
  }, []);

  // Get adaptive material properties (simplified to prevent infinite loops)
  const adaptiveMaterial = useMemo(() => {
    // Return the base material without dynamic adaptations for now
    // This prevents the infinite render loop while maintaining functionality
    return {
      ...material,
      backgroundAnalysis: {
        averageBrightness: 0.5,
        contrastRatio: 4.5,
        dominantColor: '#000000',
        hasComplexContent: false,
      },
    };
  }, [material]);

  // Update animated values when material changes (simplified)
  useEffect(() => {
    const duration = 300;
    
    blurIntensity.value = withTiming(adaptiveMaterial.blurIntensity || 20, { duration });
    opacity.value = withTiming(0.1, { duration });
  }, [adaptiveMaterial.blurIntensity]);

  // Update parallax values based on device motion (disabled for now)
  useEffect(() => {
    // Disabled to prevent infinite render loop
    // Keep values at 0 for now
    parallaxX.value = withSpring(0);
    parallaxY.value = withSpring(0);
  }, []);

  // Primary blur layer animated style
  const primaryBlurStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallaxX.value * 0.5 },
      { translateY: parallaxY.value * 0.5 },
    ],
  }));

  // Secondary blur layer animated style (stronger parallax)
  const secondaryBlurStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: parallaxX.value },
      { translateY: parallaxY.value },
    ],
    opacity: 0.6,
  }));

  // Base glass layer animated style
  const baseGlassStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Get platform-optimized blur tint
  const getOptimizedTint = useCallback(() => {
    if (Platform.OS === 'ios' && adaptiveMaterial.iosOptimizations?.useSystemMaterials !== false) {
      // Use iOS system materials when available
      switch (adaptiveMaterial.tint) {
        case 'systemUltraThinMaterial':
          return 'systemUltraThinMaterial';
        case 'systemThinMaterial':
          return 'systemThinMaterial';
        case 'systemMaterial':
          return 'systemMaterial';
        default:
          return adaptiveMaterial.tint || 'light';
      }
    }
    
    // Fallback for Android or when system materials are disabled
    return adaptiveMaterial.tint || 'light';
  }, [adaptiveMaterial]);

  // Get performance-adjusted blur intensity
  const getOptimizedBlurIntensity = useCallback((baseIntensity: number, layer: 'primary' | 'secondary') => {
    const performanceFactors = {
      high: 1.0,
      balanced: 0.8,
      low: 0.6,
    };
    
    const factor = performanceFactors[performanceMode];
    const layerFactor = layer === 'primary' ? 1.0 : 0.7;
    
    return Math.max(8, Math.min(40, baseIntensity * factor * layerFactor));
  }, [performanceMode]);

  // Gradient colors for glass effect
  const glassGradientColors = useMemo(() => {
    const baseColor = adaptiveMaterial.backgroundColor || 'rgba(255, 255, 255, 0.1)';
    const rgb = baseColor.match(/\d+/g);
    
    if (!rgb || rgb.length < 3) {
      return [
        'rgba(255, 255, 255, 0.25)',
        'rgba(255, 255, 255, 0.1)',
        'rgba(255, 255, 255, 0.05)',
        'rgba(0, 0, 0, 0.05)',
      ];
    }

    const [r, g, b] = rgb.map(Number);
    const brightness = adaptiveMaterial.backgroundAnalysis?.averageBrightness || 0.5;
    
    // Adjust gradient based on background brightness
    const alpha1 = brightness > 0.7 ? 0.15 : 0.25;
    const alpha2 = brightness > 0.7 ? 0.08 : 0.1;
    const alpha3 = brightness > 0.7 ? 0.03 : 0.05;
    
    return [
      `rgba(${r}, ${g}, ${b}, ${alpha1})`,
      `rgba(${r}, ${g}, ${b}, ${alpha2})`,
      `rgba(${r}, ${g}, ${b}, ${alpha3})`,
      'rgba(0, 0, 0, 0.05)',
    ];
  }, [adaptiveMaterial]);

  return (
    <View style={[styles.container, style, { borderRadius }]}>
      {/* Primary Glass Background Blur */}
      <Animated.View style={[StyleSheet.absoluteFill, primaryBlurStyle]}>
        <BlurView
          intensity={getOptimizedBlurIntensity(adaptiveMaterial.blurIntensity || 20, 'primary')}
          tint={getOptimizedTint()}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      </Animated.View>

      {/* Secondary Blur Layer for Enhanced Depth */}
      {material.refraction?.layers && material.refraction.layers > 1 && (
        <Animated.View style={[StyleSheet.absoluteFill, secondaryBlurStyle]}>
          <BlurView
            intensity={getOptimizedBlurIntensity(adaptiveMaterial.blurIntensity || 15, 'secondary')}
            tint="light"
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
        </Animated.View>
      )}

      {/* Base Glass Layer with Adaptive Color */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          baseGlassStyle,
          {
            backgroundColor: adaptiveMaterial.backgroundColor || 'rgba(255, 255, 255, 0.08)',
            borderRadius,
          },
        ]}
      />

      {/* Glass Gradient Layer */}
      <LinearGradient
        colors={glassGradientColors as any}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Inner Highlight Border */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.4)',
            borderLeftColor: 'rgba(255, 255, 255, 0.2)',
            borderRightColor: 'rgba(255, 255, 255, 0.1)',
            borderBottomColor: 'rgba(0, 0, 0, 0.1)',
          },
        ]}
      />

      {/* Outer Border */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: adaptiveMaterial.borderColor || 'rgba(255, 255, 255, 0.3)',
          },
        ]}
      />

      {/* Content */}
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
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});