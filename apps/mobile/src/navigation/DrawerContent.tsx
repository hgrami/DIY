import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthContext } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';
import { ProjectNavigator } from '../components/ProjectNavigator';

export const DrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const { openCreateProjectModal } = useProjectContext();

  const handleDrawerItemPress = async (action: () => void) => {
    await Haptics.selectionAsync();
    action();
  };

  const handleCloseDrawer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    props.navigation.closeDrawer();
  };

  const handleNavigateToProject = (shortId: string) => {
    props.navigation.navigate('Project', { shortId });
    props.navigation.closeDrawer();
  };

  const handleCreateProject = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCreateProjectModal();
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCloseDrawer}
          style={styles.closeButton}
        >
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
          {user?.email || 'User'}
        </Text>
        <Text style={styles.userPlan}>
          Plan: {user?.subscriptionStatus || 'FREE'}
        </Text>
      </View>
      {/* Account Menu */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleDrawerItemPress(() => {
            props.navigation.navigate('Settings');
            props.navigation.closeDrawer();
          })}
        >
          <View style={styles.menuItemContent}>
            <Feather name="settings" size={20} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.menuItemText}>Settings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleDrawerItemPress(() => {
            props.navigation.navigate('Subscription');
            props.navigation.closeDrawer();
          })}
        >
          <View style={styles.menuItemContent}>
            <Feather name="credit-card" size={20} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.menuItemText}>
              {(!user?.subscriptionStatus || user?.subscriptionStatus === 'FREE')
                ? 'Upgrade Plan'
                : 'Manage Subscription'
              }
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Projects Navigator */}
      <View style={styles.projectsSection}>
        <Text style={styles.sectionTitle}>My Projects</Text>
        <ProjectNavigator
          onNavigate={handleNavigateToProject}
          onCreateProject={handleCreateProject}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  closeButton: {
    padding: 8,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  userPlan: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  drawerContent: {
    paddingTop: 0,
  },
  projectsSection: {
    flex: 1,
    paddingTop: 10,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 15,
    letterSpacing: 1,
    paddingHorizontal: 20,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 10,
  },
});