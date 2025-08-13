import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AiChatFAB } from '../components/AiChatFAB';
import { AiChatModal } from '../components/AiChatModal';
import { CompactTabBar } from '../components/CompactTabBar';
import ProjectProgressRing from '../components/ProjectProgressRing';
import { AiChatTab } from '../components/AiChatTab';
import { ProjectSetupModal } from '../components/ProjectSetupModal';
import { useAuthContext } from '../context/AuthContext';
import { Project, ProjectConfig } from '../@types';
import { apiService } from '../services/api';

interface ProjectScreenProps {
  route: {
    params: {
      shortId: string;
    };
  };
}

export const ProjectScreen: React.FC<ProjectScreenProps> = ({ route }) => {
  const { shortId } = route.params;
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'inspiration' | 'materials' | 'checklist' | 'notes' | 'photos' | 'ai'>('overview');
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);
  const [showProjectSetup, setShowProjectSetup] = useState(false);
  const [hasCheckedInterview, setHasCheckedInterview] = useState(false);

  useEffect(() => {
    loadProject();
  }, [shortId]);

  // Check if project needs interview setup
  useEffect(() => {
    if (project && !hasCheckedInterview) {
      const isPremiumUser = user?.subscriptionStatus && user.subscriptionStatus !== 'FREE';

      if (isPremiumUser) {
        const hasInterviewContext = project.interviewContext &&
          (project.interviewContext as any)?.completedAt;

        if (!hasInterviewContext) {
          // Small delay to ensure smooth loading transition
          setTimeout(() => {
            setShowProjectSetup(true);
          }, 500);
        }
      }

      setHasCheckedInterview(true);
    }
  }, [project, user?.subscriptionStatus, hasCheckedInterview]);

  const loadProject = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await apiService.get<Project>(`/api/projects/${shortId}`);
      if (response.success && response.data) {
        setProject(response.data);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      if (!isRefresh) { // Only show alert on initial load, not on refresh
        Alert.alert('Error', 'Failed to load project');
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleTabPress = async (tab: typeof activeTab) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleAiChatPress = () => {
    const isPremiumUser = user?.subscriptionStatus && user.subscriptionStatus !== 'FREE';

    if (!isPremiumUser) {
      Alert.alert(
        'Premium Feature',
        `AI Chat Assistant is available for premium users. Your current status: ${user?.subscriptionStatus || 'Unknown'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade', style: 'default', onPress: () => {
              // Navigate to subscription screen
              navigation.navigate('Subscription' as never);
            }
          }
        ]
      );
      return;
    }

    // Check if project has interview context
    if (project) {
      const hasInterviewContext = project.interviewContext &&
        (project.interviewContext as any)?.completedAt;

      if (!hasInterviewContext) {
        Alert.alert(
          'Complete Project Setup',
          'Please complete your project setup first to get the most personalized AI assistance.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Complete Setup', style: 'default', onPress: () => {
                setShowProjectSetup(true);
              }
            }
          ]
        );
        return;
      }
    }

    setAiChatVisible(true);
  };

  const handleStartNewChat = () => {
    setCurrentThreadId(undefined);
    setAiChatVisible(true);
  };

  const handleSelectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setAiChatVisible(true);
  };

  const handleProjectSetupComplete = () => {
    setShowProjectSetup(false);
    // Reload project to get updated interview context
    loadProject(true);
  };

  const getVisibleTabs = () => {
    const config = project?.config as ProjectConfig;
    const isPremiumUser = user?.subscriptionStatus && user.subscriptionStatus !== 'FREE';

    return [
      { id: 'overview', label: 'Overview', icon: 'home', visible: true },
      { id: 'inspiration', label: 'Inspiration', icon: 'heart', visible: config?.showInspiration !== false },
      { id: 'materials', label: 'Materials', icon: 'package', visible: config?.showMaterials !== false },
      { id: 'checklist', label: 'Tasks', icon: 'check-square', visible: config?.showChecklist !== false },
      { id: 'notes', label: 'Notes', icon: 'file-text', visible: config?.showNotes !== false },
      { id: 'photos', label: 'Photos', icon: 'image', visible: config?.showPhotos !== false },
      { id: 'ai', label: 'AI Chat', icon: 'message-circle', visible: !!isPremiumUser },
    ].filter(tab => tab.visible);
  };

  const renderOverview = () => {
    if (!project) return null;

    const completedTasks = project.checklistItems.filter(item => item.completed).length;
    const totalTasks = project.checklistItems.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const checkedMaterials = project.materials.filter(item => item.checked).length;
    const totalMaterials = project.materials.length;
    const materialsProgress = totalMaterials > 0 ? (checkedMaterials / totalMaterials) * 100 : 0;

    const daysUntilDeadline = project.deadline
      ? Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
      >
        {/* Project Header */}
        <Animated.View entering={FadeIn.delay(100).duration(400)}>
          <Card variant="glass">
            <Text style={styles.projectTitle}>{project.title}</Text>
            {project.goal && (
              <Text style={styles.projectGoal}>{project.goal}</Text>
            )}
            {project.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}
            {project.deadline && (
              <View style={styles.deadlineContainer}>
                <Feather name="calendar" size={16} color="#667eea" />
                <Text style={styles.projectDeadline}>
                  {new Date(project.deadline).toLocaleDateString()}
                  {daysUntilDeadline !== null && (
                    <Text style={styles.daysRemaining}>
                      {daysUntilDeadline > 0
                        ? ` (${daysUntilDeadline} days left)`
                        : daysUntilDeadline === 0
                          ? ' (Due today!)'
                          : ` (${Math.abs(daysUntilDeadline)} days overdue)`
                      }
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Progress Dashboard */}
        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <Card variant="highlighted">
            <Text style={styles.sectionTitle}>Progress Dashboard</Text>
            <View style={styles.progressGrid}>
              <ProjectProgressRing
                progress={progress}
                size={70}
                color="#667eea"
                label="Tasks"
                icon="check-circle"
              />
              <ProjectProgressRing
                progress={materialsProgress}
                size={70}
                color="#48BB78"
                label="Materials"
                icon="package"
              />
              <ProjectProgressRing
                progress={project.inspirationLinks.length > 0 ? 100 : 0}
                size={70}
                color="#ED8936"
                label="Research"
                icon="heart"
              />
            </View>
          </Card>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Card variant="glass">
            <Text style={styles.sectionTitle}>Project Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Feather name="heart" size={20} color="#ED8936" />
                </View>
                <Text style={styles.statNumber}>{project.inspirationLinks.length}</Text>
                <Text style={styles.statLabel}>Inspiration</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Feather name="package" size={20} color="#48BB78" />
                </View>
                <Text style={styles.statNumber}>{project.materials.length}</Text>
                <Text style={styles.statLabel}>Materials</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Feather name="check-square" size={20} color="#667eea" />
                </View>
                <Text style={styles.statNumber}>{project.checklistItems.length}</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Feather name="file-text" size={20} color="#9F7AEA" />
                </View>
                <Text style={styles.statNumber}>{project.notes.length}</Text>
                <Text style={styles.statLabel}>Notes</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Smart Insights */}
        {(progress === 100 || materialsProgress === 100 || daysUntilDeadline !== null) && (
          <Animated.View entering={FadeIn.delay(400).duration(400)}>
            <Card variant="elevated">
              <Text style={styles.sectionTitle}>Smart Insights</Text>
              <View style={styles.insightsContainer}>
                {progress === 100 && (
                  <View style={styles.insightItem}>
                    <Feather name="check-circle" size={16} color="#48BB78" />
                    <Text style={styles.insightText}>All tasks completed! 🎉</Text>
                  </View>
                )}
                {materialsProgress === 100 && (
                  <View style={styles.insightItem}>
                    <Feather name="package" size={16} color="#48BB78" />
                    <Text style={styles.insightText}>All materials ready!</Text>
                  </View>
                )}
                {daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline > 0 && (
                  <View style={styles.insightItem}>
                    <Feather name="clock" size={16} color="#F56565" />
                    <Text style={styles.insightText}>Deadline approaching - stay focused!</Text>
                  </View>
                )}
                {progress < 50 && totalTasks > 0 && (
                  <View style={styles.insightItem}>
                    <Feather name="trending-up" size={16} color="#667eea" />
                    <Text style={styles.insightText}>Keep up the momentum!</Text>
                  </View>
                )}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeIn.delay(500).duration(400)}>
          <Card variant="default">
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <Button
                title="Add Inspiration"
                onPress={() => setActiveTab('inspiration')}
                variant="outline"
              />
              <Button
                title="Add Materials"
                onPress={() => setActiveTab('materials')}
                variant="outline"
              />
              <Button
                title="Add Task"
                onPress={() => setActiveTab('checklist')}
                variant="outline"
              />
            </View>
          </Card>
        </Animated.View>

        {/* Bottom padding for FAB */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'inspiration':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card variant="glass">
              <View style={styles.emptyStateContainer}>
                <Feather name="heart" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>Find Your Inspiration</Text>
                <Text style={styles.emptyStateDescription}>
                  Discover ideas, tutorials, and examples for your project
                </Text>
                <Button
                  title="Browse Inspiration"
                  onPress={() => handleAiChatPress()}
                  variant="primary"
                />
              </View>
            </Card>
            {project && project.inspirationLinks.length > 0 && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>Your Inspiration ({project.inspirationLinks.length})</Text>
                <Text style={styles.placeholderText}>Inspiration list implementation coming soon</Text>
              </Card>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      case 'materials':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card variant="glass">
              <View style={styles.emptyStateContainer}>
                <Feather name="package" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>Materials & Tools</Text>
                <Text style={styles.emptyStateDescription}>
                  Keep track of everything you need for your project
                </Text>
                <Button
                  title="Generate Materials List"
                  onPress={() => handleAiChatPress()}
                  variant="primary"
                />
              </View>
            </Card>
            {project && project.materials.length > 0 && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>Your Materials ({project.materials.length})</Text>
                <Text style={styles.placeholderText}>Materials list implementation coming soon</Text>
              </Card>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      case 'checklist':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card variant="glass">
              <View style={styles.emptyStateContainer}>
                <Feather name="check-square" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>Project Tasks</Text>
                <Text style={styles.emptyStateDescription}>
                  Break down your project into manageable steps
                </Text>
                <Button
                  title="Create Task List"
                  onPress={() => handleAiChatPress()}
                  variant="primary"
                />
              </View>
            </Card>
            {project && project.checklistItems.length > 0 && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>Your Tasks ({project.checklistItems.length})</Text>
                <Text style={styles.placeholderText}>Task list implementation coming soon</Text>
              </Card>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      case 'notes':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card variant="glass">
              <View style={styles.emptyStateContainer}>
                <Feather name="file-text" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>Project Notes</Text>
                <Text style={styles.emptyStateDescription}>
                  Capture ideas, measurements, and important details
                </Text>
                <Button
                  title="Add First Note"
                  onPress={() => Alert.alert('Coming Soon', 'Notes feature will be available soon!')}
                  variant="primary"
                />
              </View>
            </Card>
            {project && project.notes.length > 0 && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>Your Notes ({project.notes.length})</Text>
                <Text style={styles.placeholderText}>Notes implementation coming soon</Text>
              </Card>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      case 'photos':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Card variant="glass">
              <View style={styles.emptyStateContainer}>
                <Feather name="image" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>Project Gallery</Text>
                <Text style={styles.emptyStateDescription}>
                  Document your progress with before, during, and after photos
                </Text>
                <Button
                  title="Add Photos"
                  onPress={() => Alert.alert('Coming Soon', 'Photo gallery feature will be available soon!')}
                  variant="primary"
                />
              </View>
            </Card>
            {project && project.photos.length > 0 && (
              <Card variant="default">
                <Text style={styles.sectionTitle}>Your Photos ({project.photos.length})</Text>
                <Text style={styles.placeholderText}>Photo gallery implementation coming soon</Text>
              </Card>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      case 'ai':
        const isPremiumUser = user?.subscriptionStatus && user.subscriptionStatus !== 'FREE';

        if (!isPremiumUser) {
          return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Card variant="highlighted">
                <View style={styles.emptyStateContainer}>
                  <Feather name="message-circle" size={48} color="#667eea" />
                  <Text style={styles.emptyStateTitle}>AI Project Assistant</Text>
                  <Text style={styles.emptyStateDescription}>
                    Get intelligent help and suggestions for your project
                  </Text>
                  <Button
                    title="Start AI Chat"
                    onPress={() => handleAiChatPress()}
                    variant="primary"
                  />
                </View>
              </Card>
              <View style={{ height: 100 }} />
            </ScrollView>
          );
        }

        // Check if project needs setup
        if (project) {
          const hasInterviewContext = project.interviewContext &&
            (project.interviewContext as any)?.completedAt;

          if (!hasInterviewContext) {
            return (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Card variant="highlighted">
                  <View style={styles.emptyStateContainer}>
                    <Feather name="settings" size={48} color="#667eea" />
                    <Text style={styles.emptyStateTitle}>Complete Project Setup</Text>
                    <Text style={styles.emptyStateDescription}>
                      Help us understand your project better to provide personalized AI assistance
                    </Text>
                    <Button
                      title="Complete Setup"
                      onPress={() => setShowProjectSetup(true)}
                      variant="primary"
                    />
                  </View>
                </Card>
                <View style={{ height: 100 }} />
              </ScrollView>
            );
          }
        }

        return project ? (
          <AiChatTab
            project={project}
            onStartChat={handleStartNewChat}
            onSelectThread={handleSelectThread}
            currentThreadId={currentThreadId}
          />
        ) : null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a1d3a', '#2d1b69', '#667eea']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!project) {
    return (
      <LinearGradient colors={['#1a1d3a', '#2d1b69', '#667eea']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Project not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1d3a', '#2d1b69', '#667eea']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project.title}
          </Text>
          {refreshing && (
            <Animated.View
              style={styles.refreshIndicator}
              entering={FadeIn}
              exiting={FadeOut}
            >
              <Feather name="refresh-cw" size={12} color="rgba(255,255,255,0.6)" />
            </Animated.View>
          )}
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Feather name="more-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <CompactTabBar
        tabs={getVisibleTabs()}
        activeTab={activeTab}
        onTabPress={(tabId) => setActiveTab(tabId as typeof activeTab)}
      />

      {/* Tab Content */}
      {renderTabContent()}

      {/* AI Chat FAB */}
      {project && (
        <AiChatFAB
          onPress={handleAiChatPress}
          visible={true}
          isPremium={user?.subscriptionStatus !== 'FREE'}
        />
      )}

      {/* AI Chat Modal */}
      {project && (
        <AiChatModal
          visible={aiChatVisible}
          onClose={() => setAiChatVisible(false)}
          project={project}
          onProjectUpdate={() => loadProject(true)}
          initialThreadId={currentThreadId}
        />
      )}

      {/* Project Setup Modal */}
      {project && (
        <ProjectSetupModal
          visible={showProjectSetup}
          projectId={project.id}
          projectShortId={project.shortId}
          onComplete={handleProjectSetupComplete}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  refreshIndicator: {
    marginLeft: 8,
    opacity: 0.6,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  projectGoal: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 10,
    fontWeight: '600',
    lineHeight: 22,
  },
  projectDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  projectDeadline: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  daysRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.95)',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  insightsContainer: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.3)',
  },
  insightText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    gap: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyStateDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    fontWeight: '400',
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
});