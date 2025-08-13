import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Props {
  onAddItem: (title: string) => Promise<{ success: boolean }> | { success: boolean } | void;
  disabled?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ChecklistFloatingButton: React.FC<Props> = ({ onAddItem, disabled = false }) => {
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePress = async () => {
    if (disabled) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Enhanced button press animation with bounce
    scale.value = withSpring(0.85, { 
      damping: 15,
      stiffness: 300
    }, (finished) => {
      if (finished) {
        scale.value = withSpring(1.1, { 
          damping: 12,
          stiffness: 200 
        }, (finished2) => {
          if (finished2) {
            scale.value = withSpring(1, { 
              damping: 15,
              stiffness: 300 
            });
          }
        });
      }
    });
    
    // Smooth rotation with overshoot
    rotation.value = withTiming(rotation.value + 225, { duration: 400 }, () => {
      rotation.value = withTiming(rotation.value - 45, { duration: 100 });
    });
    
    setShowInput(true);
  };

  const handleClose = () => {
    setShowInput(false);
    setInputText('');
  };

  const handleSubmit = async () => {
    const trimmedText = inputText.trim();
    if (trimmedText) {
      try {
        const result = await onAddItem(trimmedText);
        
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          // Success feedback
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Success animation - brief scale celebration
          scale.value = withSpring(1.2, { damping: 10, stiffness: 200 }, (finished) => {
            if (finished) {
              scale.value = withSpring(1, { damping: 10, stiffness: 200 });
            }
          });
          
          handleClose();
        } else {
          // Success feedback for void return (assume success)
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Success animation
          scale.value = withSpring(1.2, { damping: 10, stiffness: 200 }, (finished) => {
            if (finished) {
              scale.value = withSpring(1, { damping: 10, stiffness: 200 });
            }
          });
          
          handleClose();
        }
      } catch (error) {
        // Error feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('Error adding item:', error);
      }
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <>
      <AnimatedTouchableOpacity
        style={[
          styles.fab,
          disabled && styles.fabDisabled,
          animatedButtonStyle,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {/* Primary Glass Background Blur */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 20 : 15}
          tint={Platform.OS === 'ios' ? 'systemUltraThinMaterial' : 'light'}
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
              backgroundColor: disabled 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(76, 175, 80, 0.15)',
              borderRadius: 28,
            },
          ]}
        />
        
        {/* Glass Gradient Layer - Top to Bottom */}
        <LinearGradient
          colors={disabled ? [
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)', 
            'rgba(255, 255, 255, 0.02)',
            'rgba(0, 0, 0, 0.08)'
          ] : [
            'rgba(76, 175, 80, 0.4)',
            'rgba(76, 175, 80, 0.2)', 
            'rgba(76, 175, 80, 0.1)',
            'rgba(0, 0, 0, 0.08)'
          ]}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 28 }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        {/* Inner Highlight */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: 1,
              borderTopColor: disabled 
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.6)',
              borderLeftColor: disabled 
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.4)',
              borderRightColor: disabled 
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.2)',
              borderBottomColor: 'rgba(0, 0, 0, 0.1)',
            },
          ]}
        />
        
        {/* Outer Border */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: disabled 
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(255, 255, 255, 0.5)',
            },
          ]}
        />

        {/* Content */}
        <View style={styles.fabContent}>
          <Text style={[styles.fabIcon, disabled && styles.fabIconDisabled]}>+</Text>
        </View>
      </AnimatedTouchableOpacity>

      <Modal
        visible={showInput}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <AnimatedPressable
          style={styles.modalBackdrop}
          onPress={handleClose}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <Animated.View
            style={styles.inputContainer}
            entering={SlideInUp.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
          >
            <View style={styles.inputHeader}>
              <Text style={styles.inputTitle}>Add New Task</Text>
            </View>
            
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter task description..."
              placeholderTextColor="#999"
              multiline
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.glassButton]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                {/* Cancel Button Glass Layers */}
                <BlurView
                  intensity={Platform.OS === 'ios' ? 15 : 12}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                    },
                  ]}
                />
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0.2)',
                    'rgba(255, 255, 255, 0.05)',
                    'rgba(0, 0, 0, 0.05)'
                  ]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      borderRadius: 12,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  ]}
                />
                <View style={styles.buttonContent}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.glassButton,
                  !inputText.trim() && styles.addButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
              >
                {/* Add Button Glass Layers */}
                <BlurView
                  intensity={Platform.OS === 'ios' ? 15 : 12}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: !inputText.trim() 
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(76, 175, 80, 0.15)',
                      borderRadius: 12,
                    },
                  ]}
                />
                <LinearGradient
                  colors={!inputText.trim() ? [
                    'rgba(255, 255, 255, 0.1)',
                    'rgba(255, 255, 255, 0.05)',
                    'rgba(0, 0, 0, 0.05)'
                  ] : [
                    'rgba(76, 175, 80, 0.3)',
                    'rgba(76, 175, 80, 0.15)',
                    'rgba(0, 0, 0, 0.05)'
                  ]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      borderRadius: 12,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: !inputText.trim() 
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.4)',
                    },
                  ]}
                />
                <View style={styles.buttonContent}>
                  <Text
                    style={[
                      styles.addButtonText,
                      !inputText.trim() && styles.addButtonTextDisabled,
                    ]}
                  >
                    Add Task
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </AnimatedPressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.3)' : '#000',
    zIndex: 1000,
  },
  fabDisabled: {
    elevation: 6,
    shadowOpacity: 0.15,
  },
  fabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 28,
  },
  fabIconDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  inputHeader: {
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F9FA',
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  glassButton: {
    overflow: 'hidden',
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});