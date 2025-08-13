import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  findNodeHandle,
  LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { GlassMenuButtonProps, ButtonDimensions, PopoverDimensions } from './types';
import { GlassPopover } from './GlassPopover';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const GlassMenuButton: React.FC<GlassMenuButtonProps> = ({
  text = 'U',
  icon,
  popoverPosition = 'auto',
  popoverWidth = 280,
  popoverHeight = 200,
  renderPopover,
  onOpenChange,
  size = 40,
  maxWidth = 120,
  glassMaterial = {
    blurIntensity: Platform.OS === 'ios' ? 20 : 15,
    tint: Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'light',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowOpacity: 0.15,
  },
  springConfig = {
    stiffness: 220,
    damping: 22,
    mass: 0.9,
  },
}) => {
  const buttonRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [buttonDimensions, setButtonDimensions] = useState<ButtonDimensions>({
    width: size,
    height: size,
    x: 0,
    y: 0,
  });
  const [textLayout, setTextLayout] = useState({ width: 0, height: 0 });

  // Animation values
  const pressScale = useSharedValue(1);

  // Calculate adaptive button dimensions
  const adaptiveDimensions = useMemo(() => {
    const textWidth = textLayout.width;
    const padding = 16;
    const minWidth = size;
    
    // If text is wider than the circle, expand to cylindrical
    const shouldExpand = textWidth + padding > minWidth;
    const finalWidth = shouldExpand ? Math.min(textWidth + padding, maxWidth) : minWidth;
    
    return {
      width: finalWidth,
      height: size,
      borderRadius: shouldExpand ? size / 2 : size / 2, // Cylindrical ends
      isExpanded: shouldExpand,
    };
  }, [textLayout.width, size, maxWidth]);

  const popoverDimensions: PopoverDimensions = useMemo(() => ({
    width: popoverWidth,
    height: popoverHeight,
    maxWidth: Math.min(popoverWidth, screenWidth - 32),
    maxHeight: Math.min(popoverHeight, screenHeight - 100),
  }), [popoverWidth, popoverHeight]);

  // Handle text layout measurement
  const handleTextLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTextLayout({ width, height });
  }, []);

  // Measure button position for popover
  const measureButton = useCallback(() => {
    return new Promise<ButtonDimensions>((resolve) => {
      const node = findNodeHandle(buttonRef.current);
      if (!node) {
        resolve({
          width: adaptiveDimensions.width,
          height: adaptiveDimensions.height,
          x: screenWidth / 2 - adaptiveDimensions.width / 2,
          y: screenHeight / 2 - adaptiveDimensions.height / 2,
        });
        return;
      }

      // @ts-ignore - React Native types don't include measureInWindow
      buttonRef.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        resolve({ x, y, width, height });
      });
    });
  }, [adaptiveDimensions]);

  // Animation handlers
  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.95, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const handlePress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const dimensions = await measureButton();
      setButtonDimensions(dimensions);
      setIsOpen(true);
      onOpenChange?.(true);
    } catch (error) {
      console.error('Error opening glass menu:', error);
    }
  }, [measureButton, onOpenChange]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const buttonStyle = useMemo(() => [
    styles.button,
    {
      width: adaptiveDimensions.width,
      height: adaptiveDimensions.height,
      borderRadius: adaptiveDimensions.borderRadius,
    },
    styles.shadow,
  ], [adaptiveDimensions]);

  return (
    <>
      {/* Main Button - Always visible, will be covered by popover during animation */}
      <Animated.View style={[buttonAnimatedStyle]}>
        <Pressable
          ref={buttonRef}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={buttonStyle}
          disabled={isOpen} // Disable interaction when popover is open
        >
          {/* Primary Glass Background Blur */}
          <BlurView
            intensity={glassMaterial.blurIntensity}
            tint={glassMaterial.tint}
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
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: adaptiveDimensions.borderRadius,
              },
            ]}
          />
          
          {/* Glass Gradient Layer - Top to Bottom */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.25)',
              'rgba(255, 255, 255, 0.08)', 
              'rgba(255, 255, 255, 0.02)',
              'rgba(0, 0, 0, 0.08)'
            ]}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: adaptiveDimensions.borderRadius }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          {/* Inner Highlight */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: adaptiveDimensions.borderRadius,
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
                borderRadius: adaptiveDimensions.borderRadius,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            ]}
          />

          {/* Content */}
          <View style={styles.content}>
            {icon || (
              <Text 
                style={styles.text}
                onLayout={handleTextLayout}
                numberOfLines={1}
              >
                {text}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* Glass Popover */}
      <GlassPopover
        isVisible={isOpen}
        onClose={handleClose}
        buttonDimensions={buttonDimensions}
        popoverDimensions={popoverDimensions}
        position={popoverPosition}
        glassMaterial={glassMaterial}
        springConfig={springConfig}
      >
        {renderPopover()}
      </GlassPopover>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    // Additional depth shadow
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : '#000',
  },
});