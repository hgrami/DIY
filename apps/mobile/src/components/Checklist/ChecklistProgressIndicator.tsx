import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  completed: number;
  total: number;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const SIZE_CONFIGS = {
  small: { diameter: 60, strokeWidth: 4, fontSize: 12 },
  medium: { diameter: 80, strokeWidth: 6, fontSize: 14 },
  large: { diameter: 100, strokeWidth: 8, fontSize: 16 },
};

export const ChecklistProgressIndicator: React.FC<Props> = ({
  completed,
  total,
  showPercentage = true,
  size = 'medium',
  color = '#4CAF50',
}) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  
  const config = SIZE_CONFIGS[size];
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const targetProgress = total > 0 ? completed / total : 0;

  useEffect(() => {
    // Celebrate completion with haptic and animation
    const triggerCelebration = () => {
      if (percentage === 100 && completed > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        scale.value = withSpring(1.1, { damping: 10, stiffness: 150 }, (finished) => {
          if (finished) {
            scale.value = withSpring(1, { damping: 10, stiffness: 150 });
          }
        });
      }
    };

    // Animate progress change
    progress.value = withSpring(targetProgress, {
      damping: 15,
      stiffness: 100
    }, (finished) => {
      if (finished) {
        runOnJS(triggerCelebration)();
      }
    });
  }, [completed, total, targetProgress, percentage, progress, scale]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 1], [0, config.diameter - 8]);
    return { width };
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: withTiming(total > 0 ? 1 : 0.5, { duration: 300 }),
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View style={[styles.progressContainer, { width: config.diameter, height: config.diameter }]}>
        {/* Background circle */}
        <View style={[
          styles.backgroundCircle, 
          { 
            width: config.diameter, 
            height: config.diameter,
            borderRadius: config.diameter / 2,
            borderWidth: config.strokeWidth
          }
        ]} />
        
        {/* Progress bar */}
        <View style={[styles.progressBarContainer, { width: config.diameter - 8, height: 6 }]}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { backgroundColor: color, height: 6, borderRadius: 3 },
              animatedProgressStyle
            ]} 
          />
        </View>
        
        {/* Center content */}
        <Animated.View style={[styles.centerContent, animatedTextStyle]}>
          {showPercentage ? (
            <Text style={[styles.percentageText, { fontSize: config.fontSize }]}>
              {percentage}%
            </Text>
          ) : (
            <Text style={[styles.fractionText, { fontSize: config.fontSize - 2 }]}>
              {completed}/{total}
            </Text>
          )}
          <Text style={styles.labelText}>
            {percentage === 100 ? 'Complete!' : 'Progress'}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  progressBar: {
    borderRadius: 3,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  fractionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  labelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});