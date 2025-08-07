import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  translateX: Animated.SharedValue<number>;
  onComplete?: () => void;
  onDelete?: () => void;
  isCompleted?: boolean;
  showComplete?: boolean;
  showDelete?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_THRESHOLD = 80;
const MAX_SWIPE = 120;

export const ChecklistSwipeActions: React.FC<Props> = ({
  translateX,
  onComplete,
  onDelete,
  isCompleted = false,
  showComplete = true,
  showDelete = true,
}) => {
  const handleCompleteAction = async () => {
    if (onComplete) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onComplete();
    }
  };

  const handleDeleteAction = async () => {
    if (onDelete) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onDelete();
    }
  };

  // Left swipe actions (complete)
  const leftActionsStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [0, ACTION_THRESHOLD, MAX_SWIPE],
      [0.8, 1, 1.1],
      'clamp'
    );

    const opacity = interpolate(
      translateX.value,
      [0, 20, ACTION_THRESHOLD],
      [0, 0.3, 1],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const leftActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, 20, ACTION_THRESHOLD, MAX_SWIPE],
      ['transparent', 'rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.3)']
    );

    return { backgroundColor };
  });

  // Right swipe actions (delete)
  const rightActionsStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-MAX_SWIPE, -ACTION_THRESHOLD, 0],
      [1.1, 1, 0.8],
      'clamp'
    );

    const opacity = interpolate(
      translateX.value,
      [-ACTION_THRESHOLD, -20, 0],
      [1, 0.3, 0],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rightActionBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [-MAX_SWIPE, -ACTION_THRESHOLD, -20, 0],
      ['rgba(244, 67, 54, 0.3)', 'rgba(244, 67, 54, 0.2)', 'rgba(244, 67, 54, 0.1)', 'transparent']
    );

    return { backgroundColor };
  });

  return (
    <>
      {/* Left actions (Complete) */}
      {showComplete && !isCompleted && (
        <Animated.View style={[styles.leftActions, leftActionBackgroundStyle]}>
          <Animated.View style={leftActionsStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCompleteAction}
              activeOpacity={0.7}
            >
              <Text style={styles.completeIcon}>✓</Text>
              <Text style={styles.actionText}>Complete</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* Right actions (Delete) */}
      {showDelete && (
        <Animated.View style={[styles.rightActions, rightActionBackgroundStyle]}>
          <Animated.View style={rightActionsStyle}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeleteAction}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  leftActions: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: MAX_SWIPE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: -1,
  },
  rightActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: MAX_SWIPE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: -1,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 60,
  },
  completeIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  deleteIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});