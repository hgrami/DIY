import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ChecklistItem } from '../../@types';

interface Props {
  item: ChecklistItem;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

interface MenuAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  destructive?: boolean;
  action: () => void;
}

export const ChecklistContextMenu: React.FC<Props> = ({
  item,
  visible,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Keyboard listeners to properly manage keyboard and bottom sheet interaction
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // With single snap point at 40%, ensure bottom sheet stays in position
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
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete();
            bottomSheetRef.current?.dismiss();
          },
        },
      ]
    );
  };

  const handleEdit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bottomSheetRef.current?.dismiss();
    onEdit();
  };

  const handleDuplicate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bottomSheetRef.current?.dismiss();
    onDuplicate();
  };

  const handleDismiss = () => {
    Keyboard.dismiss();
    onClose();
  };

  const actions: MenuAction[] = [
    {
      id: 'edit',
      title: 'Edit',
      icon: '✏️',
      color: '#4CAF50',
      action: handleEdit,
    },
    {
      id: 'duplicate',
      title: 'Duplicate',
      icon: '📋',
      color: '#2196F3',
      action: handleDuplicate,
    },
    {
      id: 'delete',
      title: 'Delete',
      icon: '🗑️',
      color: '#F44336',
      destructive: true,
      action: handleDelete,
    },
  ];

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
      snapPoints={['60%']}
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
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {item.completed ? 'Completed' : 'Pending'}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={ZoomIn.delay(100 + index * 50).springify()}
                exiting={FadeOut.duration(100)}
              >
                <TouchableOpacity
                  style={[
                    styles.actionItem,
                    index === actions.length - 1 && styles.lastActionItem,
                    action.destructive && styles.destructiveAction,
                  ]}
                  onPress={action.action}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIcon}>
                    <Text style={styles.actionIconText}>{action.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.actionTitle,
                      action.destructive && styles.destructiveActionTitle,
                    ]}
                  >
                    {action.title}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomSheetButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Keyboard.dismiss();
              bottomSheetRef.current?.dismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    minHeight: 200,
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
  header: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  destructiveAction: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  destructiveActionTitle: {
    color: '#EF4444',
  },
  bottomSheetButtons: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  cancelButton: {
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});