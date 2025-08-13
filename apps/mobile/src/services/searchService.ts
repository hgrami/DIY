import { apiService } from './api';
import { Project } from '../@types';
import { SearchHistoryService } from './searchHistoryService';

// Search types based on the backend DIYSearchResult interface
export interface DIYSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  isYouTube: boolean;
  videoId?: string;
  score: number;
  publishedDate?: string;
  relevanceScore?: number;
  validationReasons?: string[];
  isValidated?: boolean;
  // Enhanced content detection fields
  contentType?: 'video' | 'visual' | 'article' | 'mixed';
  visualQuality?: 'high' | 'medium' | 'low';
  hasImages?: boolean;
  imageCount?: number;
  thumbnailUrl?: string;
  contentLength?: number;
  language?: string;
  isPinterest?: boolean;
  isGallery?: boolean;
  hasBeforeAfter?: boolean;
}

export interface SearchOptions {
  query: string;
  resourceType: 'tutorial' | 'inspiration' | 'materials';
  numResults?: number;
  contentType?: 'video' | 'visual' | 'article' | 'mixed';
  progressive?: boolean;
  projectContext?: {
    title: string;
    goal?: string;
    description?: string;
    materials?: string[];
    focusAreas?: string[];
  };
}

export interface SearchResponse {
  success: boolean;
  message: string;
  links: DIYSearchResult[];
  searchSuggestion?: string;
  fromCache?: boolean;
}

export interface ProgressiveSearchResult {
  batch: number;
  totalBatches: number;
  batchSize: number;
  isComplete: boolean;
  results: DIYSearchResult[];
  timing: {
    batchStart: number;
    batchEnd: number;
    totalElapsed: number;
  };
}

// Search history types
export interface SearchHistoryItem {
  id: string;
  query: string;
  resourceType: 'tutorial' | 'inspiration' | 'materials';
  contentType: 'video' | 'visual' | 'article' | 'mixed';
  projectId?: string;
  timestamp: number;
  resultCount: number;
}

export interface SearchFavorite {
  id: string;
  searchResult: DIYSearchResult;
  projectId?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
}

export class SearchService {
  // Cache for search results
  private static searchCache = new Map<string, {
    data: SearchResponse;
    timestamp: number;
    ttl: number;
  }>();

  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate cache key for search requests
   */
  private static generateCacheKey(options: SearchOptions): string {
    const { projectContext, ...searchParams } = options;
    const contextKey = projectContext ?
      JSON.stringify({
        title: projectContext.title,
        materials: projectContext.materials?.slice(0, 3) // Limit for key size
      }) : '';
    return `${JSON.stringify(searchParams)}-${contextKey}`;
  }

  /**
   * Check if cached result is still valid
   */
  private static isCacheValid(cacheEntry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  /**
   * Clean expired cache entries
   */
  private static cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.searchCache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.searchCache.delete(key);
      }
    }
  }

  /**
   * Build project context from Project object
   */
  static buildProjectContext(project: Project): SearchOptions['projectContext'] {
    return {
      title: project.title,
      goal: project.goal,
      description: project.description,
      materials: project.materials?.map(m => m.name) || [],
      focusAreas: project.notes?.map(n => n.content).slice(0, 3) || [], // Use first 3 notes as focus areas
    };
  }

  /**
   * Search for DIY resources
   */
  static async searchDIYResources(options: SearchOptions): Promise<SearchResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cachedResult = this.searchCache.get(cacheKey);

      if (cachedResult && this.isCacheValid(cachedResult)) {
        return { ...cachedResult.data, fromCache: true };
      }

      // Clean expired cache entries periodically
      this.cleanCache();

      // Make API request
      const response = await apiService.post<SearchResponse>('/api/search', options);

      if (!response.success || !response.data) {
        throw new Error('Search request failed');
      }

      // Cache the result
      this.searchCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      // Add to search history if successful
      if (response.data.success && response.data.links.length > 0) {
        await SearchHistoryService.addToHistory(
          options.query,
          options.resourceType,
          options.contentType || 'mixed',
          response.data.links.length,
          options.projectContext ? 'project-context' : undefined,
          options.projectContext?.title
        ).catch(err => console.warn('Failed to add to history:', err));
      }

      return response.data;

    } catch (error) {
      console.error('[SearchService] Search failed:', error);

      // Return graceful fallback
      return {
        success: false,
        message: 'Search temporarily unavailable. Please try again.',
        links: [],
        searchSuggestion: `Try searching for "${options.query}" on YouTube or DIY websites.`
      };
    }
  }

  /**
   * Progressive search with streaming results
   */
  static async *searchDIYResourcesProgressive(
    options: SearchOptions
  ): AsyncGenerator<ProgressiveSearchResult, void, unknown> {
    try {
      // Check cache first for complete results
      const cacheKey = this.generateCacheKey(options);
      const cachedResult = this.searchCache.get(cacheKey);

      if (cachedResult && this.isCacheValid(cachedResult) && cachedResult.data.links.length > 0) {
        // Yield cached results in batches for consistency
        const results = cachedResult.data.links;
        const batchSize = Math.max(2, Math.ceil(results.length / 3));
        const totalBatches = Math.ceil(results.length / batchSize);

        for (let i = 0; i < totalBatches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, results.length);
          const batch = results.slice(start, end);

          yield {
            batch: i + 1,
            totalBatches,
            batchSize: batch.length,
            isComplete: i === totalBatches - 1,
            results: batch,
            timing: {
              batchStart: Date.now(),
              batchEnd: Date.now(),
              totalElapsed: 0
            }
          };

          // Small delay between batches for realistic progressive feel
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        return;
      }

      // TODO: Implement server-sent events or WebSocket for real progressive search
      // For now, use regular search and simulate progressive delivery
      const startTime = Date.now();
      const searchResponse = await this.searchDIYResources({
        ...options,
        progressive: true
      });

      if (searchResponse.success && searchResponse.links.length > 0) {
        const results = searchResponse.links;
        const batchSize = Math.max(2, Math.ceil(results.length / 3));
        const totalBatches = Math.ceil(results.length / batchSize);

        for (let i = 0; i < totalBatches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, results.length);
          const batch = results.slice(start, end);

          const batchStart = Date.now();

          yield {
            batch: i + 1,
            totalBatches,
            batchSize: batch.length,
            isComplete: i === totalBatches - 1,
            results: batch,
            timing: {
              batchStart,
              batchEnd: Date.now(),
              totalElapsed: Date.now() - startTime
            }
          };

          // Realistic delay between batches
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
          }
        }
      } else {
        // Empty result batch
        yield {
          batch: 1,
          totalBatches: 1,
          batchSize: 0,
          isComplete: true,
          results: [],
          timing: {
            batchStart: startTime,
            batchEnd: Date.now(),
            totalElapsed: Date.now() - startTime
          }
        };
      }

    } catch (error) {
      console.error('[SearchService] Progressive search failed:', error);

      // Error batch
      yield {
        batch: 1,
        totalBatches: 1,
        batchSize: 0,
        isComplete: true,
        results: [],
        timing: {
          batchStart: Date.now(),
          batchEnd: Date.now(),
          totalElapsed: 0
        }
      };
    }
  }

  /**
   * Get search suggestions based on project context
   */
  static getSearchSuggestions(project: Project): string[] {
    const suggestions: string[] = [];

    // Add project-specific suggestions
    if (project.title) {
      suggestions.push(`${project.title} tutorial`);
      suggestions.push(`${project.title} inspiration`);
    }

    // Add material-based suggestions
    if (project.materials && project.materials.length > 0) {
      const topMaterials = project.materials.slice(0, 3);
      topMaterials.forEach(material => {
        suggestions.push(`${material.name} installation`);
        suggestions.push(`how to use ${material.name}`);
      });
    }

    // Add goal-based suggestions
    if (project.goal) {
      suggestions.push(`${project.goal} ideas`);
      suggestions.push(`${project.goal} tips`);
    }

    // Generic DIY suggestions
    const genericSuggestions = [
      'DIY home improvement',
      'beginner friendly projects',
      'step by step tutorials',
      'before and after transformations',
      'budget friendly DIY',
      'weekend projects'
    ];

    suggestions.push(...genericSuggestions);

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 10);
  }

  /**
   * Clear search cache
   */
  static clearCache(): void {
    this.searchCache.clear();
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
      await SearchHistoryService.addToFavorites(
        searchResult,
        projectId,
        projectTitle,
        tags,
        notes
      );
    } catch (error) {
      console.error('[SearchService] Failed to add to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove a search result from favorites
   */
  static async removeFromFavorites(url: string): Promise<void> {
    try {
      await SearchHistoryService.removeFromFavoritesByUrl(url);
    } catch (error) {
      console.error('[SearchService] Failed to remove from favorites:', error);
      throw error;
    }
  }

  /**
   * Check if a search result is favorited
   */
  static async isFavorited(url: string): Promise<boolean> {
    try {
      return await SearchHistoryService.isFavorited(url);
    } catch (error) {
      console.error('[SearchService] Failed to check if favorited:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.searchCache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 50) + '...', // Truncate for readability
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.searchCache.size,
      entries
    };
  }
}