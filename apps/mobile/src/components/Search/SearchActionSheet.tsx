import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeModal } from '../NativeModal';
import { DIYSearchResult } from '../../services/searchService';

interface SearchActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  searchResult: DIYSearchResult | null;
  onAddToExistingProject: () => void;
  onCreateNewProject: () => void;
  onOpenLink: () => void;
  onAddToFavorites: () => void;
  onShare: () => void;
}

export const SearchActionSheet: React.FC<SearchActionSheetProps> = ({
  isVisible,
  onClose,
  searchResult,
  onAddToExistingProject,
  onCreateNewProject,
  onOpenLink,
  onAddToFavorites,
  onShare,
}) => {
  const handleAction = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
    onClose();
  };

  const actions = [
    {
      id: 'add-to-project',
      title: 'Add to Existing Project',
      subtitle: 'Add this resource to one of your projects',
      icon: 'folder-plus' as const,
      color: '#667eea',
      onPress: () => handleAction(onAddToExistingProject),
    },
    {
      id: 'create-project',
      title: 'Create New Project',
      subtitle: 'Start a new project based on this resource',
      icon: 'plus-circle' as const,
      color: '#48BB78',
      onPress: () => handleAction(onCreateNewProject),
    },
    {
      id: 'open-link',
      title: 'View Resource',
      subtitle: 'View the full resource in-app',
      icon: 'eye' as const,
      color: '#ED8936',
      onPress: () => handleAction(onOpenLink),
    },
    {
      id: 'favorites',
      title: 'Add to Favorites',
      subtitle: 'Save this resource for later',
      icon: 'heart' as const,
      color: '#E53E3E',
      onPress: () => handleAction(onAddToFavorites),
    },
    {
      id: 'share',
      title: 'Share',
      subtitle: 'Share this resource with others',
      icon: 'share-2' as const,
      color: '#9F7AEA',
      onPress: () => handleAction(onShare),
    },
  ];

  if (!searchResult) return null;

  return (
    <NativeModal
      isVisible={isVisible}
      onClose={onClose}
      title="Resource Actions"
      backgroundColor="rgba(44, 44, 46, 0.95)"
    >
      {/* Resource Preview */}
      <View style={styles.resourcePreview}>
        <View style={styles.resourceHeader}>
          <View style={styles.resourceIcon}>
            <Feather 
              name={searchResult.isYouTube ? 'play-circle' : 'link'} 
              size={20} 
              color="#667eea" 
            />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceTitle} numberOfLines={2}>
              {searchResult.title}
            </Text>
            <Text style={styles.resourceSource} numberOfLines={1}>
              {searchResult.source}
            </Text>
          </View>
        </View>
        
        {searchResult.snippet && (
          <Text style={styles.resourceSnippet} numberOfLines={2}>
            {searchResult.snippet}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionItem,
              index === actions.length - 1 && styles.lastActionItem
            ]}
            onPress={action.onPress}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
              <Feather name={action.icon} size={22} color={action.color} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255, 255, 255, 0.3)" />
          </TouchableOpacity>
        ))}
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  resourcePreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 22,
  },
  resourceSource: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  resourceSnippet: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
});