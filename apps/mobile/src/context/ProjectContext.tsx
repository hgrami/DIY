import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Project } from '../@types';
import { ProjectsService } from '../services/projectsService';
import { useAuthContext } from './AuthContext';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomBottomSheet } from '../components/CustomBottomSheet';
import { CreateProjectForm, CreateProjectFormRef } from '../components/CreateProjectForm';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
  searchQuery: string;

  // Actions
  loadProjects: (page?: number, append?: boolean) => Promise<void>;
  searchProjects: (query: string) => void;
  refreshProjects: () => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  clearProjects: () => void;

  // Modal actions
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  isCreateModalVisible: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', goal: '', description: '', deadline: '' });
  const createProjectFormRef = useRef<CreateProjectFormRef>(null);

  // Memoize snap points (strings like gorhom for familiarity)
  const snapPoints = useMemo(() => ['55%', '75%', '92%'], []);

  const openCreateProjectModal = useCallback(() => {
    setIsCreateModalVisible(true);
    setTimeout(() => {
      createProjectFormRef.current?.focus();
    }, 350);
  }, []);

  const closeCreateProjectModal = useCallback(() => {
    setIsCreateModalVisible(false);
    setFormData({ title: '', goal: '', description: '', deadline: '' });
  }, []);

  // Load projects
  const loadProjects = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isAuthenticated) {
      setProjects([]);
      setPagination({ page: 1, hasMore: false, total: 0 });
      setLoading(false);
      return;
    }

    try {
      if (page === 1) setLoading(true);
      setError(null);

      const response = await ProjectsService.getUserProjects(page, searchQuery || undefined);

      if (response.success) {
        if (append && page > 1) {
          setProjects(prev => [...prev, ...response.data]);
        } else {
          setProjects(response.data);
        }

        setPagination({
          page: response.pagination?.page || page,
          hasMore: response.pagination ? page < response.pagination.totalPages : false,
          total: response.pagination?.total || response.data.length,
        });
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);

      if (err?.response?.status === 401) {
        setProjects([]);
        setPagination({ page: 1, hasMore: false, total: 0 });
      } else {
        setError('Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, searchQuery]);

  const searchProjects = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination({ page: 1, hasMore: true, total: 0 });
  }, []);

  const refreshProjects = useCallback(async () => {
    await loadProjects(1, false);
  }, [loadProjects]);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [project, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }, []);

  const clearProjects = useCallback(() => {
    setProjects([]);
    setPagination({ page: 1, hasMore: false, total: 0 });
    setError(null);
  }, []);

  useEffect(() => {
    loadProjects(1, false);
  }, [loadProjects]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearProjects();
    }
  }, [isAuthenticated, clearProjects]);

  const handleProjectCreated = useCallback((shortId: string, project: any) => {
    closeCreateProjectModal();
    addProject(project);
    // navigation can be handled by caller if needed
  }, [closeCreateProjectModal, addProject]);

  const contextValue: ProjectContextType = {
    projects,
    loading,
    error,
    pagination,
    searchQuery,
    loadProjects,
    searchProjects,
    refreshProjects,
    addProject,
    updateProject,
    removeProject,
    clearProjects,
    openCreateProjectModal,
    closeCreateProjectModal,
    isCreateModalVisible,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}

      <CustomBottomSheet
        visible={isCreateModalVisible}
        onClose={closeCreateProjectModal}
        title="Create New Project"
        snapPoints={snapPoints}
        initialSnapIndex={1}
        footer={(
          <TouchableOpacity
            style={[styles.footerPrimaryButton, (modalLoading || !formData.title.trim()) && styles.footerPrimaryButtonDisabled]}
            onPress={async () => {
              if (!formData.title.trim()) {
                Alert.alert('Validation Error', 'Project title is required');
                return;
              }
              try {
                setModalLoading(true);
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
              } catch (err) {
                console.error('Failed to create project:', err);
                Alert.alert('Error', 'Failed to create project. Please try again.');
              } finally {
                setModalLoading(false);
              }
            }}
            disabled={modalLoading || !formData.title.trim()}
          >
            <Text style={styles.footerPrimaryButtonText}>{modalLoading ? 'Creating…' : 'Create Project'}</Text>
          </TouchableOpacity>
        )}
      >
        <CreateProjectForm
          ref={createProjectFormRef}
          user={user}
          onSuccess={handleProjectCreated}
          onCancel={closeCreateProjectModal}
          formData={formData}
          setFormData={setFormData}
        />
      </CustomBottomSheet>
    </ProjectContext.Provider>
  );
};

const styles = StyleSheet.create({
  footerPrimaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerPrimaryButtonDisabled: {
    backgroundColor: 'rgba(99,102,241,0.5)'
  },
  footerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});