import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NativeModal } from '../components/NativeModal';
import { CreateProjectForm, CreateProjectButtons, CreateProjectFormRef } from '../components/CreateProjectForm';
import { ProjectsService } from '../services/projectsService';
import { useAuthContext } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';
import { Project, AuthenticatedStackParamList } from '../@types';
import { ScreenWithHeader } from '../components/ScreenWithHeader';

type ProjectsScreenNavigationProp = DrawerNavigationProp<AuthenticatedStackParamList, 'Projects'>;

export const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  const { user } = useAuthContext();
  const { projects, loading, searchQuery, searchProjects, addProject } = useProjectContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', goal: '', description: '', deadline: '' });
  const createProjectFormRef = useRef<CreateProjectFormRef>(null);

  const handleProjectPress = async (project: Project) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Project', { shortId: project.shortId });
  };

  const handleCreateProject = () => {
    setShowCreateModal(true);
    // Auto-focus the input after bottom sheet animation
    setTimeout(() => {
      createProjectFormRef.current?.focus();
    }, 600);
  };

  const handleProjectCreated = (shortId: string, project: any) => {
    setShowCreateModal(false);
    addProject(project);
    navigation.navigate('Project', { shortId });
  };

  // Projects are already filtered by the API call

  const renderProjectCard = ({ item }: { item: Project }) => {
    const completedTasks = item.checklistItems.filter(task => task.completed).length;
    const totalTasks = item.checklistItems.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleProjectPress(item)}
        activeOpacity={0.7}
      >
        <Card>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <TouchableOpacity style={styles.projectMenu}>
              <Feather name="more-vertical" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {item.goal && (
            <Text style={styles.projectGoal} numberOfLines={2}>
              {item.goal}
            </Text>
          )}

          <View style={styles.projectStats}>
            <View style={styles.statItem}>
              <Feather name="heart" size={14} color="#667eea" />
              <Text style={styles.statText}>{item.inspirationLinks.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="package" size={14} color="#667eea" />
              <Text style={styles.statText}>{item.materials.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="check-square" size={14} color="#667eea" />
              <Text style={styles.statText}>{completedTasks}/{totalTasks}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="file-text" size={14} color="#667eea" />
              <Text style={styles.statText}>{item.notes.length}</Text>
            </View>
          </View>

          {totalTasks > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}

          <Text style={styles.projectDate}>
            Updated {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="folder" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No projects yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first DIY project to get started
      </Text>
      <Button
        title="Create Project"
        onPress={handleCreateProject}
        style={styles.createButton}
      />
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          value={localSearchQuery}
          onChangeText={(text) => {
            setLocalSearchQuery(text);
            searchProjects(text);
          }}
          placeholderTextColor="#999"
        />
        {localSearchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setLocalSearchQuery('');
              searchProjects('');
            }}
            style={styles.clearButton}
          >
            <Feather name="x" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenWithHeader title="My Projects">
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Projects</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateProject}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {projects.length > 0 && renderSearchBar()}

        {/* Projects List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            renderItem={renderProjectCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}

        {/* Create Project Bottom Sheet */}
        <NativeModal
          isVisible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          size="full"
          allowSwipeToClose={!createLoading}
          title="Create New Project"
          footerComponent={
            <CreateProjectButtons
              loading={createLoading}
              canCreate={formData.title.trim().length > 0}
              onCancel={() => {
                setShowCreateModal(false);
                setFormData({ title: '', goal: '', description: '', deadline: '' });
              }}
              onCreate={async () => {
                if (!formData.title.trim()) {
                  Alert.alert('Validation Error', 'Project title is required');
                  return;
                }

                try {
                  setCreateLoading(true);
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                  const isFreeUser = !user?.subscriptionStatus || user?.subscriptionStatus === 'FREE';
                  const config = {
                    aiEnabled: !isFreeUser,
                    showInspiration: true,
                    showMaterials: true,
                    showChecklist: true,
                    showNotes: true,
                    showPhotos: true,
                  };

                  const projectData = {
                    title: formData.title.trim(),
                    goal: formData.goal.trim() || undefined,
                    description: formData.description.trim() || undefined,
                    deadline: formData.deadline ? new Date(formData.deadline) : undefined,
                    config,
                  };

                  const response = await ProjectsService.createProject(projectData);

                  if (response.success) {
                    handleProjectCreated(response.data.shortId, response.data);
                    setFormData({ title: '', goal: '', description: '', deadline: '' });
                  } else {
                    Alert.alert('Error', 'Failed to create project');
                  }
                } catch (error) {
                  console.error('Failed to create project:', error);
                  Alert.alert('Error', 'Failed to create project. Please try again.');
                } finally {
                  setCreateLoading(false);
                }
              }}
            />
          }
        >
          <CreateProjectForm
            ref={createProjectFormRef}
            user={user}
            onSuccess={handleProjectCreated}
            onCancel={() => setShowCreateModal(false)}
            formData={formData}
            setFormData={setFormData}
          />
        </NativeModal>
      </LinearGradient>
    </ScreenWithHeader>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  projectCard: {
    marginBottom: 16,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  projectMenu: {
    padding: 4,
  },
  projectGoal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  projectStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  projectDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
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
});