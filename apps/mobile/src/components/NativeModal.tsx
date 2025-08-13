import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
  Pressable,
  Keyboard,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassButton } from './GlassButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HANDLE_HEIGHT = 48; // Enlarged for easier grabbing

type ModalSize = 'small' | 'medium' | 'full';

interface NativeModalProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  backgroundColor?: string;
  allowSwipeToClose?: boolean;
  disableScrollView?: boolean;
  size?: ModalSize;
}

export const NativeModal: React.FC<NativeModalProps> = ({
  isVisible,
  onClose,
  title,
  children,
  showCloseButton = true,
  headerComponent,
  footerComponent,
  backgroundColor = '#2C2C2E',
  allowSwipeToClose = true,
  disableScrollView = false,
  size = 'full',
}) => {
  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const dragStartY = useSharedValue(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  // Base and target heights: prefer stable height, shrink only as needed for keyboard
  const statusBarHeight = insets.top || 0;
  const baseMaxHeight = SCREEN_HEIGHT - statusBarHeight; // ignore keyboard for preferred size
  const preferredHeight = useMemo(() => {
    switch (size) {
      case 'small':
        return baseMaxHeight * 0.25;
      case 'medium':
        return baseMaxHeight * 0.5;
      case 'full':
      default:
        return baseMaxHeight;
    }
  }, [baseMaxHeight, size]);

  const maxHeightWithKeyboard = baseMaxHeight - keyboardHeight; // max possible while sitting above keyboard
  const targetHeight = useMemo(() => {
    // Keep roughly same size, but never exceed available space
    const height = Math.min(preferredHeight, maxHeightWithKeyboard);
    return Math.max(56, height); // enforce a minimal sensible height
  }, [preferredHeight, maxHeightWithKeyboard]);

  // Animated shared values for smooth size/position transitions
  const animatedHeight = useSharedValue(targetHeight);
  const bottomOffset = useSharedValue(0);

  // Spring animation helper
  const springTo = useCallback((to: number) => {
    sheetY.value = withSpring(to, {
      damping: 20,
      stiffness: 200,
      mass: 0.8
    });
  }, [sheetY]);

  // Handle modal dismiss
  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    sheetY.value = withTiming(targetHeight, { duration: 300 });
    setTimeout(onClose, 300);
  }, [onClose, sheetY, targetHeight]);

  // Keyboard event listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Handle modal visibility changes
  useEffect(() => {
    if (isVisible) {
      // Initialize to off-screen (by its own height), then spring into place
      sheetY.value = targetHeight;
      animatedHeight.value = withSpring(targetHeight);
      bottomOffset.value = withTiming(keyboardHeight, { duration: 250 });
      springTo(0);
    } else {
      springTo(targetHeight);
    }
  }, [isVisible, targetHeight, springTo, animatedHeight, bottomOffset, keyboardHeight, sheetY]);

  // Adjust position when keyboard changes
  useEffect(() => {
    if (isVisible) {
      // Smoothly adjust both height and bottom offset when keyboard changes
      animatedHeight.value = withSpring(targetHeight);
      bottomOffset.value = withTiming(keyboardHeight, { duration: 250 });
      springTo(0);
    }
  }, [keyboardHeight, isVisible, springTo, targetHeight, animatedHeight, bottomOffset]);

  // Pan gesture for swipe to dismiss
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = sheetY.value;
    })
    .onUpdate((event) => {
      // Only allow downward movement (positive translationY)
      if (event.translationY >= 0) {
        const nextY = Math.max(0, dragStartY.value + event.translationY);
        sheetY.value = nextY;
      }
    })
    .onEnd((event) => {
      const translationY = event.translationY;
      const velocityY = event.velocityY;

      // Adjust dismiss threshold based on modal size
      const dismissThreshold = size === 'small' ? 0.4 : size === 'medium' ? 0.35 : 0.3;

      // Determine if should dismiss or snap back
      if (translationY > targetHeight * dismissThreshold || velocityY > 1000) {
        runOnJS(handleDismiss)();
      } else {
        // Snap back to original position
        springTo(0);
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetY.value }],
      height: animatedHeight.value,
      bottom: bottomOffset.value,
    };
  });

  const isKeyboardVisible = keyboardHeight > 0;
  const bottomRadius = size !== 'full' && !isKeyboardVisible ? 28 : 0;

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (allowSwipeToClose) {
      handleDismiss();
    }
  };

  // Handle haptic feedback
  const handleHapticFeedback = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <View style={styles.backdropOverlay} />
      </Pressable>

      {/* Modal Content */}
      <Animated.View style={[
        styles.sheet,
        size !== 'full' && styles.partialModal,
        animatedStyle,
        // Override bottom radii when keyboard is visible
        (isKeyboardVisible || size === 'full') && {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }
      ]}>
        {/* Primary Glass Background Blur */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 35 : 25}
          tint={Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'dark'}
          style={StyleSheet.absoluteFill}
        />

        {/* Secondary Blur Layer for Depth */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 20 : 15}
          tint="dark"
          style={[
            StyleSheet.absoluteFill,
            { opacity: 0.6 }
          ]}
        />

        {/* Base Glass Layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(28, 28, 30, 0.95)', // Darker, more solid background like Apple
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: bottomRadius,
              borderBottomRightRadius: bottomRadius,
            },
          ]}
        />

        {/* Inner Highlight */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: bottomRadius,
              borderBottomRightRadius: bottomRadius,
              borderWidth: 1.5,
              borderTopColor: 'rgba(255, 255, 255, 0.3)',
              borderLeftColor: 'rgba(255, 255, 255, 0.2)',
              borderRightColor: 'rgba(255, 255, 255, 0.2)',
              borderBottomColor: size !== 'full' && !isKeyboardVisible ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            },
          ]}
        />

        {/* Outer Border */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: bottomRadius,
              borderBottomRightRadius: bottomRadius,
              borderWidth: StyleSheet.hairlineWidth,
              borderTopColor: 'rgba(255, 255, 255, 0.4)',
              borderLeftColor: 'rgba(255, 255, 255, 0.4)',
              borderRightColor: 'rgba(255, 255, 255, 0.4)',
              borderBottomColor: size !== 'full' && !isKeyboardVisible ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
            },
          ]}
        />

        {/* Invisible swipe area for gesture detection - positioned to avoid header */}
        {allowSwipeToClose && (
          <GestureDetector gesture={panGesture}>
            <View style={styles.invisibleSwipeArea} />
          </GestureDetector>
        )}

        {/* Header */}
        {(title || headerComponent || showCloseButton) && (
          <View style={styles.header}>
            {headerComponent || (
              <>
                {title && (
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                {showCloseButton && (
                  <View style={styles.closeButton}>
                    <GlassButton
                      onPress={handleDismiss}
                      icon="x"
                      variant="transparent"
                      size={36}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Content */}
        {disableScrollView ? (
          <View style={[
            styles.contentWrapper,
            { paddingBottom: (footerComponent ? 96 : 24) + (insets.bottom || 0) }
          ]}>
            {children}
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: (footerComponent ? 96 : 24) + (insets.bottom || 0) }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        )}

        {/* Footer */}
        {footerComponent && (
          <View style={[
            styles.footer,
            { paddingBottom: (insets.bottom || 0) + 20 }
          ]}>
            {footerComponent}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 28, // More rounded like Apple
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.4)' : '#000',
    shadowOffset: {
      width: 0,
      height: -8, // Stronger shadow
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  partialModal: {
    marginHorizontal: 0, // Keep full width for consistency
    borderRadius: 28, // Round all corners for partial modals
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  invisibleSwipeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 80, // Leave space for close button (80px from right)
    height: 60, // Invisible area at top for swiping
    zIndex: 1, // Lower z-index than header content
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20, // Increased since no handle area
    paddingBottom: 16,
    zIndex: 10, // Ensure header content is above swipe area
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 40, // Space for close button
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20, // Adjusted for new header padding
    zIndex: 20, // Ensure close button is above everything
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 8,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.15)', // More vivid separator
  },
});