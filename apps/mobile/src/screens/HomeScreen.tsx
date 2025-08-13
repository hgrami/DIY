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

        {/* Coming Soon Banner */}
        <Card>
          <View style={styles.comingSoonContainer}>
            <Feather name="clock" size={20} color="#FFA726" />
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          </View>
          <Text style={styles.comingSoonText}>
            Advanced analytics, team collaboration, and AI-powered project insights are on the way!
          </Text>
        </Card>

        {/* Favorite Projects */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Projects</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={16} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>
          <View style={styles.projectsContainer}>
            <View style={styles.projectCard}>
              <View style={styles.projectIcon}>
                <Feather name="star" size={16} color="#FFA726" />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>Kitchen Renovation</Text>
                <Text style={styles.projectProgress}>75% Complete</Text>
              </View>
            </View>
            <View style={styles.projectCard}>
              <View style={styles.projectIcon}>
                <Feather name="star" size={16} color="#FFA726" />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>Garden Landscaping</Text>
                <Text style={styles.projectProgress}>30% Complete</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addProjectCard}>
              <Feather name="plus" size={20} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.addProjectText}>Add to Favorites</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Recent Projects */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Projects</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Feather name="chevron-right" size={16} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>
          <View style={styles.projectsContainer}>
            <View style={styles.projectCard}>
              <View style={styles.projectIcon}>
                <Feather name="tool" size={16} color="#4FC3F7" />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>Bathroom Upgrade</Text>
                <Text style={styles.projectProgress}>Last edited: 2 hours ago</Text>
              </View>
            </View>
            <View style={styles.projectCard}>
              <View style={styles.projectIcon}>
                <Feather name="home" size={16} color="#81C784" />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>Living Room Paint</Text>
                <Text style={styles.projectProgress}>Last edited: Yesterday</Text>
              </View>
            </View>
            <View style={styles.projectCard}>
              <View style={styles.projectIcon}>
                <Feather name="settings" size={16} color="#FFB74D" />
              </View>
              <View style={styles.projectInfo}>
                <Text style={styles.projectTitle}>Deck Repair</Text>
                <Text style={styles.projectProgress}>Last edited: 3 days ago</Text>
              </View>
            </View>
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
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA726',
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 4,
  },
  projectsContainer: {
    gap: 12,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  projectProgress: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addProjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  addProjectText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
    fontWeight: '500',
  },
});