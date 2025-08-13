import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CustomBottomSheet } from '../CustomBottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  title: string;
  submitButtonText?: string;
}

export const ChecklistActionModal: React.FC<Props> = ({
  visible,
  onClose,
  initialValue = '',
  placeholder = 'Enter text...',
  onSubmit,
  title,
  submitButtonText = 'Save',
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isValid, setIsValid] = useState(initialValue.trim().length > 0);
  const scale = useSharedValue(1);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 450);
    }
  }, [visible]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setIsValid(text.trim().length > 0);
  };

  const handleSubmit = async () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Shake animation for invalid input
      scale.value = withSpring(1.05, { duration: 100 }, () => {
        scale.value = withSpring(0.95, { duration: 100 }, () => {
          scale.value = withSpring(1, { duration: 100 });
        });
      });
      return;
    }

    Keyboard.dismiss();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(trimmedValue);
    setInputValue('');
    setIsValid(false);
    onClose();
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setInputValue(initialValue);
    setIsValid(initialValue.trim().length > 0);
    onClose();
  };

  const animatedInputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const footer = (
    <View style={styles.bottomSheetButtons}>
      <TouchableOpacity
        style={[styles.bottomSheetButton, styles.bottomSheetCancelButton]}
        onPress={handleCancel}
        activeOpacity={0.7}
      >
        <Text style={styles.bottomSheetCancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.bottomSheetButton,
          styles.submitButton,
          !isValid && styles.disabledButton,
        ]}
        onPress={handleSubmit}
        activeOpacity={isValid ? 0.7 : 1}
        disabled={!isValid}
      >
        <Text style={[
          styles.submitButtonText,
          !isValid && styles.disabledButtonText,
        ]}>
          {submitButtonText}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <CustomBottomSheet
      visible={visible}
      onClose={handleCancel}
      title={title}
      snapPoints={["55%", "75%", "90%"]}
      footer={footer}
    >
      <ScrollView
        style={styles.bottomSheetInnerContent}
        contentContainerStyle={styles.bottomSheetScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animatedInputStyle}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              !isValid && styles.invalidInput,
            ]}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            autoFocus={false}
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSubmit();
            }}
            selectionColor="rgba(76, 175, 80, 0.6)"
          />
        </Animated.View>
      </ScrollView>
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetInnerContent: { flex: 1 },
  bottomSheetScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 56,
    marginBottom: 24,
  },
  invalidInput: {
    borderColor: 'rgba(244, 67, 54, 0.8)',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  bottomSheetButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  bottomSheetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  bottomSheetCancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bottomSheetCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  submitButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});