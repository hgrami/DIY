import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SearchHistoryService, SearchHistoryItem } from '../../services/searchHistoryService';

interface SearchHistoryProps {
  onSearchSelect: (query: string, resourceType: 'tutorial' | 'inspiration' | 'materials', contentType: 'video' | 'visual' | 'article' | 'mixed') => void;
  projectId?: string;
  maxItems?: number;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSearchSelect,
  projectId,
  maxItems = 10,
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<Array<{ query: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSearchHistory();
  }, [projectId]);

  const loadSearchHistory = async () => {
    try {
      setIsLoading(true);
      
      const [historyData, popularData] = await Promise.all([
        projectId 
          ? SearchHistoryService.getProjectHistory(projectId, maxItems)
          : SearchHistoryService.getSearchHistory(maxItems),
        SearchHistoryService.getPopularSearches(5),
      ]);

      setHistory(historyData);
      setPopularSearches(popularData);
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSelect = async (item: SearchHistoryItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSearchSelect(item.query, item.resourceType, item.contentType);
  };

  const handlePopularSearchSelect = async (query: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSearchSelect(query, 'tutorial', 'mixed'); // Default to tutorial and mixed
  };

  const handleRemoveHistoryItem = async (item: SearchHistoryItem) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Alert.alert(
        'Remove Search',
        `Remove "${item.query}" from search history?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await SearchHistoryService.removeFromHistory(item.id);
              loadSearchHistory(); // Reload history
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  };

  const handleClearHistory = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      Alert.alert(
        'Clear Search History',
        'This will remove all your search history. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: async () => {
              await SearchHistoryService.clearHistory();
              loadSearchHistory(); // Reload history
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const getResourceTypeIcon = (resourceType: 'tutorial' | 'inspiration' | 'materials') => {
    switch (resourceType) {
      case 'tutorial':
        return 'play-circle';
      case 'inspiration':
        return 'heart';
      case 'materials':
        return 'package';
      default:
        return 'search';
    }
  };

  const getResourceTypeColor = (resourceType: 'tutorial' | 'inspiration' | 'materials') => {
    switch (resourceType) {
      case 'tutorial':
        return '#667eea';
      case 'inspiration':
        return '#ED8936';
      case 'materials':
        return '#48BB78';
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getContentTypeLabel = (contentType: 'video' | 'visual' | 'article' | 'mixed') => {
    switch (contentType) {
      case 'video':
        return 'Videos';
      case 'visual':
        return 'Images';
      case 'article':
        return 'Articles';
      case 'mixed':
        return 'All';
      default:
        return 'All';
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading search history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="trending-up" size={18} color="#ED8936" />
            <Text style={styles.sectionTitle}>Popular Searches</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {popularSearches.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handlePopularSearchSelect(item.query)}
                style={styles.popularSearchButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(237, 137, 54, 0.15)', 'rgba(237, 137, 54, 0.08)']}
                  style={styles.popularSearchGradient}
                >
                  <Text style={styles.popularSearchText}>{item.query}</Text>
                  <View style={styles.popularSearchBadge}>
                    <Text style={styles.popularSearchCount}>{item.count}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Searches */}
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="clock" size={18} color="#667eea" />
            <Text style={styles.sectionTitle}>
              {projectId ? 'Project History' : 'Recent Searches'}
            </Text>
            <TouchableOpacity
              onPress={handleClearHistory}
              style={styles.clearButton}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyList}>
            {history.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSearchSelect(item)}
                style={styles.historyItem}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
                  style={styles.historyItemGradient}
                >
                  <View style={styles.historyItemContent}>
                    <View style={[styles.resourceTypeIcon, { backgroundColor: getResourceTypeColor(item.resourceType) + '20' }]}>
                      <Feather
                        name={getResourceTypeIcon(item.resourceType) as any}
                        size={16}
                        color={getResourceTypeColor(item.resourceType)}
                      />
                    </View>
                    
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemQuery} numberOfLines={1}>
                        {item.query}
                      </Text>
                      <View style={styles.historyItemMeta}>
                        <Text style={styles.historyItemMetaText}>
                          {item.resourceType.charAt(0).toUpperCase() + item.resourceType.slice(1)}
                        </Text>
                        <Text style={styles.historyItemMetaText}>•</Text>
                        <Text style={styles.historyItemMetaText}>
                          {getContentTypeLabel(item.contentType)}
                        </Text>
                        <Text style={styles.historyItemMetaText}>•</Text>
                        <Text style={styles.historyItemMetaText}>
                          {item.resultCount} result{item.resultCount !== 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.historyItemMetaText}>•</Text>
                        <Text style={styles.historyItemMetaText}>
                          {formatTimeAgo(item.timestamp)}
                        </Text>
                      </View>
                      {item.projectTitle && (
                        <Text style={styles.projectTitle} numberOfLines={1}>
                          From: {item.projectTitle}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveHistoryItem(item);
                      }}
                      style={styles.removeButton}
                      hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                    >
                      <Feather name="x" size={16} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {history.length === 0 && popularSearches.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyStateTitle}>No Search History</Text>
          <Text style={styles.emptyStateText}>
            Your recent searches will appear here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  horizontalScroll: {
    marginHorizontal: -20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  popularSearchButton: {
    marginRight: 8,
  },
  popularSearchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(237, 137, 54, 0.2)',
    gap: 6,
  },
  popularSearchText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  popularSearchBadge: {
    backgroundColor: 'rgba(237, 137, 54, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  popularSearchCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    borderRadius: 12,
  },
  historyItemGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  resourceTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemQuery: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  historyItemMetaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  projectTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  removeButton: {
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
});