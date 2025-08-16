import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface SimpleGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glass' | 'highlighted';
  noPadding?: boolean;
  disableTextSelection?: boolean;
  borderRadius?: number;
}

export const SimpleGlassCard: React.FC<SimpleGlassCardProps> = ({
  children,
  style,
  variant = 'default',
  noPadding = false,
  disableTextSelection = false,
  borderRadius = 16,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius,
      overflow: 'hidden',
      marginVertical: 8,
      marginHorizontal: 16,
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.15)' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      },
      elevated: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.2)' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      },
      glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.1)' : '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 6,
      },
      highlighted: {
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.3)',
        shadowColor: Platform.OS === 'ios' ? 'rgba(102, 126, 234, 0.2)' : '#667eea',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

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

  const getContainerStyle = (): ViewStyle => {
    const cardStyle = getCardStyle();
    
    // Extract non-layout styles from the passed style prop
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

    return {
      ...cardStyle,
      ...containerOnlyStyle,
    };
  };

  // Only use blur on iOS for glass and elevated variants for better performance
  const shouldUseBlur = Platform.OS === 'ios' && (variant === 'glass' || variant === 'elevated');

  return (
    <View style={getContainerStyle()}>
      {shouldUseBlur && (
        <BlurView
          intensity={variant === 'glass' ? 20 : 15}
          tint="light"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius }}
        />
      )}
      
      <View style={getContentStyle()}>
        {children}
      </View>
    </View>
  );
};