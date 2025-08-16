import React, { useState, useCallback } from 'react';
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
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface SimpleGlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SimpleGlassButton: React.FC<SimpleGlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, loading, onPress]);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.2)' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    };

    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: disabled 
          ? 'rgba(102, 126, 234, 0.3)' 
          : 'rgba(102, 126, 234, 0.9)',
      },
      secondary: {
        backgroundColor: disabled 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled 
          ? 'rgba(255, 255, 255, 0.2)' 
          : 'rgba(255, 255, 255, 0.4)',
      },
    };

    const sizeStyles: Record<string, ViewStyle> = {
      small: { minHeight: 40 },
      medium: { minHeight: 48 },
      large: { minHeight: 56 },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size],
    };
  };

  const getContentStyle = (): ViewStyle => {
    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingVertical: 8, paddingHorizontal: 16 },
      medium: { paddingVertical: 12, paddingHorizontal: 24 },
      large: { paddingVertical: 16, paddingHorizontal: 32 },
    };

    return {
      justifyContent: 'center',
      alignItems: 'center',
      ...sizeStyles[size],
    };
  };

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
      primary: { color: disabled ? 'rgba(255, 255, 255, 0.6)' : '#FFFFFF' },
      secondary: { color: disabled ? 'rgba(255, 255, 255, 0.5)' : '#FFFFFF' },
      outline: { color: disabled ? 'rgba(255, 255, 255, 0.5)' : '#FFFFFF' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  // Simple glass effect only for non-outline variants
  const shouldUseGlass = variant !== 'outline' && Platform.OS === 'ios';

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {shouldUseGlass && (
        <BlurView
          intensity={15}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}
      
      <View style={getContentStyle()}>
        {loading ? (
          <ActivityIndicator 
            color={disabled ? "rgba(255,255,255,0.6)" : "#FFFFFF"} 
            size="small" 
          />
        ) : (
          <Text style={getTextStyle()}>{title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // No additional styles needed - everything is computed
});