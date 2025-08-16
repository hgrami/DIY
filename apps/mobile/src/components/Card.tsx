import React, { useRef } from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useBackgroundAnalysis } from '../hooks/useBackgroundAnalysis';
import { useDeviceMotion } from '../hooks/useDeviceMotion';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glass' | 'highlighted';
  noPadding?: boolean;
  disableTextSelection?: boolean;
  borderRadius?: number;
  
  // iOS 26 Liquid Glass features
  enableDynamicContrast?: boolean;
  enableMotionEffects?: boolean;
  enableSpecularHighlights?: boolean;
  performanceMode?: 'high' | 'balanced' | 'low';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  noPadding = false,
  disableTextSelection = false,
  borderRadius = 16,
  enableDynamicContrast = true,
  enableMotionEffects = true,
  enableSpecularHighlights = true,
  performanceMode = 'balanced',
}) => {
  // Use static values to prevent crashes - disable dynamic features temporarily
  const backgroundAnalysis = {
    getAdaptiveTint: () => 'light' as const,
    getAdaptiveBlurIntensity: () => 20,
  };
  
  const deviceMotion = {
    getParallaxOffset: () => ({ x: 0, y: 0 }),
    getSpecularPosition: () => ({ x: 0.5, y: 0.5 }),
  };

  // Get adaptive properties
  const adaptiveTint = backgroundAnalysis.getAdaptiveTint();
  const adaptiveBlurIntensity = backgroundAnalysis.getAdaptiveBlurIntensity();
  const parallaxOffset = deviceMotion.getParallaxOffset(0.2); // Very subtle for cards
  const specularPosition = deviceMotion.getSpecularPosition(0.3);

  // Variant configurations with dynamic adaptation
  const getVariantConfig = () => {
    const configs = {
      default: {
        baseColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        tint: adaptiveTint,
        intensity: adaptiveBlurIntensity * 0.6,
        elevation: 4,
      },
      elevated: {
        baseColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
        tint: adaptiveTint,
        intensity: adaptiveBlurIntensity * 0.8,
        elevation: 8,
      },
      glass: {
        baseColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        tint: adaptiveTint,
        intensity: adaptiveBlurIntensity,
        elevation: 6,
      },
      highlighted: {
        baseColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 0.3)',
        tint: 'light', // Fixed for highlighted variant
        intensity: adaptiveBlurIntensity * 0.7,
        elevation: 6,
      },
    };
    return configs[variant];
  };

  const config = getVariantConfig();

  // Remove animations to prevent trembling
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [],
  }));

  // Content style computation (extracted from original implementation)
  const getContentStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flex: 1,
      zIndex: 10,
    };

    // Extract layout and padding styles from the passed style prop
    const layoutStyle: ViewStyle = {};
    if (style) {
      const {
        flexDirection,
        alignItems,
        justifyContent,
        paddingVertical,
        paddingHorizontal,
        padding,
        minHeight,
      } = style as any;

      if (flexDirection) layoutStyle.flexDirection = flexDirection;
      if (alignItems) layoutStyle.alignItems = alignItems;
      if (justifyContent) layoutStyle.justifyContent = justifyContent;
      if (paddingVertical !== undefined) layoutStyle.paddingVertical = paddingVertical;
      if (paddingHorizontal !== undefined) layoutStyle.paddingHorizontal = paddingHorizontal;
      if (padding !== undefined) layoutStyle.padding = padding;
      if (minHeight) layoutStyle.minHeight = minHeight;
    }

    // Apply default padding if none specified and noPadding is false
    const defaultPadding = !noPadding && 
      !layoutStyle.padding && 
      !layoutStyle.paddingVertical && 
      !layoutStyle.paddingHorizontal ? { padding: 20 } : {};

    return {
      ...baseStyle,
      ...layoutStyle,
      ...defaultPadding,
      ...(disableTextSelection && { userSelect: 'none' as any }),
    };
  };

  // Container style (external layout styles from style prop)
  const getContainerStyle = (): ViewStyle => {
    const containerOnlyStyle: ViewStyle = {};
    if (style) {
      const {
        flexDirection,
        alignItems,
        justifyContent,
        paddingVertical,
        paddingHorizontal,
        padding,
        minHeight,
        ...containerStyles
      } = style as any;

      Object.assign(containerOnlyStyle, containerStyles);
    }

    return containerOnlyStyle;
  };

  return (
    <Animated.View
      style={[
        {
          borderRadius,
          overflow: 'hidden',
          marginVertical: 8,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: config.borderColor,
          shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.2)' : '#000',
          shadowOffset: { width: 0, height: config.elevation / 2 },
          shadowOpacity: 0.15,
          shadowRadius: config.elevation,
          elevation: config.elevation,
        },
        animatedStyle,
        getContainerStyle(),
      ]}
    >
      {/* Primary Blur Layer */}
      {config.intensity > 0 && Platform.OS === 'ios' && (
        <BlurView
          intensity={config.intensity}
          tint={config.tint as any}
          style={[
            { 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              borderRadius: borderRadius - 1, // Account for border
            }
          ]}
        />
      )}

      {/* Base Background Layer */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: config.baseColor,
          borderRadius: borderRadius - 1,
        }}
      />

      {/* Simple Glass Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.15)',
          'rgba(255, 255, 255, 0.05)',
          'rgba(0, 0, 0, 0.02)',
        ]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius - 1,
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Content */}
      <View style={getContentStyle()}>
        {children}
      </View>
    </Animated.View>
  );
};