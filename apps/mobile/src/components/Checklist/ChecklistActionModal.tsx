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
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

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
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const inputRef = useRef<TextInput>(null);

  // Keyboard listeners to properly manage keyboard and bottom sheet interaction
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // With single snap point at 80%, ensure bottom sheet stays in position
        bottomSheetRef.current?.snapToIndex(0);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Keep the same position with single snap point
        bottomSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      // Small delay to allow bottom sheet to animate before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    } else {
      bottomSheetRef.current?.dismiss();
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

    // Dismiss keyboard first
    Keyboard.dismiss();
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bottomSheetRef.current?.dismiss();
    onSubmit(trimmedValue);
    setInputValue('');
    setIsValid(false);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
    setInputValue(initialValue);
    setIsValid(initialValue.trim().length > 0);
  };

  const handleDismiss = () => {
    setInputValue(initialValue);
    setIsValid(initialValue.trim().length > 0);
    Keyboard.dismiss();
    onClose();
  };

  const animatedInputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        onPress={() => {
          Keyboard.dismiss();
          bottomSheetRef.current?.dismiss();
        }}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['80%']}
      enableDynamicSizing={false}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetIndicator}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enablePanDownToClose={true}
      enableDismissOnClose={true}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={styles.bottomSheetContent}>
        <ScrollView
          style={styles.bottomSheetInnerContent}
          contentContainerStyle={styles.bottomSheetScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.bottomSheetTitle}>{title}</Text>
          
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
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomSheetContent: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 300,
  },
  bottomSheetInnerContent: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
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
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
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