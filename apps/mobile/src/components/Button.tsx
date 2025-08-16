import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBackgroundAnalysis } from '../hooks/useBackgroundAnalysis';
import { useDeviceMotion } from '../hooks/useDeviceMotion';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  
  // iOS 26 Liquid Glass features
  enableDynamicContrast?: boolean;
  enableMotionEffects?: boolean;
  enableSpecularHighlights?: boolean;
  performanceMode?: 'high' | 'balanced' | 'low';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  enableDynamicContrast = true,
  enableMotionEffects = true,
  enableSpecularHighlights = true,
  performanceMode = 'balanced',
}) => {
  // Animation values
  const pressedScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);
  const [pressLocation, setPressLocation] = useState({ x: 0.5, y: 0.5 });
  
  // Disable dynamic features temporarily to fix crashes - use static values
  const backgroundAnalysis = {
    getAdaptiveTint: () => 'light' as const,
    getAdaptiveBlurIntensity: () => 20,
  };
  
  const deviceMotion = {
    getParallaxOffset: () => ({ x: 0, y: 0 }),
    getSpecularPosition: () => ({ x: 0.5, y: 0.5 }),
  };

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, loading, onPress]);

  // Simplified press handling to prevent crashes
  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    pressedScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [disabled, loading, pressedScale]);

  const handlePressOut = useCallback(() => {
    pressedScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [pressedScale]);

  // Get adaptive properties from background analysis
  const adaptiveTint = backgroundAnalysis.getAdaptiveTint();
  const adaptiveBlurIntensity = backgroundAnalysis.getAdaptiveBlurIntensity();
  const parallaxOffset = deviceMotion.getParallaxOffset(0.3); // Subtle parallax
  const specularPosition = deviceMotion.getSpecularPosition(0.4);

  // Dynamic styles based on variant and analysis
  const getVariantConfig = () => {
    const configs = {
      primary: {
        baseColor: 'rgba(102, 126, 234, 0.9)',
        borderColor: 'rgba(102, 126, 234, 0.4)',
        tint: adaptiveTint,
        intensity: adaptiveBlurIntensity * 0.8,
      },
      secondary: {
        baseColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        tint: adaptiveTint,
        intensity: adaptiveBlurIntensity,
      },
      outline: {
        baseColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        tint: 'light',
        intensity: 0, // No blur for outline
      },
    };
    return configs[variant];
  };

  const config = getVariantConfig();

  // Size-based dimensions
  const sizeConfig = {
    small: { height: 40, paddingH: 16, fontSize: 14, borderRadius: 10 },
    medium: { height: 48, paddingH: 24, fontSize: 16, borderRadius: 12 },
    large: { height: 56, paddingH: 32, fontSize: 18, borderRadius: 14 },
  };
  const dimensions = sizeConfig[size];

  // Simplified animation - only scale for press
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  return (
    <Animated.View style={[animatedButtonStyle, style]}>
      <Pressable
        style={[
          styles.container,
          {
            height: dimensions.height,
            borderRadius: dimensions.borderRadius,
            borderWidth: variant === 'outline' ? 1 : StyleSheet.hairlineWidth,
            borderColor: disabled ? 'rgba(255, 255, 255, 0.2)' : config.borderColor,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {/* Primary Blur Layer */}
        {config.intensity > 0 && Platform.OS === 'ios' && (
          <BlurView
            intensity={config.intensity}
            tint={config.tint as any}
            style={[StyleSheet.absoluteFill, { borderRadius: dimensions.borderRadius }]}
          />
        )}

        {/* Base Background Layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: disabled 
                ? 'rgba(255, 255, 255, 0.05)' 
                : config.baseColor,
              borderRadius: dimensions.borderRadius,
            },
          ]}
        />

        {/* Simple Glass Gradient Overlay */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.05)',
            'rgba(0, 0, 0, 0.03)',
          ]}
          style={[StyleSheet.absoluteFill, { borderRadius: dimensions.borderRadius }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Content */}
        <View style={[styles.content, { paddingHorizontal: dimensions.paddingH }]}>
          {loading ? (
            <ActivityIndicator 
              color={disabled ? "rgba(255,255,255,0.6)" : "#FFFFFF"} 
              size="small" 
            />
          ) : (
            <Text style={[
              styles.text,
              {
                fontSize: dimensions.fontSize,
                color: disabled ? 'rgba(255, 255, 255, 0.6)' : '#FFFFFF',
              },
              textStyle,
            ]}>
              {title}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});