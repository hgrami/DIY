import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { UserDropdown } from '../components/UserDropdown';
import { GlassMenuButton } from '../components/GlassUI';
import { UserMenuContent } from '../components/UserMenu/UserMenuContent';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { AuthenticatedStackParamList } from '../@types';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ProgressiveSearchModal } from '../components/Search';
import { DIYSearchResult } from '../services/searchService';

type HomeScreenNavigationProp = DrawerNavigationProp<AuthenticatedStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuthContext();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [glassMenuOpen, setGlassMenuOpen] = useState(false);

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


  const handleSearchPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);


    // Temporarily allow all users to test API
    if (user?.subscriptionStatus === 'FREE') {
      Alert.alert(
        'Premium Feature',
        'Search is only available for Premium users. Upgrade your plan to access search functionality.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Subscription')
          }
        ]
      );
      return;
    }
    setSearchVisible(true);

  };

  const handleSearchResultSelect = async (result: DIYSearchResult) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      Alert.alert(
        'Open Resource',
        `Open "${result.title}" in your browser?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL(result.url);
                if (canOpen) {
                  await Linking.openURL(result.url);
                } else {
                  Alert.alert('Error', 'Cannot open this link');
                }
              } catch (error) {
                console.error('Failed to open URL:', error);
                Alert.alert('Error', 'Failed to open link');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to handle search result:', error);
    }

    setSearchVisible(false);
  };

  return (
    <>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />

        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <Card 
            variant="elevated"
            enableDynamicContrast={true}
            enableMotionEffects={true}
            enableSpecularHighlights={true}
            performanceMode="balanced"
          >
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              {user?.email || 'User'}
            </Text>
            <Text style={styles.subscriptionStatus}>
              Current Plan: {user?.subscriptionStatus || 'FREE'}
            </Text>
          </Card>

          {/* Quick Actions */}
          <Card
            variant="default"
            enableDynamicContrast={true}
            enableMotionEffects={true}
            enableSpecularHighlights={true}
            performanceMode="balanced"
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <Button
                title="Search DIY Resources"
                onPress={handleSearchPress}
                variant="primary"
                enableDynamicContrast={true}
                enableMotionEffects={true}
                enableSpecularHighlights={true}
                performanceMode="balanced"
              />
              <Button
                title="My Projects"
                onPress={() => navigation.navigate('Projects' as any)}
                variant="outline"
              />
              <Button
                title="Upgrade Plan"
                onPress={() => navigation.navigate('Subscription')}
                variant="secondary"
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

        {/* Floating Top Buttons */}
        <TouchableOpacity
          style={styles.floatingHamburgerButton}
          onPress={handleDrawerToggle}
        >
          <Feather name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.floatingUserButton}>
          <GlassMenuButton
            text={user?.email?.charAt(0).toUpperCase() || 'U'}
            popoverPosition="bottom-left"
            popoverWidth={320}
            popoverHeight={320}
            isOpen={glassMenuOpen}
            onOpenChange={(open) => {
              console.log('GlassMenuButton onOpenChange:', open);
              setGlassMenuOpen(open);
            }}
            renderPopover={() => (
              <UserMenuContent
                user={user}
                onSettingsPress={() => navigation.navigate('Settings')}
                onSubscriptionPress={() => navigation.navigate('Subscription')}
                onLogout={handleLogout}
                onClose={() => {
                  console.log('UserMenuContent onClose called');
                  setGlassMenuOpen(false);
                }}
              />
            )}
          />
        </View>

        {/* Legacy User Dropdown - Keep for backward compatibility but hidden when glass menu is active */}
        {!glassMenuOpen && (
          <UserDropdown
            user={user}
            isVisible={dropdownVisible}
            onClose={() => setDropdownVisible(false)}
            onSettingsPress={() => navigation.navigate('Settings')}
            onSubscriptionPress={() => navigation.navigate('Subscription')}
            onLogout={handleLogout}
          />
        )}
      </LinearGradient>

      {/* Search Modal - outside LinearGradient */}
      <ProgressiveSearchModal
        isVisible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onResultSelect={handleSearchResultSelect}
        onProjectCreated={(projectShortId) => {
          setSearchVisible(false);
        }}
        initialQuery=""
        initialResourceType="tutorial"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80, // Add space for floating buttons
    paddingBottom: 20,
  },
  floatingHamburgerButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingUserButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
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