import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  Keyboard,
  Dimensions 
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  initialText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
}

export const ChecklistInlineEditor: React.FC<Props> = ({
  initialText,
  onSave,
  onCancel,
  placeholder = 'Enter text...',
  maxLength = 200,
  multiline = false,
  autoFocus = true,
}) => {
  const [text, setText] = useState(initialText);
  const [isValid, setIsValid] = useState(true);
  const textInputRef = useRef<TextInput>(null);
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(1);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    setIsValid(newText.trim().length > 0);
    
    // Visual feedback for character limit
    const remaining = maxLength - newText.length;
    if (remaining < 20) {
      borderWidth.value = withSpring(remaining < 5 ? 3 : 2);
    } else {
      borderWidth.value = withSpring(1);
    }
  };

  const handleSave = async () => {
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsValid(false);
      
      // Shake animation for invalid input
      scale.value = withSpring(1.05, { duration: 100 }, () => {
        scale.value = withSpring(0.95, { duration: 100 }, () => {
          scale.value = withSpring(1, { duration: 100 });
        });
      });
      return;
    }

    if (trimmedText !== initialText) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Success animation
      scale.value = withSpring(1.05, { duration: 150 }, () => {
        scale.value = withSpring(1, { duration: 150 });
      });
    }

    onSave(trimmedText);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Cancel animation
    scale.value = withSpring(0.98, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 150 });
    });

    onCancel();
  };

  const handleKeyboardSubmit = () => {
    if (isValid) {
      handleSave();
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedInputStyle = useAnimatedStyle(() => ({
    borderWidth: borderWidth.value,
    borderColor: withTiming(
      !isValid 
        ? 'rgba(244, 67, 54, 0.8)' 
        : text.length > maxLength * 0.8 
          ? 'rgba(255, 193, 7, 0.8)' 
          : 'rgba(76, 175, 80, 0.6)',
      { duration: 200 }
    ),
  }));

  const remainingChars = maxLength - text.length;
  const showCharCount = text.length > maxLength * 0.7;

  return (
    <Animated.View 
      style={[styles.container, animatedContainerStyle]}
      entering={FadeIn.duration(200).springify()}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.inputContainer}>
        <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              multiline && styles.multilineInput,
              !isValid && styles.invalidInput,
            ]}
            value={text}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            maxLength={maxLength}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            returnKeyType={multiline ? 'default' : 'done'}
            onSubmitEditing={!multiline ? handleKeyboardSubmit : undefined}
            blurOnSubmit={!multiline}
            autoCorrect={true}
            autoCapitalize="sentences"
            selectionColor="rgba(76, 175, 80, 0.6)"
          />
        </Animated.View>

        {showCharCount && (
          <Animated.View 
            style={styles.charCountContainer}
            entering={SlideInRight.duration(200)}
            exiting={SlideOutLeft.duration(150)}
          >
            <Text style={[
              styles.charCountText,
              remainingChars < 10 && styles.charCountWarning,
              remainingChars < 0 && styles.charCountError,
            ]}>
              {remainingChars < 0 ? 'Too long!' : `${remainingChars} left`}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.saveButton,
            !isValid && styles.disabledButton,
          ]}
          onPress={handleSave}
          activeOpacity={isValid ? 0.7 : 1}
          disabled={!isValid}
        >
          <Text style={[
            styles.saveButtonText,
            !isValid && styles.disabledButtonText,
          ]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  invalidInput: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  charCountWarning: {
    color: 'rgba(255, 193, 7, 0.9)',
  },
  charCountError: {
    color: 'rgba(244, 67, 54, 0.9)',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});