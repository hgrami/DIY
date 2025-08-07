import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { AuthUser } from '../@types';

interface UserDropdownProps {
  user: AuthUser | null;
  isVisible: boolean;
  onClose: () => void;
  onSettingsPress: () => void;
  onSubscriptionPress: () => void;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  isVisible,
  onClose,
  onSettingsPress,
  onSubscriptionPress,
  onLogout,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleBackdropPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSettingsPress = async () => {
    await Haptics.selectionAsync();
    onClose();
    onSettingsPress();
  };

  const handleSubscriptionPress = async () => {
    await Haptics.selectionAsync();
    onClose();
    onSubscriptionPress();
  };

  const handleLogoutPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    onLogout();
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
        <Animated.View 
          style={[
            styles.dropdown,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.96)', 'rgba(0, 0, 0, 0.92)']}
            style={styles.gradient}
          >
            {/* User Info Header */}
            <View style={styles.userHeader}>
              <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
                {user?.email || 'User'}
              </Text>
              <View style={styles.planContainer}>
                <View style={styles.planDot} />
                <Text style={styles.userPlan}>
                  {user?.subscriptionStatus || 'FREE'}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Menu Items */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed
              ]}
              onPress={handleSettingsPress}
            >
              <View style={styles.menuItemContent}>
                <Feather name="settings" size={18} color="#FFFFFF" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
            </Pressable>

            {/* Manage Subscription - Available for all users */}
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed
              ]}
              onPress={handleSubscriptionPress}
            >
              <View style={styles.menuItemContent}>
                <Feather name="credit-card" size={18} color="#FFFFFF" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Manage Subscription</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            {/* Sign Out Link */}
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed
              ]}
              onPress={handleLogoutPress}
            >
              <View style={styles.menuItemContent}>
                <Feather name="log-out" size={18} color="#FF6B6B" style={styles.menuIcon} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </View>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    minWidth: 300,
    maxWidth: 320,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  gradient: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  userHeader: {
    marginBottom: 14,
  },
  userEmail: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
  },
  userPlan: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 10,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  signOutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});