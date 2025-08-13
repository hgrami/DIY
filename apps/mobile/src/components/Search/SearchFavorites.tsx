import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SearchHistoryService, SearchFavorite } from '../../services/searchHistoryService';
import { DIYSearchResult } from '../../services/searchService';

interface SearchFavoritesProps {
  onFavoriteSelect: (result: DIYSearchResult) => void;
  projectId?: string;
  maxItems?: number;
}

interface EditFavoriteModalProps {
  favorite: SearchFavorite;
  isVisible: boolean;
  onClose: () => void;
  onSave: (tags: string[], notes?: string) => void;
}

const EditFavoriteModal: React.FC<EditFavoriteModalProps> = ({
  favorite,
  isVisible,
  onClose,
  onSave,
}) => {
  const [tags, setTags] = useState<string[]>(favorite.tags);
  const [notes, setNotes] = useState(favorite.notes || '');
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(tags, notes);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Favorite</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle} numberOfLines={2}>
            {favorite.searchResult.title}
          </Text>

          {/* Tags */}
          <View style={styles.tagsSection}>
            <Text style={styles.inputLabel}>Tags</Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Feather name="x" size={12} color="rgba(255, 255, 255, 0.7)" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addTagContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add tag..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
                <Feather name="plus" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add your notes..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <LinearGradient
                colors={['#667eea', '#667eea99']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

export const SearchFavorites: React.FC<SearchFavoritesProps> = ({
  onFavoriteSelect,
  projectId,
  maxItems = 20,
}) => {
  const [favorites, setFavorites] = useState<SearchFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFavorite, setEditingFavorite] = useState<SearchFavorite | null>(null);

  useEffect(() => {
    loadFavorites();
  }, [projectId]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      
      const favoritesData = projectId
        ? await SearchHistoryService.getProjectFavorites(projectId, maxItems)
        : await SearchHistoryService.getFavorites(maxItems);

      setFavorites(favoritesData);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteSelect = async (favorite: SearchFavorite) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFavoriteSelect(favorite.searchResult);
  };

  const handleEditFavorite = async (favorite: SearchFavorite) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingFavorite(favorite);
  };

  const handleSaveEdit = async (tags: string[], notes?: string) => {
    if (!editingFavorite) return;

    try {
      await SearchHistoryService.updateFavorite(editingFavorite.id, { tags, notes });
      await loadFavorites(); // Reload favorites
    } catch (error) {
      console.error('Failed to update favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleRemoveFavorite = async (favorite: SearchFavorite) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      Alert.alert(
        'Remove Favorite',
        `Remove "${favorite.searchResult.title}" from favorites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await SearchHistoryService.removeFromFavorites(favorite.id);
              loadFavorites(); // Reload favorites
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleClearFavorites = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      Alert.alert(
        'Clear All Favorites',
        'This will remove all your saved favorites. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: async () => {
              await SearchHistoryService.clearFavorites();
              loadFavorites(); // Reload favorites
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to clear favorites:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'video':
        return 'play';
      case 'visual':
        return 'image';
      case 'article':
        return 'file-text';
      default:
        return 'link';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {favorites.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="heart" size={18} color="#ED8936" />
            <Text style={styles.sectionTitle}>
              {projectId ? 'Project Favorites' : 'Saved Favorites'}
            </Text>
            <TouchableOpacity
              onPress={handleClearFavorites}
              style={styles.clearButton}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.favoritesList}
            showsVerticalScrollIndicator={false}
          >
            {favorites.map((favorite) => (
              <TouchableOpacity
                key={favorite.id}
                onPress={() => handleFavoriteSelect(favorite)}
                style={styles.favoriteItem}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
                  style={styles.favoriteItemGradient}
                >
                  <View style={styles.favoriteItemContent}>
                    <View style={styles.favoriteItemHeader}>
                      <View style={styles.contentTypeIcon}>
                        <Feather
                          name={getContentTypeIcon(favorite.searchResult.contentType) as any}
                          size={14}
                          color="#ED8936"
                        />
                      </View>
                      <Text style={styles.favoriteItemSource} numberOfLines={1}>
                        {favorite.searchResult.source}
                      </Text>
                    </View>

                    <Text style={styles.favoriteItemTitle} numberOfLines={2}>
                      {favorite.searchResult.title}
                    </Text>

                    {favorite.searchResult.snippet && (
                      <Text style={styles.favoriteItemSnippet} numberOfLines={2}>
                        {favorite.searchResult.snippet}
                      </Text>
                    )}

                    {/* Tags */}
                    {favorite.tags.length > 0 && (
                      <View style={styles.favoriteItemTags}>
                        {favorite.tags.slice(0, 3).map((tag, index) => (
                          <View key={index} style={styles.favoriteTag}>
                            <Text style={styles.favoriteTagText}>{tag}</Text>
                          </View>
                        ))}
                        {favorite.tags.length > 3 && (
                          <Text style={styles.moreTagsText}>+{favorite.tags.length - 3}</Text>
                        )}
                      </View>
                    )}

                    {/* Notes */}
                    {favorite.notes && (
                      <View style={styles.favoriteNotes}>
                        <Feather name="file-text" size={12} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.favoriteNotesText} numberOfLines={2}>
                          {favorite.notes}
                        </Text>
                      </View>
                    )}

                    <View style={styles.favoriteItemFooter}>
                      <Text style={styles.favoriteItemTime}>
                        Saved {formatTimeAgo(favorite.createdAt)}
                      </Text>
                      {favorite.projectTitle && (
                        <Text style={styles.favoriteItemProject} numberOfLines={1}>
                          From: {favorite.projectTitle}
                        </Text>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.favoriteActions}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleEditFavorite(favorite);
                        }}
                        style={styles.actionButton}
                        hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                      >
                        <Feather name="edit-2" size={16} color="rgba(255, 255, 255, 0.6)" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite);
                        }}
                        style={styles.actionButton}
                        hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                      >
                        <Feather name="trash-2" size={16} color="rgba(255, 107, 107, 0.8)" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty State */}
      {favorites.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="heart" size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyStateTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyStateText}>
            Save search results you want to keep for later
          </Text>
        </View>
      )}

      {/* Edit Modal */}
      {editingFavorite && (
        <EditFavoriteModal
          favorite={editingFavorite}
          isVisible={true}
          onClose={() => setEditingFavorite(null)}
          onSave={handleSaveEdit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  favoritesList: {
    flex: 1,
  },
  favoriteItem: {
    marginBottom: 12,
  },
  favoriteItemGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  favoriteItemContent: {
    padding: 16,
  },
  favoriteItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contentTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(237, 137, 54, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteItemSource: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  favoriteItemTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  favoriteItemSnippet: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  favoriteItemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  favoriteTag: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  favoriteTagText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  favoriteNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 6,
  },
  favoriteNotesText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
  favoriteItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  favoriteItemTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  favoriteItemProject: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  favoriteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    lineHeight: 20,
  },
  tagsSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  addTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addTagButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  saveButton: {
    flex: 1,
  },
  saveButtonGradient: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});