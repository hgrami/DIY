import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
  noPadding?: boolean;
  disableTextSelection?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  noPadding = false,
  disableTextSelection = false,
}) => {
  const getCardStyle = (): { containerStyle: ViewStyle; gradientStyle: ViewStyle } => {
    const baseStyle: ViewStyle = {
      borderRadius: 16,
      overflow: 'hidden',
      marginVertical: 8,
      marginHorizontal: 16,
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      elevated: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    };

    const mergedStyle = {
      ...baseStyle,
      ...variantStyles[variant],
      ...style,
    };

    // Separate container styles from gradient/layout styles
    const {
      flexDirection,
      alignItems,
      justifyContent,
      paddingVertical,
      paddingHorizontal,
      padding,
      minHeight,
      ...containerOnlyStyles
    } = mergedStyle;

    const gradientStyle: ViewStyle = {
      flex: 1,
      ...(flexDirection && { flexDirection }),
      ...(alignItems && { alignItems }),
      ...(justifyContent && { justifyContent }),
      ...(paddingVertical !== undefined && { paddingVertical }),
      ...(paddingHorizontal !== undefined && { paddingHorizontal }),
      ...(padding !== undefined && { padding }),
      ...(minHeight && { minHeight }),
      // Apply default padding only if noPadding is false and no custom padding is provided
      ...(!noPadding && 
          paddingVertical === undefined && 
          paddingHorizontal === undefined && 
          padding === undefined && { padding: 16 }),
      // Disable text selection if requested
      ...(disableTextSelection && { userSelect: 'none' as any }),
    };

    return {
      containerStyle: containerOnlyStyles,
      gradientStyle,
    };
  };

  const { containerStyle, gradientStyle } = getCardStyle();

  return (
    <View style={containerStyle}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={gradientStyle}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

// Styles are now handled dynamically in getCardStyle