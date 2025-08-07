import React, { forwardRef, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Keyboard, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

interface BottomSheetWrapperProps {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  snapPoints?: string[];
  enableKeyboardAvoidance?: boolean;
  keyboardBehavior?: 'height' | 'position' | 'padding';
  title?: string;
}

export const BottomSheetWrapper = forwardRef<BottomSheetModal, BottomSheetWrapperProps>(
  ({ 
    children, 
    isVisible, 
    onClose, 
    snapPoints = ['80%'],
    enableKeyboardAvoidance = true,
    keyboardBehavior = 'height',
    title
  }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    const bottomSheetRef = ref || internalRef;

    // Keyboard listeners to properly manage keyboard and bottom sheet interaction
    useEffect(() => {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        () => {
          // With single snap point, ensure bottom sheet stays in position
          if (typeof bottomSheetRef !== 'function' && bottomSheetRef?.current) {
            bottomSheetRef.current.snapToIndex(0);
          }
        }
      );
      const keyboardWillHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          // Keep the same position with single snap point
          if (typeof bottomSheetRef !== 'function' && bottomSheetRef?.current) {
            bottomSheetRef.current.snapToIndex(0);
          }
        }
      );

      return () => {
        keyboardWillShowListener.remove();
        keyboardWillHideListener.remove();
      };
    }, [bottomSheetRef]);

    // Handle visibility changes
    useEffect(() => {
      if (typeof bottomSheetRef === 'function') return;
      
      if (isVisible) {
        bottomSheetRef?.current?.present();
      } else {
        bottomSheetRef?.current?.dismiss();
      }
    }, [isVisible, bottomSheetRef]);

    const handleDismiss = () => {
      Keyboard.dismiss();
      onClose();
    };

    const renderBackdrop = React.useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={() => {
            Keyboard.dismiss();
            if (typeof bottomSheetRef !== 'function' && bottomSheetRef?.current) {
              bottomSheetRef.current.dismiss();
            }
          }}
        />
      ),
      [bottomSheetRef]
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        keyboardBehavior={enableKeyboardAvoidance ? "extend" : "fillParent"}
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
            {title && (
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
              </View>
            )}
            
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.gradient}
            >
              {children}
            </LinearGradient>
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

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
    minHeight: 200,
  },
  bottomSheetInnerContent: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  header: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  gradient: {
    flex: 1,
    minHeight: 100,
  },
});