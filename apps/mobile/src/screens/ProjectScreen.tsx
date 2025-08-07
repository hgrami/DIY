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
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuthContext } from '../context/AuthContext';
import { Project, ProjectConfig } from '../@types';
import { apiClient } from '../services/apiClient';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'inspiration' | 'materials' | 'checklist' | 'notes' | 'photos' | 'ai'>('overview');

  useEffect(() => {
    loadProject();
  }, [shortId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/projects/${shortId}`);
      if (response.data.success) {
        setProject(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = async (tab: typeof activeTab) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const renderTabButton = (tab: typeof activeTab, icon: string, label: string) => {
    const isActive = activeTab === tab;
    const config = project?.config as ProjectConfig;
    
    // Check if this tab should be visible based on project config
    if (tab === 'ai' && !config?.aiEnabled) return null;
    if (tab === 'inspiration' && !config?.showInspiration) return null;
    if (tab === 'materials' && !config?.showMaterials) return null;
    if (tab === 'checklist' && !config?.showChecklist) return null;
    if (tab === 'notes' && !config?.showNotes) return null;
    if (tab === 'photos' && !config?.showPhotos) return null;

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => handleTabPress(tab)}
      >
        <Feather 
          name={icon as any} 
          size={20} 
          color={isActive ? '#667eea' : '#666'} 
        />
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOverview = () => {
    if (!project) return null;

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Header */}
        <Card variant="elevated">
          <Text style={styles.projectTitle}>{project.title}</Text>
          {project.goal && (
            <Text style={styles.projectGoal}>Goal: {project.goal}</Text>
          )}
          {project.description && (
            <Text style={styles.projectDescription}>{project.description}</Text>
          )}
          {project.deadline && (
            <Text style={styles.projectDeadline}>
              Deadline: {new Date(project.deadline).toLocaleDateString()}
            </Text>
          )}
        </Card>

        {/* Quick Stats */}
        <Card>
          <Text style={styles.sectionTitle}>Project Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{project.inspirationLinks.length}</Text>
              <Text style={styles.statLabel}>Inspiration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{project.materials.length}</Text>
              <Text style={styles.statLabel}>Materials</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{project.checklistItems.length}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{project.notes.length}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
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
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'inspiration':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Inspiration tab - Coming soon</Text>
          </View>
        );
      case 'materials':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Materials tab - Coming soon</Text>
          </View>
        );
      case 'checklist':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Checklist tab - Coming soon</Text>
          </View>
        );
      case 'notes':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Notes tab - Coming soon</Text>
          </View>
        );
      case 'photos':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Photos tab - Coming soon</Text>
          </View>
        );
      case 'ai':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>AI Chat tab - Coming soon</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!project) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Project not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.title}
        </Text>
        <TouchableOpacity style={styles.menuButton}>
          <Feather name="more-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContentContainer}
      >
        {renderTabButton('overview', 'home', 'Overview')}
        {renderTabButton('inspiration', 'heart', 'Inspiration')}
        {renderTabButton('materials', 'package', 'Materials')}
        {renderTabButton('checklist', 'check-square', 'Tasks')}
        {renderTabButton('notes', 'file-text', 'Notes')}
        {renderTabButton('photos', 'image', 'Photos')}
        {renderTabButton('ai', 'message-circle', 'AI Chat')}
      </ScrollView>

      {/* Tab Content */}
      {renderTabContent()}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  menuButton: {
    padding: 8,
  },
  tabContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  tabContentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabLabel: {
    color: '#667eea',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  projectGoal: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  projectDeadline: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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