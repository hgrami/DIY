import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { ResourceCard, ResourceSuggestion } from './ResourceCard';
import { ResourceViewer } from '../ResourceViewer';
import { apiService } from '../../services/api';
import * as Haptics from 'expo-haptics';

interface ResourceCardContainerProps {
  resources: ResourceSuggestion[];
  projectId: string;
  projectShortId: string;
  onResourceAdded?: (resource: ResourceSuggestion) => void;
  onAllResourcesProcessed?: () => void;
}

export const ResourceCardContainer: React.FC<ResourceCardContainerProps> = ({
  resources,
  projectId,
  projectShortId,
  onResourceAdded,
  onAllResourcesProcessed,
}) => {
  const [dismissedResources, setDismissedResources] = useState<string[]>([]);
  const [addedResources, setAddedResources] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceSuggestion | null>(null);

  const visibleResources = resources.filter(
    resource => !dismissedResources.includes(resource.id) && !addedResources.includes(resource.id)
  );

  const handleAddResource = async (resource: ResourceSuggestion) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Call appropriate API based on resource type
      let response;
      switch (resource.type) {
        case 'material':
          response = await apiService.post(`/api/projects/${projectShortId}/materials`, {
            name: resource.title,
            quantity: resource.details.quantity || '1',
            estimatedPrice: resource.estimatedCost,
            category: resource.details.category || 'Materials',
            notes: resource.description,
          });
          break;
          
        case 'task':
          response = await apiService.post(`/api/projects/${projectShortId}/checklist`, {
            title: resource.title,
            description: resource.description,
            estimatedTime: resource.estimatedTime,
            difficulty: resource.difficulty,
            order: resource.details.order || 0,
          });
          break;
          
        case 'inspiration':
          response = await apiService.post(`/api/projects/${projectShortId}/inspiration`, {
            title: resource.title,
            url: resource.url || '#',
            description: resource.description,
            source: resource.details.source || 'AI Suggestion',
            difficulty: resource.difficulty,
            tags: resource.tags || [],
          });
          break;
          
        case 'note':
          const noteContent = resource.details?.fullContent || `${resource.title}\n\n${resource.description || ''}`;
          response = await apiService.post(`/api/projects/${projectShortId}/notes`, {
            content: noteContent,
            tags: resource.tags || ['ai-suggestion'],
          });
          break;
          
        default:
          throw new Error('Unknown resource type');
      }

      if (response.success) {
        setAddedResources(prev => [...prev, resource.id]);
        onResourceAdded?.(resource);
        
        // Show success feedback
        Alert.alert(
          'Added to Project!',
          `${resource.title} has been added to your ${resource.type === 'task' ? 'tasks' : resource.type + 's'}.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.error || 'Failed to add resource');
      }
    } catch (error) {
      console.error('Failed to add resource:', error);
      throw error; // Re-throw to let ResourceCard handle the error display
    }

    // Check if all resources have been processed
    checkAllResourcesProcessed();
  };

  const handleDismissResource = (resourceId: string) => {
    setDismissedResources(prev => [...prev, resourceId]);
    checkAllResourcesProcessed();
  };

  const handleViewResource = (resource: ResourceSuggestion) => {
    setSelectedResource(resource);
    setViewerVisible(true);
  };

  const handleCloseViewer = () => {
    setViewerVisible(false);
    setSelectedResource(null);
  };

  const checkAllResourcesProcessed = () => {
    const totalProcessed = dismissedResources.length + addedResources.length + 1; // +1 for the current action
    if (totalProcessed >= resources.length) {
      setTimeout(() => {
        onAllResourcesProcessed?.();
      }, 500); // Small delay for better UX
    }
  };

  if (visibleResources.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Suggestions</Text>
        <Text style={styles.subtitle}>
          Review and choose what to add to your project
        </Text>
      </View>
      
      <View style={styles.resourceList}>
        {visibleResources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onAdd={handleAddResource}
            onDismiss={handleDismissResource}
            onView={handleViewResource}
            projectId={projectId}
          />
        ))}
      </View>
      
      {visibleResources.length > 1 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {visibleResources.length} suggestions remaining
          </Text>
        </View>
      )}
      {/* Resource Viewer Modal */}
      <Modal
        visible={viewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseViewer}
      >
        {selectedResource && (
          <ResourceViewer
            visible={viewerVisible}
            onClose={handleCloseViewer}
            resource={{
              title: selectedResource.title,
              url: selectedResource.url || '',
              source: selectedResource.details?.source || 'Unknown',
              isYouTube: selectedResource.url?.includes('youtube.com') || selectedResource.url?.includes('youtu.be'),
              videoId: selectedResource.url ? extractYouTubeId(selectedResource.url) : undefined,
              snippet: selectedResource.description,
            }}
          />
        )}
      </Modal>
    </View>
  );
};

// Helper function to extract YouTube video ID
const extractYouTubeId = (url: string): string | undefined => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : undefined;
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  resourceList: {
    gap: 4,
  },
  footer: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});