import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthUser } from '../../@types';

interface UserMenuContentProps {
  user: AuthUser | null;
  onSettingsPress: () => void;
  onSubscriptionPress: () => void;
  onLogout: () => void;
  onClose: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  isDestructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  color = '#FFFFFF',
  isDestructive = false,
}) => {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, isDestructive && styles.destructiveIconContainer]}>
        <Feather
          name={icon}
          size={18}
          color={isDestructive ? '#FF453A' : color}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, isDestructive && styles.destructiveText]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.itemSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      <Feather
        name="chevron-right"
        size={16}
        color="rgba(255, 255, 255, 0.4)"
      />
    </TouchableOpacity>
  );
};

export const UserMenuContent: React.FC<UserMenuContentProps> = ({
  user,
  onSettingsPress,
  onSubscriptionPress,
  onLogout,
  onClose,
}) => {
  const handleAction = (action: () => void) => {
    onClose();
    // Small delay to ensure menu closes before navigation
    setTimeout(action, 150);
  };

  const getSubscriptionDisplayName = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'FREE':
        return 'Free Plan';
      case 'BASIC':
        return 'Basic Plan';
      case 'PRO':
        return 'Pro Plan';
      case 'ENTERPRISE':
        return 'Enterprise Plan';
      default:
        return 'Free Plan';
    }
  };

  const getSubscriptionColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'FREE':
        return '#8E8E93';
      case 'BASIC':
        return '#30D158';
      case 'PRO':
        return '#007AFF';
      case 'ENTERPRISE':
        return '#AF52DE';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      {/* User Info Header */}
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email || 'User'}
          </Text>
          <View style={styles.subscriptionBadge}>
            <View
              style={[
                styles.subscriptionDot,
                { backgroundColor: getSubscriptionColor(user?.subscriptionStatus) }
              ]}
            />
            <Text style={styles.subscriptionText}>
              {getSubscriptionDisplayName(user?.subscriptionStatus)}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu Items */}
      <View style={styles.menuItems}>
        <MenuItem
          icon="settings"
          title="Settings"
          subtitle="App preferences and configuration"
          onPress={() => handleAction(onSettingsPress)}
          color="#64748B"
        />

        <MenuItem
          icon="credit-card"
          title="Subscription"
          subtitle={user?.subscriptionStatus === 'FREE' ? 'Upgrade to unlock premium features' : 'Manage your subscription'}
          onPress={() => handleAction(onSubscriptionPress)}
          color="#667eea"
        />

        <MenuItem
          icon="log-out"
          title="Sign Out"
          onPress={() => handleAction(onLogout)}
          isDestructive
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subscriptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  menuItems: {
    flex: 1,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveIconContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#FF453A',
  },
  itemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
});