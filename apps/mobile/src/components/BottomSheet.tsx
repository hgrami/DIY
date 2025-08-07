import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '../hooks/useKeyboard';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showHandle?: boolean;
  avoidKeyboard?: boolean;
  keyboardBehavior?: 'height' | 'position' | 'padding';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BottomSheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
  children,
  actions,
  showHandle = true,
  avoidKeyboard = true,
  keyboardBehavior = 'height',
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();

  const handleBackdropPress = () => {
    onClose();
  };

  const modalContainerStyle = useMemo(() => {
    if (!avoidKeyboard || !keyboard.keyboardShown) {
      return [styles.modalContainer];
    }

    // Calculate maximum height when keyboard is visible
    const maxHeight = keyboard.availableHeight * 0.85; // 85% of available height
    return [
      styles.modalContainer,
      {
        maxHeight,
        marginBottom: insets.bottom,
      },
    ];
  }, [avoidKeyboard, keyboard.keyboardShown, keyboard.availableHeight, insets.bottom]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <AnimatedPressable
        style={styles.backdrop}
        onPress={handleBackdropPress}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? (keyboardBehavior as any) : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={insets.top + 10}
          enabled={avoidKeyboard}
        >
          <Animated.View
            style={modalContainerStyle}
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
          >
            {showHandle && <View style={styles.handle} />}

            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <View style={styles.content}>
              {children}
            </View>

            {actions && (
              <View style={styles.actionsContainer}>
                {actions}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </AnimatedPressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    minHeight: 280,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});