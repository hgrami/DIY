import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { UserDropdown } from '../components/UserDropdown';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { AuthenticatedStackParamList } from '../@types';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Checklist } from '../components/Checklist/Checklist';

type HomeScreenNavigationProp = DrawerNavigationProp<AuthenticatedStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuthContext();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDrawerToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.openDrawer();
  };

  const handleAvatarPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDropdownVisible(true);
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={handleDrawerToggle}
        >
          <Feather name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={handleAvatarPress}
        >
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <Card variant="elevated">
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeSubtitle}>
            {user?.email || 'User'}
          </Text>
          <Text style={styles.subscriptionStatus}>
            Current Plan: {user?.subscriptionStatus || 'FREE'}
          </Text>
        </Card>

        <Checklist
          checklistName="My Daily Tasks"
          type="api"
          showHeader
          density="compact"
          useFloatingButton
          enableStats
          enableSwipeActions
        />
        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button
              title="My Projects"
              onPress={() => navigation.navigate('Projects' as any)}
              variant="outline"
            />
            <Button
              title="Upgrade Plan"
              onPress={() => {/* Navigate to subscription */ }}
              variant="primary"
              size="medium"
              style={styles.actionButton}
            />
            <Button
              title="View Analytics"
              onPress={() => {/* Navigate to analytics */ }}
              variant="outline"
              size="medium"
              style={styles.actionButton}
            />
          </View>
        </Card>

        {/* Recent Activity */}
        <Card>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>Last login: Today</Text>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>Plan: {user?.subscriptionStatus}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* User Dropdown */}
      <UserDropdown
        user={user}
        isVisible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onSettingsPress={() => navigation.navigate('Settings')}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogout={handleLogout}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  hamburgerButton: {
    padding: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: 12,
  },
  activityText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  logoutButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});