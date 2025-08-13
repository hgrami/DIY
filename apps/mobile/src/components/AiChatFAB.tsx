import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AiChatFABProps {
  onPress: () => void;
  visible?: boolean;
  isPremium?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const AiChatFAB: React.FC<AiChatFABProps> = ({
  onPress,
  visible = true,
  isPremium = false,
}) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    opacity.value = withSpring(visible ? 1 : 0, {
      damping: 20,
      stiffness: 150,
    });
  }, [visible]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate press with bounce and rotation
    scale.value = withSequence(
      withSpring(0.85, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    rotate.value = withSequence(
      withTiming(15, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
    
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotate.value}deg` }
      ],
      opacity: opacity.value,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const iconScale = interpolate(
      scale.value,
      [0.85, 1],
      [0.9, 1],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ scale: iconScale }],
    };
  });

  if (!visible) return null;

  return (
    <AnimatedTouchableOpacity
      style={[styles.fab, animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityLabel="AI Chat Assistant"
      accessibilityHint="Open AI chat to get help with your project"
    >
      <LinearGradient
        colors={isPremium ? ['#667eea', '#764ba2'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Animated.View style={iconAnimatedStyle}>
            <Feather 
              name="message-circle" 
              size={24} 
              color={isPremium ? "#FFFFFF" : "rgba(255,255,255,0.9)"} 
            />
          </Animated.View>
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Feather name="star" size={12} color="#FFD700" />
            </View>
          )}
        </View>
      </LinearGradient>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});