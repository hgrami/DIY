import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeModal } from '../NativeModal';
import { DIYSearchResult } from '../../services/searchService';
import { ProjectsService } from '../../services/projectsService';
import { CreateProjectData } from '../../@types';

interface NewProjectFromSearchModalProps {
  isVisible: boolean;
  onClose: () => void;
  searchResult: DIYSearchResult | null;
  onProjectCreated: (projectShortId: string) => void;
}

export const NewProjectFromSearchModal: React.FC<NewProjectFromSearchModalProps> = ({
  isVisible,
  onClose,
  searchResult,
  onProjectCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isVisible && searchResult) {
      // Auto-populate project details based on search result
      const suggestedTitle = extractProjectTitle(searchResult.title);
      setTitle(suggestedTitle);
      setDescription(searchResult.snippet || '');
      setGoal(generateProjectGoal(searchResult));
    }
  }, [isVisible, searchResult]);

  const extractProjectTitle = (searchTitle: string): string => {
    // Remove common prefixes and clean up the title
    const cleanTitle = searchTitle
      .replace(/^(DIY|How to|Build|Make|Create|Tutorial:?)\s*/i, '')
      .replace(/\s*-\s*YouTube$/, '')
      .replace(/\s*\|\s*.*$/, '') // Remove site names after |
      .trim();
    
    return cleanTitle || 'New DIY Project';
  };

  const generateProjectGoal = (result: DIYSearchResult): string => {
    if (result.tags && result.tags.length > 0) {
      const primaryTag = result.tags[0];
      return `Learn and implement ${primaryTag.toLowerCase()} techniques`;
    }
    
    if (result.difficulty) {
      return `Complete a ${result.difficulty.toLowerCase()} level DIY project`;
    }
    
    return 'Complete this DIY project successfully';
  };

  const handleCreateProject = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a project title');
      return;
    }

    if (!searchResult) return;

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const projectData: CreateProjectData = {
        title: title.trim(),
        description: description.trim() || undefined,
        goal: goal.trim() || undefined,
        // Add the search result as initial inspiration
        inspiration: [{
          title: searchResult.title,
          url: searchResult.url,
          imageUrl: searchResult.thumbnailUrl,
          description: searchResult.snippet || '',
          source: searchResult.source,
          tags: searchResult.tags || [],
        }],
        // Extract potential materials from tags
        materials: searchResult.tags ? 
          searchResult.tags.slice(0, 3).map(tag => ({
            name: tag,
            quantity: '',
            notes: `Related to ${searchResult.title}`,
            checked: false,
            estimatedPrice: 0,
          })) : [],
        // Create initial checklist based on search result
        checklists: [{
          title: 'Project Planning',
          items: [
            {
              title: 'Review tutorial/inspiration',
              description: `Study the resource: ${searchResult.title}`,
              completed: false,
              order: 0,
            },
            {
              title: 'Gather required materials',
              description: 'Collect all necessary tools and materials',
              completed: false,
              order: 1,
            },
            {
              title: 'Prepare workspace',
              description: 'Set up a clean and organized work area',
              completed: false,
              order: 2,
            },
          ],
        }],
      };

      const project = await ProjectsService.createProject(projectData);
      onProjectCreated(project.shortId);
      onClose();
      
      // Reset form
      setTitle('');
      setDescription('');
      setGoal('');
      
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!searchResult) return null;

  return (
    <NativeModal
      isVisible={isVisible}
      onClose={onClose}
      title="Create New Project"
      backgroundColor="rgba(44, 44, 46, 0.95)"
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Source Resource Preview */}
        <View style={styles.resourcePreview}>
          <View style={styles.previewHeader}>
            <Feather name="lightbulb" size={16} color="#ED8936" />
            <Text style={styles.previewTitle}>Based on this resource:</Text>
          </View>
          <View style={styles.resourceInfo}>
            <Feather 
              name={searchResult.isYouTube ? 'play-circle' : 'link'} 
              size={18} 
              color="#667eea" 
            />
            <Text style={styles.resourceTitle} numberOfLines={2}>
              {searchResult.title}
            </Text>
          </View>
        </View>

        {/* Project Details Form */}
        <View style={styles.formContainer}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter project title..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Describe your project goals and vision..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Goal Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Goal</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you want to achieve?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={goal}
              onChangeText={setGoal}
              maxLength={200}
            />
          </View>

          {/* Preview of what will be added */}
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>This project will include:</Text>
            <View style={styles.previewItems}>
              <View style={styles.previewItem}>
                <View style={styles.previewIcon}>
                  <Feather name="heart" size={14} color="#ED8936" />
                </View>
                <Text style={styles.previewText}>Original resource as inspiration</Text>
              </View>
              {searchResult.tags && searchResult.tags.length > 0 && (
                <View style={styles.previewItem}>
                  <View style={styles.previewIcon}>
                    <Feather name="package" size={14} color="#48BB78" />
                  </View>
                  <Text style={styles.previewText}>
                    {searchResult.tags.slice(0, 3).join(', ')} as materials
                  </Text>
                </View>
              )}
              <View style={styles.previewItem}>
                <View style={styles.previewIcon}>
                  <Feather name="check-square" size={14} color="#667eea" />
                </View>
                <Text style={styles.previewText}>Initial planning checklist</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.createButton, loading && styles.disabledButton]}
          onPress={handleCreateProject}
          disabled={loading || !title.trim()}
        >
          <LinearGradient
            colors={loading || !title.trim() ? ['#666', '#666'] : ['#667eea', '#764ba2']}
            style={styles.buttonGradient}
          >
            {loading ? (
              <>
                <Feather name="loader" size={16} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <Feather name="plus-circle" size={16} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Project</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resourcePreview: {
    backgroundColor: 'rgba(237, 137, 54, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(237, 137, 54, 0.2)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ED8936',
  },
  resourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
    lineHeight: 20,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multilineInput: {
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  previewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  previewItems: {
    gap: 10,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  createButton: {
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});