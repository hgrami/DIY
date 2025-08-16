import React, { useState, useCallback, useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  EnhancedGlassMaterial, 
  SpecularHighlight
} from './GlassUI';
import { 
  EnhancedGlassMaterial as EnhancedGlassMaterialType,
  InteractionState 
} from './GlassUI/types';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  
  // Enhanced iOS 26 features
  enableDynamicContrast?: boolean;
  enableMotionEffects?: boolean;
  enableSpecularHighlights?: boolean;
  performanceMode?: 'high' | 'balanced' | 'low';
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
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
  const [interactionState, setInteractionState] = useState<InteractionState>({
    isPressed: false,
  });

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, loading, onPress]);

  const handlePressIn = useCallback((event: any) => {
    if (disabled || loading) return;
    
    const { locationX, locationY } = event.nativeEvent;
    setInteractionState({
      isPressed: true,
      pressLocation: { x: locationX, y: locationY },
      pressIntensity: 1.0, // Could be enhanced with force touch on supported devices
    });
  }, [disabled, loading]);

  const handlePressOut = useCallback(() => {
    setInteractionState({
      isPressed: false,
    });
  }, []);

  // Enhanced glass material configuration
  const glassMaterial = useMemo((): EnhancedGlassMaterialType => {
    const baseColors = {
      primary: {
        backgroundColor: 'rgba(102, 126, 234, 0.15)',
        borderColor: 'rgba(102, 126, 234, 0.4)',
        tint: 'light' as const,
      },
      secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        tint: 'light' as const,
      },
      outline: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
        tint: 'systemUltraThinMaterial' as const,
      },
    };

    const variantColors = baseColors[variant];

    return {
      blurIntensity: 20,
      tint: variantColors.tint,
      backgroundColor: variantColors.backgroundColor,
      borderColor: variantColors.borderColor,
      shadowOpacity: 0.25,
      
      // Dynamic contrast settings
      dynamicContrast: {
        enabled: enableDynamicContrast,
        sensitivity: 0.7,
        minContrast: 4.5,
        adaptSpeed: 300,
      },
      
      // Refraction settings
      refraction: {
        enabled: enableMotionEffects,
        intensity: 0.3, // Subtle for buttons
        layers: 2,
        motionSensitivity: 0.6,
      },
      
      // Specular highlight settings
      specularHighlights: {
        enabled: enableSpecularHighlights,
        intensity: 0.4,
        size: 1.0,
        motionResponse: enableMotionEffects,
        interactionResponse: true,
        animationDuration: 200,
      },
      
      // Performance settings
      performanceMode,
      enableMotionEffects,
      
      // Platform optimizations
      iosOptimizations: {
        useSystemMaterials: true,
        metalPerformanceShaders: performanceMode === 'high',
      },
      
      androidOptimizations: {
        useRenderScript: performanceMode === 'high',
        fallbackBlur: performanceMode === 'low',
      },
    };
  }, [
    variant, 
    enableDynamicContrast, 
    enableMotionEffects, 
    enableSpecularHighlights, 
    performanceMode
  ]);

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      outline: { color: '#FFFFFF' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  const buttonDimensions = useMemo(() => {
    const heights = {
      small: 40,
      medium: 48,
      large: 56,
    };
    
    return {
      width: 200, // Estimated width, could be measured dynamically
      height: heights[size],
    };
  }, [size]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        size === 'small' && styles.buttonSmall,
        size === 'medium' && styles.buttonMedium,
        size === 'large' && styles.buttonLarge,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {/* Enhanced Glass Material Background */}
      <EnhancedGlassMaterial
        material={glassMaterial}
        borderRadius={12}
        style={StyleSheet.absoluteFill}
      />

      {/* Specular Highlights */}
      {enableSpecularHighlights && (
        <SpecularHighlight
          settings={glassMaterial.specularHighlights!}
          borderRadius={12}
          interactionState={interactionState}
          width={buttonDimensions.width}
          height={buttonDimensions.height}
        />
      )}

      {/* Content */}
      <View
        style={[
          styles.content,
          size === 'small' && styles.contentSmall,
          size === 'medium' && styles.contentMedium,
          size === 'large' && styles.contentLarge,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={getTextStyle()}>{title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
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
  buttonSmall: {
    minHeight: 40,
  },
  buttonMedium: {
    minHeight: 48,
  },
  buttonLarge: {
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, // Above glass material and highlights
  },
  contentSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  contentMedium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  contentLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
});