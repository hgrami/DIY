import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeModal } from '../NativeModal';
import { DIYSearchResult } from '../../services/searchService';
import { Project } from '../../@types';
import { ProjectsService } from '../../services/projectsService';

interface ProjectSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  searchResult: DIYSearchResult | null;
  onProjectSelected: (project: Project, resourceType: 'inspiration' | 'material' | 'checklist') => void;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  isVisible,
  onClose,
  searchResult,
  onProjectSelected,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResourceType, setSelectedResourceType] = useState<'inspiration' | 'material' | 'checklist'>('inspiration');

  useEffect(() => {
    if (isVisible) {
      loadProjects();
    }
  }, [isVisible]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await ProjectsService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onProjectSelected(project, selectedResourceType);
    onClose();
  };

  const getResourceTypeInfo = (type: 'inspiration' | 'material' | 'checklist') => {
    switch (type) {
      case 'inspiration':
        return {
          icon: 'heart' as const,
          color: '#ED8936',
          title: 'Inspiration',
          description: 'Add as project inspiration'
        };
      case 'material':
        return {
          icon: 'package' as const,
          color: '#48BB78',
          title: 'Material',
          description: 'Add as project material'
        };
      case 'checklist':
        return {
          icon: 'check-square' as const,
          color: '#667eea',
          title: 'Task',
          description: 'Add as checklist item'
        };
    }
  };

  const resourceTypes: ('inspiration' | 'material' | 'checklist')[] = ['inspiration', 'material', 'checklist'];

  if (!searchResult) return null;

  return (
    <NativeModal
      isVisible={isVisible}
      onClose={onClose}
      title="Add to Project"
      backgroundColor="rgba(44, 44, 46, 0.95)"
    >
      {/* Resource Preview */}
      <View style={styles.resourcePreview}>
        <View style={styles.resourceHeader}>
          <Feather 
            name={searchResult.isYouTube ? 'play-circle' : 'link'} 
            size={18} 
            color="#667eea" 
          />
          <Text style={styles.resourceTitle} numberOfLines={1}>
            {searchResult.title}
          </Text>
        </View>
      </View>

      {/* Resource Type Selection */}
      <View style={styles.resourceTypeSection}>
        <Text style={styles.sectionTitle}>Add as:</Text>
        <View style={styles.resourceTypeContainer}>
          {resourceTypes.map((type) => {
            const info = getResourceTypeInfo(type);
            const isSelected = selectedResourceType === type;
            
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.resourceTypeItem,
                  isSelected && styles.selectedResourceType
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedResourceType(type);
                }}
              >
                <View style={[styles.resourceTypeIcon, { backgroundColor: `${info.color}20` }]}>
                  <Feather name={info.icon} size={16} color={info.color} />
                </View>
                <View style={styles.resourceTypeInfo}>
                  <Text style={[styles.resourceTypeTitle, isSelected && styles.selectedText]}>
                    {info.title}
                  </Text>
                  <Text style={[styles.resourceTypeDescription, isSelected && styles.selectedSubtext]}>
                    {info.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Project List */}
      <View style={styles.projectsSection}>
        <Text style={styles.sectionTitle}>Select Project:</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={32} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyStateText}>No projects found</Text>
            <Text style={styles.emptyStateSubtext}>Create a project first to add resources</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.projectsList}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectItem}
                onPress={() => handleProjectSelect(project)}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.projectCard}
                >
                  <View style={styles.projectHeader}>
                    <View style={styles.projectIcon}>
                      <Feather name="folder" size={20} color="#667eea" />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectTitle} numberOfLines={1}>
                        {project.title}
                      </Text>
                      {project.description && (
                        <Text style={styles.projectDescription} numberOfLines={2}>
                          {project.description}
                        </Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={20} color="rgba(255, 255, 255, 0.3)" />
                  </View>
                  
                  {/* Project Stats */}
                  <View style={styles.projectStats}>
                    <View style={styles.statItem}>
                      <Feather name="heart" size={12} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.statText}>
                        {project.inspiration?.length || 0} inspirations
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="package" size={12} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.statText}>
                        {project.materials?.length || 0} materials
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="check-square" size={12} color="rgba(255, 255, 255, 0.5)" />
                      <Text style={styles.statText}>
                        {project.checklists?.length || 0} tasks
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  resourcePreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  resourceTypeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resourceTypeContainer: {
    gap: 8,
  },
  resourceTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 12,
  },
  selectedResourceType: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  resourceTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceTypeInfo: {
    flex: 1,
  },
  resourceTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  resourceTypeDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  projectsSection: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  projectsList: {
    maxHeight: 300,
  },
  projectItem: {
    marginBottom: 12,
  },
  projectCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});