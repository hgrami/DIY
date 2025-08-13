import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
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
}) => {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getGlassColors = () => {
    switch (variant) {
      case 'primary':
        return {
          baseColor: 'rgba(102, 126, 234, 0.15)', // Blue tint
          gradientColors: [
            'rgba(102, 126, 234, 0.3)',
            'rgba(102, 126, 234, 0.15)', 
            'rgba(102, 126, 234, 0.08)',
            'rgba(0, 0, 0, 0.08)'
          ],
          borderHighlight: 'rgba(102, 126, 234, 0.6)',
          borderColor: 'rgba(102, 126, 234, 0.4)',
        };
      case 'secondary':
        return {
          baseColor: 'rgba(255, 255, 255, 0.08)', // Neutral white
          gradientColors: [
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.08)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.08)'
          ],
          borderHighlight: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
        };
      case 'outline':
        return {
          baseColor: 'rgba(255, 255, 255, 0.05)', // Very transparent
          gradientColors: [
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.05)'
          ],
          borderHighlight: 'rgba(255, 255, 255, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
        };
      default:
        return {
          baseColor: 'rgba(102, 126, 234, 0.15)',
          gradientColors: [
            'rgba(102, 126, 234, 0.3)',
            'rgba(102, 126, 234, 0.15)', 
            'rgba(102, 126, 234, 0.08)',
            'rgba(0, 0, 0, 0.08)'
          ],
          borderHighlight: 'rgba(102, 126, 234, 0.6)',
          borderColor: 'rgba(102, 126, 234, 0.4)',
        };
    }
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

  const glassColors = getGlassColors();

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
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {/* Primary Glass Background Blur */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 20 : 15}
        tint={Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Secondary Blur Layer for Depth */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 10 : 8}
        tint="light"
        style={[
          StyleSheet.absoluteFill,
          { opacity: 0.4 }
        ]}
      />
      
      {/* Base Glass Layer */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: disabled 
              ? 'rgba(255, 255, 255, 0.05)' 
              : glassColors.baseColor,
            borderRadius: 12,
          },
        ]}
      />
      
      {/* Glass Gradient Layer - Top to Bottom */}
      <LinearGradient
        colors={disabled ? [
          'rgba(255, 255, 255, 0.1)',
          'rgba(255, 255, 255, 0.05)', 
          'rgba(255, 255, 255, 0.02)',
          'rgba(0, 0, 0, 0.05)'
        ] as const : glassColors.gradientColors}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 12 }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Inner Highlight */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 12,
            borderWidth: 1,
            borderTopColor: disabled 
              ? 'rgba(255, 255, 255, 0.2)'
              : glassColors.borderHighlight,
            borderLeftColor: disabled 
              ? 'rgba(255, 255, 255, 0.1)'
              : `${glassColors.borderHighlight}80`, // 50% opacity
            borderRightColor: disabled 
              ? 'rgba(255, 255, 255, 0.05)'
              : `${glassColors.borderHighlight}40`, // 25% opacity
            borderBottomColor: 'rgba(0, 0, 0, 0.1)',
          },
        ]}
      />
      
      {/* Outer Border */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: disabled 
              ? 'rgba(255, 255, 255, 0.2)'
              : glassColors.borderColor,
          },
        ]}
      />

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