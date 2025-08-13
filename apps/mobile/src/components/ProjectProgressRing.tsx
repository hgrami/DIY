import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

interface ProjectProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  label?: string;
  icon?: string;
}

export const ProjectProgressRing: React.FC<ProjectProgressRingProps> = ({
  progress,
  size = 80,
  color = '#667eea',
  backgroundColor = 'rgba(255,255,255,0.15)',
  showText = true,
  label = 'Progress',
  icon = 'target',
}) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress / 100, {
      duration: 1000,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedProgress.value,
      [0, 1],
      [0.8, 1]
    );
    return {
      transform: [{ scale }],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    const width = interpolate(
      animatedProgress.value,
      [0, 1],
      [0, size - 20]
    );
    return {
      width,
    };
  });

  return (
    <View style={[styles.container, { width: size + 20, height: size + 20 }]}>
      <Animated.View style={[styles.fallbackContainer, { width: size, height: size }, animatedStyle]}>
        <View style={[styles.fallbackRing, { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderWidth: 4,
          borderColor: backgroundColor,
        }]}>
          <View style={styles.centerContent}>
            <Feather name={icon as any} size={size * 0.25} color="#FFFFFF" />
            {showText && (
              <Text style={[styles.progressText, { fontSize: size * 0.15, color: '#FFFFFF' }]}>
                {Math.round(progress)}%
              </Text>
            )}
          </View>
          
          {/* Progress overlay */}
          <View style={[styles.progressOverlay, { 
            width: size - 8, 
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderWidth: 3,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: progress > 25 ? color : 'transparent',
            borderBottomColor: progress > 50 ? color : 'transparent', 
            borderLeftColor: progress > 75 ? color : 'transparent',
          }]} />
        </View>
        
        {/* Progress bar indicator */}
        <View style={[styles.progressBarContainer, { width: size - 20, marginTop: 8 }]}>
          <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          <Animated.View 
            style={[styles.progressBar, { backgroundColor: color }, progressBarStyle]} 
          />
        </View>
      </Animated.View>
      
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 1000,
  },
  progressText: {
    fontWeight: '700',
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  fallbackContainer: {
    alignItems: 'center',
  },
  fallbackRing: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ProjectProgressRing;