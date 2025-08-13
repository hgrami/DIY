import AsyncStorage from '@react-native-async-storage/async-storage';
import { DIYSearchResult } from './searchService';

export interface SearchHistoryItem {
  id: string;
  query: string;
  resourceType: 'tutorial' | 'inspiration' | 'materials';
  contentType: 'video' | 'visual' | 'article' | 'mixed';
  projectId?: string;
  projectTitle?: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchFavorite {
  id: string;
  searchResult: DIYSearchResult;
  projectId?: string;
  projectTitle?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  SEARCH_HISTORY: 'search_history',
  SEARCH_FAVORITES: 'search_favorites',
} as const;

const MAX_HISTORY_ITEMS = 50;
const MAX_FAVORITES = 100;

export class SearchHistoryService {
  /**
   * Add a search to history
   */
  static async addToHistory(
    query: string,
    resourceType: 'tutorial' | 'inspiration' | 'materials',
    contentType: 'video' | 'visual' | 'article' | 'mixed',
    resultCount: number,
    projectId?: string,
    projectTitle?: string
  ): Promise<void> {
    try {
      const existingHistory = await this.getSearchHistory();

      // Remove duplicate if exists (same query, resourceType, contentType)
      const filteredHistory = existingHistory.filter(item =>
        !(item.query === query &&
          item.resourceType === resourceType &&
          item.contentType === contentType)
      );

      const historyItem: SearchHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query,
        resourceType,
        contentType,
        projectId,
        projectTitle,
        timestamp: Date.now(),
        resultCount,
      };

      // Add to beginning of array
      const updatedHistory = [historyItem, ...filteredHistory];

      // Keep only the most recent items
      const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(trimmedHistory));

    } catch (error) {
      console.error('[SearchHistory] Failed to add to history:', error);
    }
  }

  /**
   * Get search history
   */
  static async getSearchHistory(limit?: number): Promise<SearchHistoryItem[]> {
    try {
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (!historyData) return [];

      const history: SearchHistoryItem[] = JSON.parse(historyData);

      // Sort by timestamp (most recent first)
      const sortedHistory = history.sort((a, b) => b.timestamp - a.timestamp);

      return limit ? sortedHistory.slice(0, limit) : sortedHistory;
    } catch (error) {
      console.error('[SearchHistory] Failed to get history:', error);
      return [];
    }
  }

  /**
   * Get recent searches for a specific project
   */
  static async getProjectHistory(projectId: string, limit: number = 10): Promise<SearchHistoryItem[]> {
    try {
      const allHistory = await this.getSearchHistory();
      return allHistory
        .filter(item => item.projectId === projectId)
        .slice(0, limit);
    } catch (error) {
      console.error('[SearchHistory] Failed to get project history:', error);
      return [];
    }
  }

  /**
   * Get popular searches (most searched queries)
   */
  static async getPopularSearches(limit: number = 5): Promise<Array<{ query: string; count: number }>> {
    try {
      const history = await this.getSearchHistory();

      // Count query frequency
      const queryCount = new Map<string, number>();
      history.forEach(item => {
        const current = queryCount.get(item.query) || 0;
        queryCount.set(item.query, current + 1);
      });

      // Convert to array and sort by count
      const popular = Array.from(queryCount.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return popular;
    } catch (error) {
      console.error('[SearchHistory] Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Remove item from history
   */
  static async removeFromHistory(historyItemId: string): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const updatedHistory = history.filter(item => item.id !== historyItemId);

      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('[SearchHistory] Failed to remove from history:', error);
    }
  }

  /**
   * Clear all search history
   */
  static async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.error('[SearchHistory] Failed to clear history:', error);
    }
  }

  /**
   * Add a search result to favorites
   */
  static async addToFavorites(
    searchResult: DIYSearchResult,
    projectId?: string,
    projectTitle?: string,
    tags: string[] = [],
    notes?: string
  ): Promise<void> {
    try {
      const existingFavorites = await this.getFavorites();

      // Check if already favorited (same URL)
      const existingIndex = existingFavorites.findIndex(fav => fav.searchResult.url === searchResult.url);

      if (existingIndex >= 0) {
        // Update existing favorite
        existingFavorites[existingIndex] = {
          ...existingFavorites[existingIndex],
          tags,
          notes,
          projectId,
          projectTitle,
        };
      } else {
        // Add new favorite
        const favorite: SearchFavorite = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          searchResult,
          projectId,
          projectTitle,
          tags,
          notes,
          createdAt: Date.now(),
        };

        existingFavorites.unshift(favorite);
      }

      // Keep only the most recent favorites
      const trimmedFavorites = existingFavorites.slice(0, MAX_FAVORITES);

      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_FAVORITES, JSON.stringify(trimmedFavorites));
    } catch (error) {
      console.error('[SearchHistory] Failed to add to favorites:', error);
    }
  }

  /**
   * Get all favorites
   */
  static async getFavorites(limit?: number): Promise<SearchFavorite[]> {
    try {
      const favoritesData = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_FAVORITES);
      if (!favoritesData) return [];

      const favorites: SearchFavorite[] = JSON.parse(favoritesData);

      // Sort by creation date (most recent first)
      const sortedFavorites = favorites.sort((a, b) => b.createdAt - a.createdAt);

      return limit ? sortedFavorites.slice(0, limit) : sortedFavorites;
    } catch (error) {
      console.error('[SearchHistory] Failed to get favorites:', error);
      return [];
    }
  }

  /**
   * Get favorites for a specific project
   */
  static async getProjectFavorites(projectId: string, limit?: number): Promise<SearchFavorite[]> {
    try {
      const allFavorites = await this.getFavorites();
      const projectFavorites = allFavorites.filter(fav => fav.projectId === projectId);

      return limit ? projectFavorites.slice(0, limit) : projectFavorites;
    } catch (error) {
      console.error('[SearchHistory] Failed to get project favorites:', error);
      return [];
    }
  }

  /**
   * Check if a search result is favorited
   */
  static async isFavorited(url: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.searchResult.url === url);
    } catch (error) {
      console.error('[SearchHistory] Failed to check if favorited:', error);
      return false;
    }
  }

  /**
   * Remove from favorites
   */
  static async removeFromFavorites(favoriteId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav => fav.id !== favoriteId);

      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_FAVORITES, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('[SearchHistory] Failed to remove from favorites:', error);
    }
  }

  /**
   * Remove from favorites by URL
   */
  static async removeFromFavoritesByUrl(url: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav => fav.searchResult.url !== url);

      await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_FAVORITES, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('[SearchHistory] Failed to remove from favorites by URL:', error);
    }
  }

  /**
   * Update favorite notes and tags
   */
  static async updateFavorite(
    favoriteId: string,
    updates: { tags?: string[]; notes?: string }
  ): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const favoriteIndex = favorites.findIndex(fav => fav.id === favoriteId);

      if (favoriteIndex >= 0) {
        favorites[favoriteIndex] = {
          ...favorites[favoriteIndex],
          ...updates,
        };

        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_FAVORITES, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('[SearchHistory] Failed to update favorite:', error);
    }
  }

  /**
   * Clear all favorites
   */
  static async clearFavorites(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_FAVORITES);
    } catch (error) {
      console.error('[SearchHistory] Failed to clear favorites:', error);
    }
  }

  /**
   * Get search statistics
   */
  static async getSearchStats(): Promise<{
    totalSearches: number;
    totalFavorites: number;
    topResourceTypes: Array<{ type: string; count: number }>;
    topContentTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      const [history, favorites] = await Promise.all([
        this.getSearchHistory(),
        this.getFavorites(),
      ]);

      // Count resource types
      const resourceTypeCounts = new Map<string, number>();
      history.forEach(item => {
        const current = resourceTypeCounts.get(item.resourceType) || 0;
        resourceTypeCounts.set(item.resourceType, current + 1);
      });

      // Count content types
      const contentTypeCounts = new Map<string, number>();
      history.forEach(item => {
        const current = contentTypeCounts.get(item.contentType) || 0;
        contentTypeCounts.set(item.contentType, current + 1);
      });

      return {
        totalSearches: history.length,
        totalFavorites: favorites.length,
        topResourceTypes: Array.from(resourceTypeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        topContentTypes: Array.from(contentTypeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      };
    } catch (error) {
      console.error('[SearchHistory] Failed to get search stats:', error);
      return {
        totalSearches: 0,
        totalFavorites: 0,
        topResourceTypes: [],
        topContentTypes: [],
      };
    }
  }

  /**
   * Export search data for backup
   */
  static async exportSearchData(): Promise<{
    history: SearchHistoryItem[];
    favorites: SearchFavorite[];
    exportedAt: number;
  }> {
    try {
      const [history, favorites] = await Promise.all([
        this.getSearchHistory(),
        this.getFavorites(),
      ]);

      return {
        history,
        favorites,
        exportedAt: Date.now(),
      };
    } catch (error) {
      console.error('[SearchHistory] Failed to export search data:', error);
      throw error;
    }
  }

  /**
   * Import search data from backup
   */
  static async importSearchData(data: {
    history?: SearchHistoryItem[];
    favorites?: SearchFavorite[];
  }): Promise<void> {
    try {
      if (data.history) {
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(data.history));
      }

      if (data.favorites) {
        await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_FAVORITES, JSON.stringify(data.favorites));
      }

    } catch (error) {
      console.error('[SearchHistory] Failed to import search data:', error);
      throw error;
    }
  }
}