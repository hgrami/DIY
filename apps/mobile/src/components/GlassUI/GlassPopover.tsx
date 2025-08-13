import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GlassPopoverProps, PositionCalculation, PopoverPosition } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const GlassPopover: React.FC<GlassPopoverProps> = ({
  isVisible,
  onClose,
  buttonDimensions,
  popoverDimensions,
  position,
  children,
  glassMaterial = {
    blurIntensity: Platform.OS === 'ios' ? 25 : 18,
    tint: Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'light',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    shadowOpacity: 0.20,
  },
  springConfig = {
    stiffness: 220,
    damping: 22,
    mass: 0.9,
  },
}) => {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const progress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Calculate optimal popover position - START FROM BUTTON
  const positionCalculation: PositionCalculation = useMemo(() => {
    const margin = 16;
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top;
    const availableHeight = screenHeight - statusBarHeight - insets.bottom;
    const availableWidth = screenWidth;

    const buttonCenterX = buttonDimensions.x + buttonDimensions.width / 2;
    const buttonCenterY = buttonDimensions.y + buttonDimensions.height / 2;

    // Auto-calculate best position if 'auto' is specified
    let finalPosition: PopoverPosition = position;
    
    if (position === 'auto') {
      const spaceTop = buttonDimensions.y - statusBarHeight;
      const spaceBottom = availableHeight - (buttonDimensions.y + buttonDimensions.height);
      const spaceLeft = buttonDimensions.x;
      const spaceRight = availableWidth - (buttonDimensions.x + buttonDimensions.width);

      // Determine best position based on available space
      if (spaceBottom >= popoverDimensions.height + margin) {
        finalPosition = 'bottom-left';
      } else if (spaceTop >= popoverDimensions.height + margin) {
        finalPosition = 'top-left';
      } else if (spaceRight >= popoverDimensions.width + margin) {
        finalPosition = 'bottom-right';
      } else if (spaceLeft >= popoverDimensions.width + margin) {
        finalPosition = 'bottom-left';
      } else {
        finalPosition = 'bottom-left'; // Default fallback
      }
    }

    // Calculate position coordinates - popover STARTS from button position
    let x: number, y: number;
    let originX: number, originY: number;
    
    switch (finalPosition) {
      case 'top':
        x = buttonCenterX - popoverDimensions.width / 2;
        y = buttonDimensions.y - popoverDimensions.height + 20; // Overlap button slightly
        originX = buttonCenterX;
        originY = buttonDimensions.y + buttonDimensions.height / 2;
        break;
      case 'bottom':
        x = buttonCenterX - popoverDimensions.width / 2;
        y = buttonDimensions.y - 20; // Start from button, expand down
        originX = buttonCenterX;
        originY = buttonDimensions.y + buttonDimensions.height / 2;
        break;
      case 'left':
        x = buttonDimensions.x - popoverDimensions.width + 20; // Overlap button
        y = buttonCenterY - popoverDimensions.height / 2;
        originX = buttonDimensions.x + buttonDimensions.width / 2;
        originY = buttonCenterY;
        break;
      case 'right':
        x = buttonDimensions.x - 20; // Start from button, expand right
        y = buttonCenterY - popoverDimensions.height / 2;
        originX = buttonDimensions.x + buttonDimensions.width / 2;
        originY = buttonCenterY;
        break;
      case 'top-left':
        x = buttonDimensions.x - popoverDimensions.width + buttonDimensions.width + 8;
        y = buttonDimensions.y - popoverDimensions.height + buttonDimensions.height + 8;
        originX = buttonDimensions.x + buttonDimensions.width / 2;
        originY = buttonDimensions.y + buttonDimensions.height / 2;
        break;
      case 'top-right':
        x = buttonDimensions.x - 8;
        y = buttonDimensions.y - popoverDimensions.height + buttonDimensions.height + 8;
        originX = buttonDimensions.x + buttonDimensions.width / 2;
        originY = buttonDimensions.y + buttonDimensions.height / 2;
        break;
      case 'bottom-left':
        // Popover expands from button's top-right corner
        x = buttonDimensions.x - popoverDimensions.width + buttonDimensions.width + 8;
        y = buttonDimensions.y - 8;
        originX = buttonDimensions.x + buttonDimensions.width - 8;
        originY = buttonDimensions.y + 8;
        break;
      case 'bottom-right':
        x = buttonDimensions.x - 8;
        y = buttonDimensions.y - 8;
        originX = buttonDimensions.x + 8;
        originY = buttonDimensions.y + 8;
        break;
      default:
        x = buttonDimensions.x - popoverDimensions.width + buttonDimensions.width + 8;
        y = buttonDimensions.y - 8;
        originX = buttonDimensions.x + buttonDimensions.width - 8;
        originY = buttonDimensions.y + 8;
    }

    // Ensure popover stays within screen bounds
    x = Math.max(margin, Math.min(x, availableWidth - popoverDimensions.width - margin));
    y = Math.max(statusBarHeight + margin, Math.min(y, availableHeight - popoverDimensions.height - margin));

    return {
      x,
      y,
      position: finalPosition,
      originX,
      originY,
    };
  }, [buttonDimensions, popoverDimensions, position, insets]);

  // Handle open animation
  useEffect(() => {
    if (isVisible) {
      // Start animations
      backdropOpacity.value = withTiming(1, { duration: 200 });
      
      // Small delay to let Modal mount, then animate popover
      const timer = setTimeout(() => {
        progress.value = withSpring(1, springConfig);
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // Close animations
      backdropOpacity.value = withTiming(0, { duration: 150 });
      progress.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [isVisible, progress, backdropOpacity, springConfig]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.6,
  }));

  const popoverAnimatedStyle = useAnimatedStyle(() => {
    const scale = 0.1 + (progress.value * 0.9); // Scale from tiny to full size (0.1 to 1.0)
    
    // For Apple-style expansion, we start from the origin point and expand outward
    // The origin is where the button is, and we expand from there
    const originXOffset = positionCalculation.originX - positionCalculation.x;
    const originYOffset = positionCalculation.originY - positionCalculation.y;
    
    // Transform origin offset (where the scaling happens from)
    const transformOriginX = originXOffset / popoverDimensions.width;
    const transformOriginY = originYOffset / popoverDimensions.height;
    
    // Calculate translation to maintain origin position during scaling
    const translateX = (1 - progress.value) * originXOffset * (1 - scale);
    const translateY = (1 - progress.value) * originYOffset * (1 - scale);

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
      opacity: progress.value,
    };
  });

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Background Blur and Backdrop */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 22 : 10}
          tint={Platform.OS === 'ios' ? 'systemThinMaterial' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Backdrop Dimming - Very subtle like Apple */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0, 0, 0, 0.15)' },
            backdropAnimatedStyle,
          ]}
          pointerEvents="none"
        />

        {/* Backdrop Touchable Area */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />

        {/* Popover */}
        <Animated.View
          style={[
            styles.popover,
            {
              left: positionCalculation.x,
              top: positionCalculation.y,
              width: popoverDimensions.width,
              height: popoverDimensions.height,
            },
            popoverAnimatedStyle,
          ]}
        >
          {/* Primary Glass Background Blur */}
          <BlurView
            intensity={glassMaterial.blurIntensity}
            tint={glassMaterial.tint}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Secondary Blur Layer for Depth */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 15 : 12}
            tint="light"
            style={[
              StyleSheet.absoluteFill,
              { opacity: 0.5 }
            ]}
          />
          
          {/* Base Glass Layer */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 18,
              },
            ]}
          />
          
          {/* Glass Gradient Layer - Top to Bottom */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.3)',
              'rgba(255, 255, 255, 0.12)', 
              'rgba(255, 255, 255, 0.06)',
              'rgba(0, 0, 0, 0.05)'
            ]}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: 18 }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          {/* Inner Highlight */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 18,
                borderWidth: 1.5,
                borderTopColor: 'rgba(255, 255, 255, 0.5)',
                borderLeftColor: 'rgba(255, 255, 255, 0.3)',
                borderRightColor: 'rgba(255, 255, 255, 0.15)',
                borderBottomColor: 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          />
          
          {/* Outer Border */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 18,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: 'rgba(255, 255, 255, 0.4)',
              },
            ]}
          />

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  popover: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 24,
    // Enhanced glass depth shadow
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.4)' : '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});