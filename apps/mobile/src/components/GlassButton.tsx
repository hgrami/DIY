import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type GlassButtonVariant = 'transparent' | 'opacity' | 'cancel' | 'approve';

interface GlassButtonProps {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: GlassButtonVariant;
  size?: number;
  disabled?: boolean;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  onPress,
  icon = 'x',
  variant = 'transparent',
  size = 32,
  disabled = false,
  hitSlop = { top: 10, bottom: 10, left: 10, right: 10 },
}) => {
  const handlePress = async () => {
    if (disabled) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getGlassColors = () => {
    switch (variant) {
      case 'transparent':
        return {
          baseColor: 'rgba(255, 255, 255, 0.05)',
          gradientColors: [
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.05)'
          ] as const,
          borderHighlight: 'rgba(255, 255, 255, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
        };
      case 'opacity':
        return {
          baseColor: 'rgba(255, 255, 255, 0.08)',
          gradientColors: [
            'rgba(255, 255, 255, 0.2)',
            'rgba(255, 255, 255, 0.08)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.08)'
          ] as const,
          borderHighlight: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 0.3)',
        };
      case 'cancel':
        return {
          baseColor: 'rgba(255, 69, 58, 0.15)',
          gradientColors: [
            'rgba(255, 69, 58, 0.3)',
            'rgba(255, 69, 58, 0.15)', 
            'rgba(255, 69, 58, 0.08)',
            'rgba(0, 0, 0, 0.08)'
          ] as const,
          borderHighlight: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 69, 58, 0.4)',
        };
      case 'approve':
        return {
          baseColor: 'rgba(0, 122, 255, 0.15)',
          gradientColors: [
            'rgba(0, 122, 255, 0.3)',
            'rgba(0, 122, 255, 0.15)', 
            'rgba(0, 122, 255, 0.08)',
            'rgba(0, 0, 0, 0.08)'
          ] as const,
          borderHighlight: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(0, 122, 255, 0.4)',
        };
      default:
        return {
          baseColor: 'rgba(255, 255, 255, 0.05)',
          gradientColors: [
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.05)'
          ] as const,
          borderHighlight: 'rgba(255, 255, 255, 0.3)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
        };
    }
  };

  const getIconColor = () => {
    if (disabled) return 'rgba(255, 255, 255, 0.3)';
    
    switch (variant) {
      case 'transparent':
      case 'opacity':
        return '#FFFFFF';
      case 'cancel':
        return '#FF453A'; // Apple red
      case 'approve':
        return '#007AFF'; // Apple blue
      default:
        return '#FFFFFF';
    }
  };

  const getIconName = () => {
    if (variant === 'approve' && icon === 'x') {
      return 'check'; // Default to checkmark for approve variant
    }
    return icon;
  };

  const glassColors = getGlassColors();

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        },
        disabled && styles.disabled
      ]}
      hitSlop={hitSlop}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {/* Primary Glass Background Blur */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 15 : 12}
        tint={Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Secondary Blur Layer for Depth */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 8 : 6}
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
            borderRadius: size / 2,
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
          { borderRadius: size / 2 }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Inner Highlight */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
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
            borderRadius: size / 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: disabled 
              ? 'rgba(255, 255, 255, 0.2)'
              : glassColors.borderColor,
          },
        ]}
      />

      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Feather 
          name={getIconName()} 
          size={18} 
          color={getIconColor()} 
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});