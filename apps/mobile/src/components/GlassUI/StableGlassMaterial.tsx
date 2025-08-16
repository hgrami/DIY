import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { EnhancedGlassMaterial as EnhancedGlassMaterialType } from './types';

interface StableGlassMaterialProps {
  children?: React.ReactNode;
  style?: any;
  material: EnhancedGlassMaterialType;
  borderRadius?: number;
}

/**
 * Stable Glass Material Component - Simplified version without infinite loops
 * Provides iOS 26 Liquid Glass appearance without complex dynamic features
 */
export const StableGlassMaterial: React.FC<StableGlassMaterialProps> = ({
  children,
  style,
  material,
  borderRadius = 12,
}) => {
  // Get platform-optimized blur tint
  const getOptimizedTint = () => {
    if (Platform.OS === 'ios' && material.iosOptimizations?.useSystemMaterials !== false) {
      switch (material.tint) {
        case 'systemUltraThinMaterial':
          return 'systemUltraThinMaterial';
        case 'systemThinMaterial':
          return 'systemThinMaterial';
        case 'systemMaterial':
          return 'systemMaterial';
        default:
          return material.tint || 'light';
      }
    }
    
    return material.tint || 'light';
  };

  // Get performance-adjusted blur intensity
  const getOptimizedBlurIntensity = () => {
    const performanceFactors = {
      high: 1.0,
      balanced: 0.8,
      low: 0.6,
    };
    
    const factor = performanceFactors[material.performanceMode || 'balanced'];
    return Math.max(8, Math.min(40, (material.blurIntensity || 20) * factor));
  };

  // Static gradient colors
  const glassGradientColors = [
    material.backgroundColor || 'rgba(255, 255, 255, 0.25)',
    material.backgroundColor || 'rgba(255, 255, 255, 0.1)',
    'rgba(255, 255, 255, 0.05)',
    'rgba(0, 0, 0, 0.05)',
  ];

  return (
    <View style={[styles.container, style, { borderRadius }]}>
      {/* Primary Glass Background Blur */}
      <BlurView
        intensity={getOptimizedBlurIntensity()}
        tint={getOptimizedTint()}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />

      {/* Base Glass Layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: material.backgroundColor || 'rgba(255, 255, 255, 0.08)',
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
            borderColor: material.borderColor || 'rgba(255, 255, 255, 0.3)',
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