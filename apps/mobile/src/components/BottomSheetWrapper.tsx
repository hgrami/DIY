import React, { forwardRef, useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Keyboard, Platform, ScrollView, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';

interface ActionButtonProps {
  iconName: keyof typeof Feather.glyphMap;
  onAction: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  iconColor?: string;
  iconSize?: number;
}

interface BottomSheetWrapperProps {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
  snapPoints?: string[];
  enableKeyboardAvoidance?: boolean;
  title?: string;
  description?: string;
  footerComponent?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  actionButton?: ActionButtonProps;
}

export const BottomSheetWrapper = forwardRef<BottomSheetModal, BottomSheetWrapperProps>(
  ({
    children,
    isVisible,
    onClose,
    snapPoints = ['25%', '50%', '90%'],
    enableKeyboardAvoidance = true,
    title,
    description,
    footerComponent,
    contentContainerStyle,
    actionButton
  }, ref) => {
    const internalRef = useRef<BottomSheetModal>(null);
    const bottomSheetRef = ref || internalRef;

    // Memoize snap points to prevent unnecessary re-renders
    const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

    // Handle visibility changes
    useEffect(() => {
      console.log('BottomSheetWrapper visibility changed:', isVisible);
      if (typeof bottomSheetRef === 'function') return;

      if (isVisible) {
        console.log('Presenting BottomSheet');
        bottomSheetRef?.current?.present();
      } else {
        console.log('Dismissing BottomSheet');
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
        snapPoints={memoizedSnapPoints}
        enableDynamicSizing={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        enableBlurKeyboardOnGesture={true}
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        index={0}
        enableOverDrag={false}
        enableHandlePanningGesture={true}
        enableContentPanningGesture={true}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          {(title || true) && (
            <View style={styles.bottomSheetHeader}>
              {title && (
                <Text style={styles.bottomSheetTitle}>{title}</Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name="x"
                  size={24}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </TouchableOpacity>
            </View>
          )}
          {description && (
            <Text style={styles.bottomSheetDescription}>{description}</Text>
          )}
          <BottomSheetScrollView
            style={styles.bottomSheetInnerContent}
            contentContainerStyle={[
              styles.bottomSheetScrollContent,
              contentContainerStyle
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={false}
          >
            {children}
          </BottomSheetScrollView>
          {actionButton && (
            <View style={styles.bottomSheetActionButton}>
              <TouchableOpacity
                style={[
                  styles.fabButton,
                  actionButton.style,
                  actionButton.disabled && styles.fabButtonDisabled
                ]}
                onPress={actionButton.onAction}
                disabled={actionButton.disabled || actionButton.loading}
              >
                {actionButton.loading ? (
                  <View style={styles.fabLoadingContainer}>
                    <Text style={styles.fabLoadingText}>...</Text>
                  </View>
                ) : (
                  <Feather
                    name={actionButton.iconName}
                    size={actionButton.iconSize || 24}
                    color={actionButton.iconColor || '#FFFFFF'}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
          {footerComponent && (
            <View style={styles.bottomSheetButtons}>
              {footerComponent}
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

/* ───────────────────────── styles ───────────────────────── */
const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666',
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  bottomSheetDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  bottomSheetInnerContent: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120, // Extra padding for action button
  },
  bottomSheetActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabButtonDisabled: {
    backgroundColor: '#888',
    opacity: 0.7,
  },
  fabLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabLoadingText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  bottomSheetButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});