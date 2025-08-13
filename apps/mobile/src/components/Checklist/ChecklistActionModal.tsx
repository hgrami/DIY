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
import { NativeModal } from '../NativeModal';
import { Button } from '../Button';

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
    <View style={styles.buttonRow}>
      <Button
        title="Cancel"
        onPress={handleCancel}
        variant="outline"
        style={{ flex: 1 }}
      />
      <Button
        title={submitButtonText}
        onPress={handleSubmit}
        variant="primary"
        disabled={!isValid}
        style={{ flex: 1 }}
      />
    </View>
  );

  return (
    <NativeModal
      isVisible={visible}
      onClose={handleCancel}
      title={title}
      size="small"
      allowSwipeToClose={true}
      footerComponent={footer}
      disableScrollView={true}
    >
      <View style={styles.container}>
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
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 8,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});