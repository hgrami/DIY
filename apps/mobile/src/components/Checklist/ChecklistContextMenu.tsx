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
import { NativeModal } from '../NativeModal';
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
            handleDismiss();
          },
        },
      ]
    );
  };

  const handleEdit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleDismiss();
    onEdit();
  };

  const handleDuplicate = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleDismiss();
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


  return (
    <NativeModal
      isVisible={visible}
      onClose={handleDismiss}
      title={item.title}
      size="medium"
      allowSwipeToClose={true}
      headerComponent={
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.modalHeaderSubtitle}>
            {item.completed ? 'Completed' : 'Pending'}
          </Text>
        </View>
      }
    >
      <View style={styles.container}>

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
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  modalHeader: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 2,
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