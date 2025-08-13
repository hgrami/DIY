import Exa from 'exa-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const exa = new Exa(process.env.EXA_API_KEY);

// Search result cache with TTL
interface CacheEntry {
  results: DIYSearchResult[];
  timestamp: number;
  query: string;
  metadata: any;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private queryHistory = new Map<string, { count: number; lastUsed: number }>(); // Query frequency tracking
  private readonly TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_ENTRIES = 1000; // Maximum cache entries
  private readonly QUERY_HISTORY_TTL = 60 * 60 * 1000; // 1 hour for query history

  // Generate cache key from search parameters
  private generateCacheKey(
    query: string,
    resourceType: string,
    contentType: string,
    projectId?: string
  ): string {
    // Normalize query for better cache hits
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${normalizedQuery}:${resourceType}:${contentType}:${projectId || 'global'}`;
  }

  // Check if cache entry is still valid
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.TTL;
  }

  // Clean expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  // Get cached results
  get(
    query: string,
    resourceType: string,
    contentType: string,
    projectId?: string
  ): DIYSearchResult[] | null {
    const key = this.generateCacheKey(query, resourceType, contentType, projectId);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      console.log(`[Cache] Hit for query: "${query}"`);
      return entry.results;
    }
    
    console.log(`[Cache] Miss for query: "${query}"`);
    return null;
  }

  // Store results in cache
  set(
    query: string,
    resourceType: string,
    contentType: string,
    results: DIYSearchResult[],
    metadata?: any,
    projectId?: string
  ): void {
    // Clean up expired entries periodically
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    const key = this.generateCacheKey(query, resourceType, contentType, projectId);
    this.cache.set(key, {
      results: [...results], // Deep copy to avoid mutations
      timestamp: Date.now(),
      query,
      metadata
    });

    console.log(`[Cache] Stored results for query: "${query}"`);
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  // Track query usage for optimization
  trackQuery(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    const existing = this.queryHistory.get(normalizedQuery);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = Date.now();
    } else {
      this.queryHistory.set(normalizedQuery, {
        count: 1,
        lastUsed: Date.now()
      });
    }
    
    // Clean old query history
    this.cleanupQueryHistory();
  }

  // Clean expired query history
  private cleanupQueryHistory(): void {
    const cutoff = Date.now() - this.QUERY_HISTORY_TTL;
    for (const [query, data] of this.queryHistory.entries()) {
      if (data.lastUsed < cutoff) {
        this.queryHistory.delete(query);
      }
    }
  }

  // Get query frequency for optimization
  getQueryFrequency(query: string): number {
    const normalizedQuery = query.toLowerCase().trim();
    return this.queryHistory.get(normalizedQuery)?.count || 0;
  }

  // Get cache statistics
  getStats(): { size: number; hitRate?: number; queryHistorySize: number } {
    return {
      size: this.cache.size,
      queryHistorySize: this.queryHistory.size
    };
  }
}

// Global cache instance
const searchCache = new SearchCache();

// Performance monitoring
interface PerformanceMetrics {
  searchCount: number;
  totalSearchTime: number;
  averageSearchTime: number;
  cacheHitRate: number;
  errorRate: number;
  queryOptimizationRate: number;
  preFilterEfficiency: number;
  progressiveSearchUsage: number;
  slowSearchThreshold: number;
  slowSearchCount: number;
  lastReset: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    searchCount: 0,
    totalSearchTime: 0,
    averageSearchTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    queryOptimizationRate: 0,
    preFilterEfficiency: 0,
    progressiveSearchUsage: 0,
    slowSearchThreshold: 3000, // 3 seconds
    slowSearchCount: 0,
    lastReset: Date.now()
  };

  private searchTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private searchErrors = 0;
  private optimizedQueries = 0;
  private originalQueries = 0;
  private preFilteredCounts: { before: number; after: number }[] = [];
  private progressiveSearches = 0;

  // Record a search operation
  recordSearch(duration: number, wasOptimized: boolean, fromCache: boolean, error?: boolean): void {
    this.metrics.searchCount++;
    
    if (error) {
      this.searchErrors++;
    } else {
      this.searchTimes.push(duration);
      this.metrics.totalSearchTime += duration;
      
      if (duration > this.metrics.slowSearchThreshold) {
        this.metrics.slowSearchCount++;
      }
    }
    
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    if (wasOptimized) {
      this.optimizedQueries++;
    }
    this.originalQueries++;
    
    this.updateAverages();
  }

  // Record progressive search usage
  recordProgressiveSearch(): void {
    this.progressiveSearches++;
  }

  // Record pre-filtering efficiency
  recordPreFilterEfficiency(before: number, after: number): void {
    this.preFilteredCounts.push({ before, after });
    
    // Calculate average efficiency
    const totalBefore = this.preFilteredCounts.reduce((sum, item) => sum + item.before, 0);
    const totalAfter = this.preFilteredCounts.reduce((sum, item) => sum + item.after, 0);
    this.metrics.preFilterEfficiency = totalBefore > 0 ? (totalAfter / totalBefore) : 1;
  }

  // Update calculated averages
  private updateAverages(): void {
    if (this.searchTimes.length > 0) {
      this.metrics.averageSearchTime = this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length;
    }
    
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0;
    
    this.metrics.errorRate = this.metrics.searchCount > 0 ? this.searchErrors / this.metrics.searchCount : 0;
    
    this.metrics.queryOptimizationRate = this.originalQueries > 0 ? this.optimizedQueries / this.originalQueries : 0;
    
    this.metrics.progressiveSearchUsage = this.metrics.searchCount > 0 ? this.progressiveSearches / this.metrics.searchCount : 0;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateAverages();
    return { ...this.metrics };
  }

  // Get detailed performance report
  getDetailedReport(): {
    metrics: PerformanceMetrics;
    searchTimeDistribution: {
      fast: number; // < 1s
      medium: number; // 1-3s
      slow: number; // > 3s
    };
    cacheStats: ReturnType<SearchCache['getStats']>;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    
    // Categorize search times
    const fast = this.searchTimes.filter(t => t < 1000).length;
    const medium = this.searchTimes.filter(t => t >= 1000 && t < 3000).length;
    const slow = this.searchTimes.filter(t => t >= 3000).length;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (metrics.cacheHitRate < 0.3) {
      recommendations.push('Low cache hit rate. Consider increasing cache TTL or improving query normalization.');
    }
    
    if (metrics.averageSearchTime > 2000) {
      recommendations.push('High average search time. Consider enabling progressive loading or reducing numResults.');
    }
    
    if (metrics.errorRate > 0.05) {
      recommendations.push('High error rate detected. Check API connectivity and query validation.');
    }
    
    if (metrics.queryOptimizationRate < 0.5) {
      recommendations.push('Low query optimization usage. Review optimization criteria.');
    }
    
    if (metrics.preFilterEfficiency > 0.8) {
      recommendations.push('High pre-filter pass rate. Consider tightening filter criteria for better performance.');
    }
    
    if (metrics.progressiveSearchUsage < 0.2 && metrics.averageSearchTime > 1500) {
      recommendations.push('Consider using progressive search for better perceived performance.');
    }
    
    return {
      metrics,
      searchTimeDistribution: { fast, medium, slow },
      cacheStats: searchCache.getStats(),
      recommendations
    };
  }

  // Reset metrics (useful for periodic reporting)
  reset(): void {
    this.metrics = {
      searchCount: 0,
      totalSearchTime: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      queryOptimizationRate: 0,
      preFilterEfficiency: 0,
      progressiveSearchUsage: 0,
      slowSearchThreshold: this.metrics.slowSearchThreshold,
      slowSearchCount: 0,
      lastReset: Date.now()
    };
    
    this.searchTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.searchErrors = 0;
    this.optimizedQueries = 0;
    this.originalQueries = 0;
    this.preFilteredCounts = [];
    this.progressiveSearches = 0;
  }

  // Log performance summary
  logPerformanceSummary(): void {
    const report = this.getDetailedReport();
    
    console.log('\n=== EXA SEARCH PERFORMANCE SUMMARY ===');
    console.log(`Search Count: ${report.metrics.searchCount}`);
    console.log(`Average Search Time: ${report.metrics.averageSearchTime.toFixed(2)}ms`);
    console.log(`Cache Hit Rate: ${(report.metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Error Rate: ${(report.metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`Query Optimization Rate: ${(report.metrics.queryOptimizationRate * 100).toFixed(1)}%`);
    console.log(`Progressive Search Usage: ${(report.metrics.progressiveSearchUsage * 100).toFixed(1)}%`);
    console.log(`Slow Searches (>${report.metrics.slowSearchThreshold}ms): ${report.metrics.slowSearchCount}`);
    
    console.log('\nSearch Time Distribution:');
    console.log(`  Fast (<1s): ${report.searchTimeDistribution.fast}`);
    console.log(`  Medium (1-3s): ${report.searchTimeDistribution.medium}`);
    console.log(`  Slow (>3s): ${report.searchTimeDistribution.slow}`);
    
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    console.log('=====================================\n');
  }
}

// Global performance monitor
const performanceMonitor = new PerformanceMonitor();

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
  contentType?: 'video' | 'visual' | 'article' | 'mixed'; // New: specify desired content type
  progressive?: boolean; // Enable progressive result loading
  projectContext?: {
    title: string;
    goal?: string;
    description?: string;
    materials?: string[];
    focusAreas?: string[];
  };
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

export class ExaService {
  // Query deduplication cache (short-term)
  private static queryDeduplicationCache = new Map<string, Promise<DIYSearchResult[]>>();
  private static readonly DEDUP_TTL = 5 * 60 * 1000; // 5 minutes for deduplication

  // Trusted DIY domains for filtering results
  private static readonly DIY_DOMAINS = [
    'youtube.com',
    'homedepot.com',
    'lowes.com',
    'thisoldhouse.com',
    'familyhandyman.com',
    'diynetwork.com',
    'bobvila.com',
    'instructables.com',
    'wikihow.com',
    'ana-white.com',
    'shanty-2-chic.com',
    'buildwithbryan.com',
    'hammerhandhome.com',
    'remodelaholic.com',
    'prettyprudent.com',
    'abeautifulmess.com',
    'yellowbrickhome.com'
  ];

  // Common material/tool related domains
  private static readonly MATERIAL_DOMAINS = [
    ...ExaService.DIY_DOMAINS,
    'amazon.com',
    'menards.com',
    'wayfair.com',
    'overstock.com',
    'acehardware.com',
    'harborfreight.com'
  ];

  /**
   * Optimize and deduplicate search queries to improve performance
   */
  private static optimizeQuery(
    query: string,
    resourceType: string,
    contentType: string,
    projectContext?: SearchOptions['projectContext']
  ): string {
    let optimizedQuery = query.trim().toLowerCase();
    
    // Remove redundant words and filler terms
    const fillerWords = [
      'diy', 'project', 'home', 'improvement', 'tutorial', 'guide', 'how to', 'instructions',
      'step by step', 'easy', 'simple', 'quick', 'best', 'top', 'ideas', 'tips'
    ];
    
    // Only remove filler words if the query is long enough
    if (optimizedQuery.length > 30) {
      fillerWords.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        optimizedQuery = optimizedQuery.replace(regex, '').replace(/\s+/g, ' ').trim();
      });
    }
    
    // Enhance with project-specific terms
    if (projectContext) {
      const enhancementTerms: string[] = [];
      
      // Add key materials if not already mentioned
      if (projectContext.materials && projectContext.materials.length > 0) {
        const keyMaterials = projectContext.materials.slice(0, 2); // Top 2 materials
        keyMaterials.forEach(material => {
          if (!optimizedQuery.includes(material.toLowerCase())) {
            enhancementTerms.push(material);
          }
        });
      }
      
      // Add focus areas for context
      if (projectContext.focusAreas && projectContext.focusAreas.length > 0) {
        const keyFocus = projectContext.focusAreas.slice(0, 1); // Top focus area
        keyFocus.forEach(focus => {
          if (!optimizedQuery.includes(focus.toLowerCase()) && focus.length < 15) {
            enhancementTerms.push(focus);
          }
        });
      }
      
      if (enhancementTerms.length > 0) {
        optimizedQuery += ' ' + enhancementTerms.join(' ');
      }
    }
    
    // Add resource type context if not already present
    const resourceTerms = {
      'tutorial': ['tutorial', 'how to', 'guide', 'instructions'],
      'inspiration': ['ideas', 'inspiration', 'examples', 'gallery'],
      'materials': ['materials', 'supplies', 'tools', 'equipment']
    };
    
    const contextTerms = resourceTerms[resourceType as keyof typeof resourceTerms] || [];
    const hasResourceContext = contextTerms.some(term => optimizedQuery.includes(term));
    
    if (!hasResourceContext && resourceType !== 'materials') {
      // Add subtle context for tutorials and inspiration
      if (resourceType === 'tutorial') {
        optimizedQuery += ' tutorial';
      } else if (resourceType === 'inspiration') {
        optimizedQuery += ' ideas';
      }
    }
    
    // Clean up and normalize
    optimizedQuery = optimizedQuery.replace(/\s+/g, ' ').trim();
    
    // Ensure minimum query length
    if (optimizedQuery.length < 3) {
      optimizedQuery = query; // Fall back to original if optimization made it too short
    }
    
    return optimizedQuery;
  }

  /**
   * Generate deduplication key for queries
   */
  private static generateDedupKey(
    query: string,
    resourceType: string,
    contentType: string,
    numResults: number
  ): string {
    const normalizedQuery = this.optimizeQuery(query, resourceType, contentType);
    return `${normalizedQuery}:${resourceType}:${contentType}:${numResults}`;
  }

  /**
   * Deduplicate concurrent identical queries
   */
  private static async deduplicateQuery<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    // Check if there's an in-flight request for the same query
    const existingPromise = this.queryDeduplicationCache.get(key);
    
    if (existingPromise) {
      console.log(`[Exa] Deduplicating concurrent query: ${key.substring(0, 50)}...`);
      return existingPromise as Promise<T>;
    }
    
    // Execute the query and cache the promise
    const queryPromise = queryFn();
    this.queryDeduplicationCache.set(key, queryPromise as Promise<DIYSearchResult[]>);
    
    // Clean up after completion
    queryPromise.finally(() => {
      setTimeout(() => {
        this.queryDeduplicationCache.delete(key);
      }, this.DEDUP_TTL);
    });
    
    return queryPromise;
  }

  /**
   * Clean expired deduplication entries
   */
  private static cleanupDeduplication(): void {
    // This happens automatically via the setTimeout in deduplicateQuery
    // But we can add periodic cleanup if needed
    const currentSize = this.queryDeduplicationCache.size;
    if (currentSize > 100) { // Prevent memory leaks
      console.log(`[Exa] Clearing ${currentSize} deduplication entries to prevent memory leaks`);
      this.queryDeduplicationCache.clear();
    }
  }

  /**
   * Search with progressive result loading for improved perceived performance
   */
  static async *searchDIYResourcesProgressive(
    options: SearchOptions
  ): AsyncGenerator<ProgressiveSearchResult, void, unknown> {
    const { query, resourceType, numResults = 5, contentType = 'mixed', projectContext } = options;
    const startTime = Date.now();
    
    console.log(`[Exa] Starting progressive search for ${resourceType} resources: "${query}"`);
    
    // Track query for optimization analytics
    searchCache.trackQuery(query);
    
    // Record progressive search usage
    performanceMonitor.recordProgressiveSearch();
    
    // Optimize the query
    const optimizedQuery = this.optimizeQuery(query, resourceType, contentType, projectContext);
    if (optimizedQuery !== query) {
      console.log(`[Exa] Query optimized: "${query}" → "${optimizedQuery}"`);
    }

    // Check cache first
    const projectId = projectContext?.title ? 
      Buffer.from(projectContext.title).toString('base64').substring(0, 8) : undefined;
    
    const cachedResults = searchCache.get(query, resourceType, contentType, projectId);
    if (cachedResults && cachedResults.length >= numResults) {
      // Return cached results as a single batch
      yield {
        batch: 1,
        totalBatches: 1,
        batchSize: cachedResults.length,
        isComplete: true,
        results: cachedResults.slice(0, numResults),
        timing: {
          batchStart: startTime,
          batchEnd: Date.now(),
          totalElapsed: Date.now() - startTime
        }
      };
      return;
    }

    // Build contextual search query using optimized query
    const contextualQuery = this.buildContextualQuery(optimizedQuery, resourceType, projectContext, contentType);
    
    // Determine batch configuration
    const batchSize = Math.max(2, Math.ceil(numResults / 3)); // Aim for 3 batches
    const totalBatches = Math.ceil(numResults / batchSize);
    
    console.log(`[Exa] Progressive loading: ${totalBatches} batches of ~${batchSize} results each`);
    
    let collectedResults: DIYSearchResult[] = [];
    let batchNumber = 0;
    
    try {
      // Strategy 1: Quick initial batch with highest confidence results
      batchNumber++;
      const batchStart = Date.now();
      
      const initialResults = await this.performSingleSearch(
        contextualQuery, 
        resourceType, 
        contentType, 
        batchSize * 2 // Request more to ensure we get enough after filtering
      );
      
      const filteredInitial = initialResults.slice(0, batchSize);
      collectedResults.push(...filteredInitial);
      
      yield {
        batch: batchNumber,
        totalBatches,
        batchSize: filteredInitial.length,
        isComplete: false,
        results: filteredInitial,
        timing: {
          batchStart,
          batchEnd: Date.now(),
          totalElapsed: Date.now() - startTime
        }
      };
      
      // Strategy 2: Parallel searches for remaining results
      if (collectedResults.length < numResults && totalBatches > 1) {
        const remainingResults = numResults - collectedResults.length;
        const remainingBatches = totalBatches - 1;
        
        // Execute parallel searches for faster loading
        const parallelSearches = await this.executeProgressiveParallelSearches(
          optimizedQuery,
          resourceType,
          contentType,
          projectContext,
          remainingResults,
          remainingBatches,
          collectedResults.map(r => r.url) // Exclude already found URLs
        );
        
        // Yield results as they become available
        for (const batchResults of parallelSearches) {
          batchNumber++;
          const batchStart = Date.now();
          
          collectedResults.push(...batchResults);
          
          yield {
            batch: batchNumber,
            totalBatches,
            batchSize: batchResults.length,
            isComplete: batchNumber >= totalBatches || collectedResults.length >= numResults,
            results: batchResults,
            timing: {
              batchStart,
              batchEnd: Date.now(),
              totalElapsed: Date.now() - startTime
            }
          };
          
          if (collectedResults.length >= numResults) break;
        }
      }
      
      // Cache the complete results
      if (collectedResults.length > 0) {
        searchCache.set(query, resourceType, contentType, collectedResults, { 
          progressive: true,
          totalTime: Date.now() - startTime
        }, projectId);
      }
      
      console.log(`[Exa] Progressive search completed: ${collectedResults.length} results in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('[Exa] Progressive search error:', error);
      
      // Yield error batch if no results collected yet
      if (collectedResults.length === 0) {
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
    }
  }

  /**
   * Execute progressive parallel searches for remaining batches
   */
  private static async executeProgressiveParallelSearches(
    query: string,
    resourceType: string,
    contentType: string,
    projectContext: SearchOptions['projectContext'],
    remainingResults: number,
    remainingBatches: number,
    excludeUrls: string[]
  ): Promise<DIYSearchResult[][]> {
    const batchSize = Math.ceil(remainingResults / remainingBatches);
    const searches: Promise<DIYSearchResult[]>[] = [];
    
    // Create different search strategies for diversity
    const strategies = [
      // Strategy 1: Simplified query
      () => {
        const simplifiedQuery = this.simplifyQuery(query, resourceType, projectContext);
        return this.performSingleSearch(simplifiedQuery, resourceType, contentType, batchSize);
      },
      
      // Strategy 2: Content-type specific search
      () => {
        const specificQuery = contentType === 'visual' 
          ? this.buildVisualSpecificQuery(query, projectContext)
          : query;
        return this.performSingleSearch(specificQuery, resourceType, contentType, batchSize);
      },
      
      // Strategy 3: Backup with project context
      () => {
        if (projectContext?.title) {
          const titleQuery = this.buildBasicQuery(projectContext.title, resourceType, contentType);
          return this.performSingleSearch(titleQuery, resourceType, contentType, batchSize);
        }
        return Promise.resolve([]);
      }
    ];
    
    // Execute strategies up to remaining batches
    for (let i = 0; i < Math.min(strategies.length, remainingBatches); i++) {
      searches.push(
        strategies[i]().catch(error => {
          console.error(`[Exa] Progressive search strategy ${i + 1} failed:`, error);
          return [];
        })
      );
    }
    
    const results = await Promise.all(searches);
    
    // Filter out excluded URLs and limit results per batch
    return results.map(batchResults => 
      batchResults
        .filter(result => !excludeUrls.includes(result.url))
        .slice(0, batchSize)
    );
  }

  /**
   * Get performance metrics and detailed report
   */
  static getPerformanceMetrics(): ReturnType<PerformanceMonitor['getDetailedReport']> {
    return performanceMonitor.getDetailedReport();
  }

  /**
   * Log performance summary to console
   */
  static logPerformanceSummary(): void {
    performanceMonitor.logPerformanceSummary();
  }

  /**
   * Reset performance metrics (useful for testing or periodic resets)
   */
  static resetPerformanceMetrics(): void {
    performanceMonitor.reset();
  }

  /**
   * Search for DIY resources with project context awareness
   */
  static async searchDIYResources(options: SearchOptions): Promise<{
    success: boolean;
    message: string;
    links: DIYSearchResult[];
    searchSuggestion?: string;
    fromCache?: boolean;
  }> {
    const { query, resourceType, numResults = 5, projectContext, contentType = 'mixed' } = options;
    const startTime = Date.now();
    let optimizedQuery = query; // Initialize to original query

    try {

      console.log(`[Exa] Searching for ${resourceType} resources (${contentType}): "${query}"`);

      // Track query for optimization analytics
      searchCache.trackQuery(query);
      
      // Optimize the query
      optimizedQuery = this.optimizeQuery(query, resourceType, contentType, projectContext);
      if (optimizedQuery !== query) {
        console.log(`[Exa] Query optimized: "${query}" → "${optimizedQuery}"`);
      }

      // Generate deduplication key
      const dedupKey = this.generateDedupKey(query, resourceType, contentType, numResults);
      
      // Check cache first (using original query for cache key)
      const projectId = projectContext?.title ? 
        Buffer.from(projectContext.title).toString('base64').substring(0, 8) : undefined;
      
      const cachedResults = searchCache.get(query, resourceType, contentType, projectId);
      if (cachedResults && cachedResults.length >= numResults) {
        const searchTime = Date.now() - startTime;
        console.log(`[Exa] Cache hit, returning ${cachedResults.length} results in ${searchTime}ms`);
        
        // Record performance metrics for cache hit
        performanceMonitor.recordSearch(searchTime, optimizedQuery !== query, true);
        
        return {
          success: true,
          message: `Found ${cachedResults.slice(0, numResults).length} cached ${resourceType} resources for "${query}"`,
          links: cachedResults.slice(0, numResults),
          fromCache: true
        };
      }

      // Build contextual search query using optimized query
      const contextualQuery = this.buildContextualQuery(optimizedQuery, resourceType, projectContext, contentType);
      
      // Perform deduplicating search
      const searchResults = await this.deduplicateQuery(dedupKey, async () => {
        // Configure search parameters based on content type and resource type
        const searchConfig = this.getSearchConfig(resourceType, contentType, numResults);

        console.log(`[Exa] Search query: "${contextualQuery}"`);
        console.log(`[Exa] Search config:`, searchConfig);

        // Use parallel searches for better performance and coverage
        if (numResults >= 3) {
          // Use parallel searches for requests with 3+ results
          return await this.executeParallelSearches({
            ...options,
            query: optimizedQuery // Use optimized query
          }, contextualQuery, projectContext);
        } else {
          // Use single search for small requests
          const singleResult = await exa.searchAndContents(contextualQuery, searchConfig);
          return singleResult.results
            ? singleResult.results
                .map(result => this.processSearchResult(result, resourceType))
                .filter(result => result !== null) as DIYSearchResult[]
            : [];
        }
      });

      // Cleanup deduplication cache periodically
      this.cleanupDeduplication();

      if (!searchResults || searchResults.length === 0) {
        return {
          success: false,
          message: `No ${resourceType} resources found for "${query}". Try a more specific search term.`,
          links: [],
          searchSuggestion: this.generateSearchSuggestion(query, resourceType)
        };
      }

      // Use the processed results from parallel searches
      const processedResults = searchResults;

      // Validate results for relevance
      const validatedResults = processedResults.map(result => {
        const validation = this.validateResultRelevance(result, projectContext, query, resourceType);
        return {
          ...result,
          relevanceScore: validation.relevanceScore,
          validationReasons: validation.reasons,
          isValidated: validation.isRelevant
        };
      });

      // Filter out irrelevant results
      const relevantResults = validatedResults.filter(result => result.isValidated);
      
      console.log(`[Exa] Validation: ${validatedResults.length} total, ${relevantResults.length} relevant`);
      
      // If we have too few relevant results, try backup search strategies
      let finalResults = relevantResults.length >= Math.ceil(numResults * 0.7) 
        ? relevantResults 
        : [...relevantResults, ...validatedResults.filter(r => !r.isValidated).slice(0, numResults - relevantResults.length)];

      // If still insufficient results, try backup strategies
      if (finalResults.length < Math.ceil(numResults * 0.5)) {
        console.log(`[Exa] Insufficient results (${finalResults.length}), trying backup strategies`);
        const backupResults = await this.executeBackupSearchStrategies(
          { ...options, query: optimizedQuery }, contextualQuery, projectContext
        );
        
        // Merge with existing results, avoiding duplicates
        const existingUrls = new Set(finalResults.map(r => r.url));
        const newResults = backupResults
          .filter(r => !existingUrls.has(r.url))
          .map(result => {
            // Add validation fields to backup results
            const validation = this.validateResultRelevance(result, projectContext, query, resourceType);
            return {
              ...result,
              relevanceScore: validation.relevanceScore,
              validationReasons: validation.reasons,
              isValidated: validation.isRelevant
            };
          });
        finalResults = [...finalResults, ...newResults];
      }

      // Balance and filter results based on content type
      const balancedResults = this.balanceResults(finalResults, contentType, numResults, projectContext);

      // Cache the results for future use
      if (balancedResults.length > 0) {
        searchCache.set(query, resourceType, contentType, balancedResults, {
          searchTime: Date.now() - startTime,
          totalResults: processedResults.length,
          relevantResults: relevantResults.length
        }, projectId);
      }

      const totalSearchTime = Date.now() - startTime;
      console.log(`[Exa] Search completed in ${totalSearchTime}ms, returning ${balancedResults.length} results`);

      // Record performance metrics for successful search
      performanceMonitor.recordSearch(totalSearchTime, optimizedQuery !== query, false);

      return {
        success: true,
        message: `Found ${balancedResults.length} high-quality ${resourceType} resources for "${query}"`,
        links: balancedResults,
        searchSuggestion: balancedResults.length < numResults ? 
          this.generateSearchSuggestion(query, resourceType) : undefined
      };

    } catch (error) {
      const totalSearchTime = Date.now() - startTime;
      console.error('[Exa] Search error:', error);
      
      // Record performance metrics for failed search
      performanceMonitor.recordSearch(totalSearchTime, optimizedQuery !== query, false, true);
      
      return {
        success: false,
        message: `Search temporarily unavailable. Try searching directly on YouTube or DIY websites for "${options.query}".`,
        links: []
      };
    }
  }

  /**
   * Execute parallel search strategies for faster and more comprehensive results
   */
  private static async executeParallelSearches(
    options: SearchOptions,
    contextualQuery: string,
    projectContext?: SearchOptions['projectContext']
  ): Promise<DIYSearchResult[]> {
    const { resourceType, contentType = 'mixed', numResults = 5 } = options;
    
    try {
      console.log(`[Exa] Starting parallel searches for better performance`);
      const startTime = Date.now();

      // Create multiple search strategies to run in parallel
      const searchPromises: Promise<DIYSearchResult[]>[] = [];

      // Strategy 1: Main optimized query
      searchPromises.push(
        this.performSingleSearch(contextualQuery, resourceType, contentType, Math.ceil(numResults * 0.6))
          .catch(error => {
            console.error('[Exa] Main search failed:', error);
            return [];
          })
      );

      // Strategy 2: Simplified query (for broader results)
      if (contextualQuery.length > 20) {
        const simplifiedQuery = this.simplifyQuery(contextualQuery, resourceType, projectContext);
        if (simplifiedQuery !== contextualQuery) {
          searchPromises.push(
            this.performSingleSearch(simplifiedQuery, resourceType, contentType, Math.ceil(numResults * 0.4))
              .catch(error => {
                console.error('[Exa] Simplified search failed:', error);
                return [];
              })
          );
        }
      }

      // Strategy 3: Content-type specific search (for visual requests)
      if (contentType === 'visual' && resourceType === 'inspiration') {
        const visualQuery = this.buildVisualSpecificQuery(options.query, projectContext);
        searchPromises.push(
          this.performSingleSearch(visualQuery, resourceType, contentType, Math.ceil(numResults * 0.3))
            .catch(error => {
              console.error('[Exa] Visual search failed:', error);
              return [];
            })
        );
      }

      // Execute all searches in parallel
      const searchResults = await Promise.all(searchPromises);
      
      // Merge and deduplicate results
      const allResults: DIYSearchResult[] = [];
      const seenUrls = new Set<string>();

      for (const results of searchResults) {
        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allResults.push(result);
          }
        }
      }

      console.log(`[Exa] Parallel searches completed in ${Date.now() - startTime}ms, found ${allResults.length} unique results`);
      return allResults;

    } catch (error) {
      console.error('[Exa] Parallel search execution failed:', error);
      return [];
    }
  }

  /**
   * Build a visual-specific search query
   */
  private static buildVisualSpecificQuery(
    originalQuery: string,
    projectContext?: SearchOptions['projectContext']
  ): string {
    let visualQuery = originalQuery;
    
    // Add strong visual terms
    const visualTerms = ['photos', 'images', 'gallery', 'visual inspiration', 'before and after', 'design ideas'];
    const randomVisualTerms = visualTerms.slice(0, 2); // Use 2 random terms
    
    visualQuery += ' ' + randomVisualTerms.join(' ');
    
    // Add project context for visual searches
    if (projectContext?.title) {
      const titleWords = projectContext.title.split(' ').slice(0, 2); // First 2 words
      visualQuery += ' ' + titleWords.join(' ');
    }

    return visualQuery.trim();
  }

  /**
   * Execute backup search strategies when initial search yields poor results
   */
  private static async executeBackupSearchStrategies(
    originalOptions: SearchOptions,
    originalQuery: string,
    projectContext?: SearchOptions['projectContext']
  ): Promise<DIYSearchResult[]> {
    const backupResults: DIYSearchResult[] = [];
    const { resourceType, contentType = 'mixed', numResults = 5 } = originalOptions;

    try {
      // Strategy 1: Simplified query (remove complex terms)
      const simplifiedQuery = this.simplifyQuery(originalQuery, resourceType, projectContext);
      if (simplifiedQuery !== originalQuery) {
        console.log(`[Exa] Backup strategy 1: Simplified query "${simplifiedQuery}"`);
        const simplifiedResults = await this.performSingleSearch(simplifiedQuery, resourceType, contentType, 3);
        backupResults.push(...simplifiedResults);
      }

      // Strategy 2: Broader search with just project title
      if (projectContext?.title && backupResults.length < numResults) {
        const titleQuery = this.buildBasicQuery(projectContext.title, resourceType, contentType);
        console.log(`[Exa] Backup strategy 2: Title-based query "${titleQuery}"`);
        const titleResults = await this.performSingleSearch(titleQuery, resourceType, contentType, 3);
        backupResults.push(...titleResults);
      }

      // Strategy 3: Generic resource type search
      if (backupResults.length < numResults) {
        const genericQuery = this.buildGenericQuery(resourceType, contentType);
        console.log(`[Exa] Backup strategy 3: Generic query "${genericQuery}"`);
        const genericResults = await this.performSingleSearch(genericQuery, resourceType, contentType, 2);
        backupResults.push(...genericResults);
      }

      // Remove duplicates and return
      const uniqueResults = backupResults.filter((result, index, self) =>
        index === self.findIndex(r => r.url === result.url)
      );

      console.log(`[Exa] Backup strategies found ${uniqueResults.length} additional results`);
      return uniqueResults;

    } catch (error) {
      console.error('[Exa] Backup search strategies failed:', error);
      return [];
    }
  }

  /**
   * Pre-filter search results to reduce processing overhead
   * This runs before expensive validation and scoring operations
   */
  private static preFilterResults(
    rawResults: any[],
    query: string,
    resourceType: string,
    contentType: string
  ): any[] {
    const startTime = Date.now();
    const queryLowerCase = query.toLowerCase();
    const queryTerms = queryLowerCase.split(/\s+/).filter(term => term.length > 2);
    
    const filtered = rawResults.filter(result => {
      // Early rejection filters (fast checks)
      
      // 1. URL-based filtering
      if (!this.isValidDIYUrl(result.url, resourceType)) {
        return false;
      }
      
      // 2. Title relevance check
      const titleLowerCase = (result.title || '').toLowerCase();
      const hasRelevantTitle = queryTerms.some(term => 
        titleLowerCase.includes(term) || this.isSemanticMatch(term, titleLowerCase)
      );
      
      if (!hasRelevantTitle) {
        return false;
      }
      
      // 3. Content type mismatch filtering
      if (contentType !== 'mixed' && !this.matchesContentType(result, contentType)) {
        return false;
      }
      
      // 4. Language filtering (English only for DIY)
      if (result.text && this.detectNonEnglish(result.text)) {
        return false;
      }
      
      // 5. Commercial spam filtering
      if (this.isCommercialSpam(result, resourceType)) {
        return false;
      }
      
      return true;
    });
    
    const filterTime = Date.now() - startTime;
    console.log(`[Exa] Pre-filtered ${rawResults.length} → ${filtered.length} results in ${filterTime}ms`);
    
    // Record pre-filtering efficiency for performance monitoring
    performanceMonitor.recordPreFilterEfficiency(rawResults.length, filtered.length);
    
    return filtered;
  }

  /**
   * Check if URL is valid for DIY content
   */
  private static isValidDIYUrl(url: string, resourceType: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase().replace('www.', '');
      
      // Check against trusted domains
      const relevantDomains = resourceType === 'materials' 
        ? this.MATERIAL_DOMAINS 
        : this.DIY_DOMAINS;
        
      const isTrustedDomain = relevantDomains.some(trustedDomain => 
        domain.includes(trustedDomain.replace('www.', ''))
      );
      
      if (isTrustedDomain) return true;
      
      // Additional domain patterns for DIY content
      const diyPatterns = [
        /.*diy.*/,
        /.*build.*/,
        /.*maker.*/,
        /.*craft.*/,
        /.*wood.*/,
        /.*tool.*/,
        /.*repair.*/,
        /.*fix.*/,
        /.*home.*improvement.*/,
        /.*construction.*/
      ];
      
      return diyPatterns.some(pattern => pattern.test(domain));
    } catch {
      return false;
    }
  }

  /**
   * Check for semantic matches between terms
   */
  private static isSemanticMatch(term: string, text: string): boolean {
    const semanticMappings: Record<string, string[]> = {
      'repair': ['fix', 'restore', 'mend', 'rebuild'],
      'build': ['construct', 'make', 'create', 'assemble'],
      'install': ['mount', 'attach', 'setup', 'place'],
      'paint': ['painting', 'painted', 'color', 'finish'],
      'wood': ['wooden', 'lumber', 'timber', 'plywood'],
      'kitchen': ['countertop', 'cabinet', 'appliance'],
      'bathroom': ['toilet', 'shower', 'sink', 'vanity'],
      'garden': ['outdoor', 'yard', 'landscaping', 'plants']
    };
    
    const synonyms = semanticMappings[term] || [];
    return synonyms.some(synonym => text.includes(synonym));
  }

  /**
   * Check if result matches desired content type
   */
  private static matchesContentType(result: any, contentType: string): boolean {
    const url = result.url || '';
    const title = (result.title || '').toLowerCase();
    const text = (result.text || '').toLowerCase();
    
    switch (contentType) {
      case 'video':
        return url.includes('youtube.com') || url.includes('vimeo.com') || 
               title.includes('video') || title.includes('tutorial');
               
      case 'visual':
        return url.includes('pinterest.com') || url.includes('instagram.com') ||
               title.includes('photo') || title.includes('image') || 
               title.includes('gallery') || title.includes('before and after');
               
      case 'article':
        return !url.includes('youtube.com') && !url.includes('pinterest.com') &&
               (text.length > 500 || title.includes('guide') || title.includes('how to'));
               
      default:
        return true;
    }
  }

  /**
   * Detect non-English content (basic check)
   */
  private static detectNonEnglish(text: string): boolean {
    if (!text || text.length < 50) return false;
    
    // Check for common non-English patterns
    const nonEnglishPatterns = [
      /[ñáéíóúüç]/gi, // Spanish/Portuguese
      /[àâäéèêëïîôöùûüÿ]/gi, // French
      /[äöüßẞ]/gi, // German
      /[αβγδεζηθικλμνξοπρστυφχψω]/gi, // Greek
      /[а-я]/gi, // Russian/Cyrillic
      /[一-龯]/g, // Chinese
      /[ひらがなカタカナ]/g, // Japanese
      /[가-힣]/g, // Korean
    ];
    
    const nonEnglishCharCount = nonEnglishPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // If more than 5% of characters are non-English, likely foreign content
    return (nonEnglishCharCount / text.length) > 0.05;
  }

  /**
   * Detect commercial spam content
   */
  private static isCommercialSpam(result: any, resourceType: string): boolean {
    const title = (result.title || '').toLowerCase();
    const text = (result.text || '').toLowerCase();
    const url = result.url || '';
    
    // Commercial spam indicators
    const spamIndicators = [
      'buy now', 'on sale', '% off', 'discount', 'coupon',
      'limited time', 'act now', 'exclusive deal', 'free shipping',
      'compare prices', 'best price', 'lowest price'
    ];
    
    // For materials searches, some commercial content is expected
    if (resourceType === 'materials') {
      return false;
    }
    
    // Check for excessive commercial language
    const spamCount = spamIndicators.filter(indicator => 
      title.includes(indicator) || text.includes(indicator)
    ).length;
    
    // If multiple spam indicators present, likely commercial spam
    return spamCount >= 3;
  }

  /**
   * Perform a single search with basic configuration and pre-filtering
   */
  private static async performSingleSearch(
    query: string,
    resourceType: string,
    contentType: string,
    numResults: number
  ): Promise<DIYSearchResult[]> {
    try {
      const searchConfig = {
        numResults: Math.min(numResults * 2, 20), // Request more to account for filtering
        useAutoprompt: false, // Don't modify backup queries
        type: 'neural' as const,
        text: {
          includeHtmlTags: false,
          maxCharacters: 1500
        }
      };

      const searchResult = await exa.searchAndContents(query, searchConfig);
      
      if (!searchResult.results || searchResult.results.length === 0) {
        return [];
      }

      // Apply pre-filtering before expensive processing
      const preFilteredResults = this.preFilterResults(
        searchResult.results, 
        query, 
        resourceType, 
        contentType
      );

      const processedResults = preFilteredResults
        .map(result => this.processSearchResult(result, resourceType))
        .filter(result => result !== null) as DIYSearchResult[];
      
      return processedResults.slice(0, numResults);

    } catch (error) {
      console.error(`[Exa] Single search failed for "${query}":`, error);
      return [];
    }
  }

  /**
   * Simplify a complex query by removing advanced terms
   */
  private static simplifyQuery(
    originalQuery: string,
    resourceType: string,
    projectContext?: SearchOptions['projectContext']
  ): string {
    let simplified = originalQuery;

    // Remove common filler words and phrases
    const fillerPhrases = [
      'photos images gallery pictures visual examples before after',
      'video tutorial how to watch',
      'guide article blog post instructions',
      'DIY project home improvement',
      'ideas examples inspiration design showcase',
      'materials tools supplies equipment list'
    ];

    fillerPhrases.forEach(phrase => {
      simplified = simplified.replace(phrase, '');
    });

    // Clean up extra spaces
    simplified = simplified.replace(/\s+/g, ' ').trim();

    // If too short, add basic project context
    if (simplified.length < 10 && projectContext?.title) {
      simplified = `${projectContext.title} ${resourceType}`;
    }

    return simplified || originalQuery;
  }

  /**
   * Build a basic query from project title
   */
  private static buildBasicQuery(
    projectTitle: string,
    resourceType: string,
    contentType: string
  ): string {
    const typeTerms = {
      tutorial: 'tutorial how to guide',
      inspiration: 'ideas inspiration examples',
      materials: 'materials tools supplies'
    };

    const contentTerms = {
      video: 'video',
      visual: 'photos images',
      article: 'guide',
      mixed: ''
    };

    return `${projectTitle} ${typeTerms[resourceType as keyof typeof typeTerms] || ''} ${contentTerms[contentType as keyof typeof contentTerms] || ''}`.trim();
  }

  /**
   * Build a generic query as last resort
   */
  private static buildGenericQuery(resourceType: string, contentType: string): string {
    const genericTerms = {
      tutorial: 'DIY home improvement tutorial how to',
      inspiration: 'home improvement ideas inspiration examples',
      materials: 'DIY tools materials supplies home improvement'
    };

    const contentTerms = {
      video: 'video',
      visual: 'photos gallery',
      article: 'guide tips',
      mixed: ''
    };

    return `${genericTerms[resourceType as keyof typeof genericTerms] || 'DIY home improvement'} ${contentTerms[contentType as keyof typeof contentTerms] || ''}`.trim();
  }

  /**
   * Find similar content based on a reference URL
   */
  static async findSimilarContent(url: string, projectContext?: SearchOptions['projectContext']): Promise<{
    success: boolean;
    message: string;
    links: DIYSearchResult[];
  }> {
    try {
      console.log(`[Exa] Finding similar content to: ${url}`);

      const similarResult = await exa.findSimilar(url, {
        numResults: 5,
        includeDomains: ExaService.DIY_DOMAINS,
        excludeSourceDomain: false // Keep results from same domain if they're good
      });

      if (!similarResult.results || similarResult.results.length === 0) {
        return {
          success: false,
          message: 'No similar content found.',
          links: []
        };
      }

      const processedResults = similarResult.results
        .map(result => this.processSearchResult(result, 'inspiration'))
        .filter(result => result !== null)
        .sort((a, b) => (b!.score * this.getRelevanceBoost(b!, projectContext)) - 
                       (a!.score * this.getRelevanceBoost(a!, projectContext))) as DIYSearchResult[];

      return {
        success: true,
        message: `Found ${processedResults.length} similar DIY resources`,
        links: processedResults
      };

    } catch (error) {
      console.error('[Exa] Find similar error:', error);
      return {
        success: false,
        message: 'Unable to find similar content at the moment.',
        links: []
      };
    }
  }

  /**
   * Balance and filter results based on content type preferences
   */
  private static balanceResults(
    results: DIYSearchResult[],
    contentType: 'video' | 'visual' | 'article' | 'mixed',
    targetCount: number,
    projectContext?: SearchOptions['projectContext']
  ): DIYSearchResult[] {
    // Calculate comprehensive similarity scores for all results
    const scoredResults = results.map(result => ({
      ...result,
      finalScore: this.calculateProjectSimilarityScore(result, projectContext, 'mixed')
    }));

    // Sort by final similarity score
    const sortedResults = scoredResults.sort((a, b) => b.finalScore - a.finalScore);

    // If mixed content, try to get a balanced mix
    if (contentType === 'mixed') {
      return this.getMixedResults(sortedResults, targetCount);
    }

    // For specific content types, filter and prioritize accordingly
    if (contentType === 'video') {
      const videoResults = sortedResults.filter(r => r.isYouTube);
      const otherResults = sortedResults.filter(r => !r.isYouTube);
      return [...videoResults, ...otherResults].slice(0, targetCount);
    }

    if (contentType === 'visual') {
      // Prioritize high-quality visual content with sophisticated scoring
      const visualResults = sortedResults
        .filter(r => this.isVisualContent(r))
        .sort((a, b) => this.calculateVisualQualityScore(b) - this.calculateVisualQualityScore(a));
      
      const otherResults = sortedResults.filter(r => !this.isVisualContent(r));
      return [...visualResults, ...otherResults].slice(0, targetCount);
    }

    if (contentType === 'article') {
      // Prioritize non-video content
      const articleResults = sortedResults.filter(r => !r.isYouTube);
      return articleResults.slice(0, targetCount);
    }

    return sortedResults.slice(0, targetCount);
  }

  /**
   * Get a balanced mix of different content types
   */
  private static getMixedResults(results: DIYSearchResult[], targetCount: number): DIYSearchResult[] {
    const videos = results.filter(r => r.isYouTube);
    const visual = results.filter(r => !r.isYouTube && this.isVisualContent(r));
    const articles = results.filter(r => !r.isYouTube && !this.isVisualContent(r));

    const mixed: DIYSearchResult[] = [];
    const buckets = [videos, visual, articles];
    let bucketIndex = 0;

    // Round-robin through different content types
    while (mixed.length < targetCount && buckets.some(bucket => bucket.length > 0)) {
      const currentBucket = buckets[bucketIndex % buckets.length];
      if (currentBucket.length > 0) {
        const item = currentBucket.shift();
        if (item && !mixed.find(r => r.url === item.url)) {
          mixed.push(item);
        }
      }
      bucketIndex++;
    }

    return mixed;
  }

  /**
   * Comprehensive content analysis and classification
   */
  private static analyzeContentType(result: any, fullText?: string): {
    contentType: 'video' | 'visual' | 'article' | 'mixed';
    visualQuality: 'high' | 'medium' | 'low';
    hasImages: boolean;
    imageCount: number;
    isGallery: boolean;
    hasBeforeAfter: boolean;
    isPinterest: boolean;
    thumbnailUrl?: string;
  } {
    const title = result.title?.toLowerCase() || '';
    const snippet = result.snippet?.toLowerCase() || '';
    const text = fullText?.toLowerCase() || '';
    const url = result.url?.toLowerCase() || '';
    const content = title + ' ' + snippet + ' ' + text;

    // Determine content type
    let contentType: 'video' | 'visual' | 'article' | 'mixed' = 'article';
    
    // Video detection
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') ||
        content.includes('video') || content.includes('tutorial') || content.includes('watch')) {
      contentType = 'video';
    }
    
    // Visual content detection (high priority indicators)
    const strongVisualIndicators = [
      'gallery', 'photos', 'images', 'pinterest', 'before and after',
      'photo gallery', 'picture', 'visual', 'showcase', 'lookbook'
    ];
    
    const visualScore = strongVisualIndicators.filter(indicator => 
      content.includes(indicator)
    ).length;
    
    if (visualScore >= 2 || url.includes('pinterest.com') || url.includes('houzz.com')) {
      contentType = 'visual';
    } else if (visualScore >= 1 && contentType !== 'video') {
      contentType = 'mixed';
    }

    // Visual quality assessment
    let visualQuality: 'high' | 'medium' | 'low' = 'low';
    
    const highQualityIndicators = [
      'professional', 'hd', 'high quality', 'photography', 'architect',
      'designer', 'magazine', 'featured', 'award', 'beautiful'
    ];
    
    const mediumQualityIndicators = [
      'gallery', 'photos', 'before after', 'makeover', 'renovation',
      'project', 'design', 'inspiration'
    ];

    if (highQualityIndicators.some(indicator => content.includes(indicator))) {
      visualQuality = 'high';
    } else if (mediumQualityIndicators.some(indicator => content.includes(indicator))) {
      visualQuality = 'medium';
    }

    // Image detection and counting
    const imageIndicators = ['photo', 'image', 'picture', 'gallery', 'visual'];
    const hasImages = imageIndicators.some(indicator => content.includes(indicator)) || 
                     contentType === 'visual' || 
                     url.includes('pinterest.com');

    // Estimate image count based on content
    let imageCount = 0;
    if (content.includes('gallery') || content.includes('photos')) imageCount += 5;
    if (content.includes('step by step') && hasImages) imageCount += 3;
    if (content.includes('before and after')) imageCount += 2;
    if (hasImages && imageCount === 0) imageCount = 1;

    // Gallery detection
    const isGallery = content.includes('gallery') || 
                     content.includes('photos') || 
                     content.includes('collection') ||
                     url.includes('pinterest.com') ||
                     imageCount >= 5;

    // Before/after detection
    const hasBeforeAfter = content.includes('before and after') ||
                          content.includes('before/after') ||
                          content.includes('makeover') ||
                          content.includes('transformation');

    // Pinterest detection
    const isPinterest = url.includes('pinterest.com') || 
                       result.source?.toLowerCase().includes('pinterest');

    // Try to extract thumbnail URL
    let thumbnailUrl: string | undefined;
    if (result.url?.includes('youtube.com') || result.url?.includes('youtu.be')) {
      const videoId = this.extractYouTubeId(result.url);
      if (videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }

    return {
      contentType,
      visualQuality,
      hasImages,
      imageCount,
      isGallery,
      hasBeforeAfter,
      isPinterest,
      thumbnailUrl
    };
  }

  /**
   * Extract additional metadata for better content understanding
   */
  private static extractContentMetadata(result: any, text: string, contentAnalysis: any): {
    language: string;
    readingTime?: number;
    complexity?: 'simple' | 'moderate' | 'complex';
    hasSteps?: boolean;
    hasMaterials?: boolean;
    hasWarnings?: boolean;
  } {
    const content = (result.title + ' ' + text).toLowerCase();
    
    // Language detection (simple heuristic)
    let language = 'en'; // Default to English
    
    // Spanish indicators
    if (content.includes('cómo') || content.includes('paso a paso') || 
        content.includes('materiales') || content.includes('proyecto')) {
      language = 'es';
    }
    
    // French indicators  
    else if (content.includes('comment') || content.includes('étape') || 
             content.includes('matériaux') || content.includes('projet')) {
      language = 'fr';
    }

    // Reading time estimation (words per minute: ~200)
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Content complexity assessment
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    const complexityIndicators = {
      simple: ['easy', 'simple', 'quick', 'basic', 'beginner'],
      moderate: ['intermediate', 'moderate', 'some experience', 'medium'],
      complex: ['advanced', 'complex', 'expert', 'professional', 'difficult', 'technical']
    };

    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => content.includes(indicator))) {
        complexity = level as 'simple' | 'moderate' | 'complex';
        break;
      }
    }

    // Content structure detection
    const hasSteps = content.includes('step') || 
                    content.includes('stage') || 
                    content.includes('phase') ||
                    /\d+\.\s/.test(content); // Numbered lists

    const hasMaterials = content.includes('materials') || 
                        content.includes('supplies') || 
                        content.includes('tools') ||
                        content.includes('you will need');

    const hasWarnings = content.includes('warning') || 
                       content.includes('caution') || 
                       content.includes('safety') ||
                       content.includes('careful');

    return {
      language,
      readingTime: readingTime > 0 ? readingTime : undefined,
      complexity,
      hasSteps,
      hasMaterials,
      hasWarnings
    };
  }

  /**
   * Calculate visual quality score for prioritizing visual content
   */
  private static calculateVisualQualityScore(result: DIYSearchResult): number {
    let score = 0;

    // Base content type scoring
    if (result.contentType === 'visual') score += 50;
    else if (result.contentType === 'mixed') score += 25;

    // Visual quality scoring
    if (result.visualQuality === 'high') score += 30;
    else if (result.visualQuality === 'medium') score += 15;

    // Gallery and special content bonuses
    if (result.isGallery) score += 20;
    if (result.hasBeforeAfter) score += 15;
    if (result.isPinterest) score += 10; // Pinterest is inherently visual

    // Image count scoring
    if (result.imageCount) {
      if (result.imageCount >= 10) score += 20;
      else if (result.imageCount >= 5) score += 15;
      else if (result.imageCount >= 2) score += 10;
      else if (result.imageCount >= 1) score += 5;
    }

    // Source quality bonus for visual platforms
    const visualPlatformBonus: Record<string, number> = {
      'Pinterest': 25,
      'Houzz': 20,
      'HGTV': 15,
      'Better Homes': 15,
      'Apartment Therapy': 12,
      'House Beautiful': 12,
      'Elle Decor': 10
    };

    for (const [platform, bonus] of Object.entries(visualPlatformBonus)) {
      if (result.source.includes(platform)) {
        score += bonus;
        break;
      }
    }

    // Tag-based bonuses for visual content
    const visualTags = ['gallery', 'before-after', 'high-quality', 'visual'];
    const visualTagMatches = result.tags.filter(tag => visualTags.includes(tag)).length;
    score += visualTagMatches * 5;

    // Penalty for low-quality indicators
    if (result.visualQuality === 'low' && result.contentType !== 'visual') {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Determine if content is likely to be visual/image-rich (legacy method)
   */
  private static isVisualContent(result: DIYSearchResult): boolean {
    return result.contentType === 'visual' || 
           result.isGallery === true || 
           result.visualQuality === 'high' ||
           (result.hasImages === true && result.imageCount !== undefined && result.imageCount > 1);
  }

  /**
   * Validate if a search result is relevant to the project context
   */
  private static validateResultRelevance(
    result: DIYSearchResult,
    projectContext: SearchOptions['projectContext'],
    originalQuery: string,
    resourceType: string
  ): { isRelevant: boolean; relevanceScore: number; reasons: string[] } {
    const content = (result.title + ' ' + result.snippet).toLowerCase();
    const originalWords = originalQuery.toLowerCase().split(/\s+/);
    const reasons: string[] = [];
    let relevanceScore = 0;

    // Check for original query terms (high importance)
    const queryMatches = originalWords.filter(word => 
      word.length > 3 && content.includes(word)
    ).length;
    const queryMatchRatio = queryMatches / Math.max(originalWords.length, 1);
    
    if (queryMatchRatio > 0.3) {
      relevanceScore += 40;
      reasons.push(`Matches ${Math.round(queryMatchRatio * 100)}% of search terms`);
    }

    // Check for project-specific terms
    if (projectContext) {
      // Project title words
      if (projectContext.title) {
        const titleWords = projectContext.title.toLowerCase().split(/\s+/);
        const titleMatches = titleWords.filter(word => 
          word.length > 3 && content.includes(word)
        ).length;
        if (titleMatches > 0) {
          relevanceScore += titleMatches * 15;
          reasons.push(`Matches project title terms`);
        }
      }

      // Materials mentioned
      if (projectContext.materials && projectContext.materials.length > 0) {
        const materialMatches = projectContext.materials.filter(material =>
          content.includes(material.toLowerCase())
        ).length;
        if (materialMatches > 0) {
          relevanceScore += materialMatches * 10;
          reasons.push(`Mentions project materials`);
        }
      }

      // Focus areas
      if (projectContext.focusAreas && projectContext.focusAreas.length > 0) {
        const focusMatches = projectContext.focusAreas.filter(area =>
          content.includes(area.toLowerCase())
        ).length;
        if (focusMatches > 0) {
          relevanceScore += focusMatches * 8;
          reasons.push(`Matches project focus areas`);
        }
      }
    }

    // Check for common DIY relevance
    const diyTerms = ['diy', 'how to', 'tutorial', 'guide', 'repair', 'fix', 'install', 'build', 'project'];
    const diyMatches = diyTerms.filter(term => content.includes(term)).length;
    if (diyMatches > 0) {
      relevanceScore += diyMatches * 3;
      reasons.push(`Contains DIY-related terms`);
    }

    // Check for resource type relevance
    const resourceTerms = {
      tutorial: ['tutorial', 'how to', 'step by step', 'guide', 'instructions'],
      inspiration: ['inspiration', 'ideas', 'examples', 'design', 'gallery', 'showcase'],
      materials: ['materials', 'tools', 'supplies', 'equipment', 'buy', 'shop']
    };

    const typeTerms = resourceTerms[resourceType as keyof typeof resourceTerms] || [];
    const typeMatches = typeTerms.filter(term => content.includes(term)).length;
    if (typeMatches > 0) {
      relevanceScore += typeMatches * 5;
      reasons.push(`Relevant to ${resourceType} search`);
    }

    // Penalty for completely unrelated content
    const unrelatedTerms = [
      'recipe', 'cooking', 'food', 'restaurant', 'menu',
      'vacation', 'travel', 'hotel', 'flight',
      'clothing', 'fashion', 'style', 'outfit',
      'movie', 'film', 'tv show', 'entertainment',
      'sports', 'game', 'team', 'player',
      'software', 'app', 'code', 'programming',
      'car', 'automotive', 'vehicle', 'engine'
    ];

    const unrelatedMatches = unrelatedTerms.filter(term => content.includes(term)).length;
    if (unrelatedMatches > 0) {
      relevanceScore -= unrelatedMatches * 20;
      reasons.push(`Contains unrelated terms`);
    }

    // Final relevance determination
    const isRelevant = relevanceScore >= 25 && queryMatchRatio > 0.1;

    return {
      isRelevant,
      relevanceScore: Math.max(0, relevanceScore),
      reasons
    };
  }

  /**
   * Get search configuration based on content type and resource type
   */
  private static getSearchConfig(
    resourceType: 'tutorial' | 'inspiration' | 'materials',
    contentType: 'video' | 'visual' | 'article' | 'mixed',
    numResults: number
  ) {
    const baseConfig = {
      numResults: Math.min(numResults * 2, 20), // Get more results to filter later
      useAutoprompt: true,
      type: 'neural' as const,
      text: {
        includeHtmlTags: false,
        maxCharacters: 2000
      }
    };

    // For visual content, we want to cast a wider net and rely on content filtering
    if (contentType === 'visual' || resourceType === 'inspiration') {
      return {
        ...baseConfig,
        // Remove domain restrictions for visual content to get diverse sources
        // includeDomains: undefined, // Let Exa find the best visual content anywhere
        text: {
          includeHtmlTags: false,
          maxCharacters: 2500 // More text for better content analysis
        }
      };
    }

    // For materials, include shopping/retail domains but don't restrict too much
    if (resourceType === 'materials') {
      return {
        ...baseConfig,
        includeDomains: ExaService.MATERIAL_DOMAINS,
      };
    }

    // For tutorials and mixed content, use the DIY domains but more flexibly
    return {
      ...baseConfig,
      // Only use domain restrictions for tutorials to ensure quality
      includeDomains: contentType === 'video' ? ExaService.DIY_DOMAINS : undefined,
    };
  }

  /**
   * Build a contextual search query incorporating project information
   */
  private static buildContextualQuery(
    originalQuery: string,
    resourceType: 'tutorial' | 'inspiration' | 'materials',
    projectContext?: SearchOptions['projectContext'],
    contentType?: 'video' | 'visual' | 'article' | 'mixed'
  ): string {
    let contextualQuery = originalQuery;

    // Add content-type specific terms first
    if (contentType) {
      const contentTypeTerms = {
        video: 'video tutorial how to watch',
        visual: 'photos images gallery pictures visual examples before after',
        article: 'guide article blog post instructions',
        mixed: ''
      };
      if (contentTypeTerms[contentType]) {
        contextualQuery += ' ' + contentTypeTerms[contentType];
      }
    }

    // Add resource type context (more generic)
    const resourceTypeTerms = {
      tutorial: 'how to step by step guide instructions',
      inspiration: 'ideas examples inspiration design showcase',
      materials: 'materials tools supplies equipment list'
    };

    contextualQuery += ' ' + resourceTypeTerms[resourceType];

    // Add project context generically if available
    if (projectContext) {
      // Only add goal if it's not too specific
      if (projectContext.goal && projectContext.goal.length < 50) {
        contextualQuery += ` project`;
      }

      // Add focus areas only if they're general enough
      if (projectContext.focusAreas && projectContext.focusAreas.length > 0) {
        const generalAreas = projectContext.focusAreas.filter(area => 
          area.length < 20 && !area.includes('specific') && !area.includes('particular')
        );
        if (generalAreas.length > 0) {
          contextualQuery += ` ${generalAreas.slice(0, 2).join(' ')}`;
        }
      }
    }

    // Add generic DIY context
    contextualQuery += ' DIY project home improvement';

    return contextualQuery.trim();
  }

  /**
   * Process a raw Exa search result into our DIY format
   */
  private static processSearchResult(result: any, resourceType: string): DIYSearchResult | null {
    try {
      const url = result.url;
      const title = result.title || 'Untitled';
      const snippet = result.text || result.snippet || '';
      
      // Extract source domain
      const urlObj = new URL(url);
      const source = this.formatSourceName(urlObj.hostname);

      // Check if it's YouTube
      const isYouTube = urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
      const videoId = isYouTube ? this.extractYouTubeId(url) : undefined;

      // Perform comprehensive content analysis
      const contentAnalysis = this.analyzeContentType(result, snippet);

      // Extract additional metadata
      const metadata = this.extractContentMetadata(result, snippet, contentAnalysis);

      // Estimate difficulty based on content
      const difficulty = this.estimateDifficulty(title, snippet);

      // Generate relevant tags (enhanced with content type info)
      const tags = this.generateTags(title, snippet, resourceType, contentAnalysis);

      // Use Exa's score or default
      const score = result.score || 0.5;

      return {
        title,
        url,
        snippet: snippet.substring(0, 300) + (snippet.length > 300 ? '...' : ''),
        source,
        difficulty,
        tags,
        isYouTube,
        videoId,
        score,
        publishedDate: result.publishedDate,
        // Enhanced content metadata
        contentType: contentAnalysis.contentType,
        visualQuality: contentAnalysis.visualQuality,
        hasImages: contentAnalysis.hasImages,
        imageCount: contentAnalysis.imageCount,
        thumbnailUrl: contentAnalysis.thumbnailUrl,
        contentLength: snippet.length,
        language: metadata.language,
        isPinterest: contentAnalysis.isPinterest,
        isGallery: contentAnalysis.isGallery,
        hasBeforeAfter: contentAnalysis.hasBeforeAfter
      };

    } catch (error) {
      console.error('[Exa] Error processing search result:', error);
      return null;
    }
  }

  /**
   * Calculate comprehensive relevance score based on project similarity
   */
  private static calculateProjectSimilarityScore(
    result: DIYSearchResult,
    projectContext?: SearchOptions['projectContext'],
    resourceType?: string
  ): number {
    let score = result.score || 0.5; // Base Exa score
    
    if (!projectContext) return score;

    const content = (result.title + ' ' + result.snippet).toLowerCase();
    const projectTitle = projectContext.title?.toLowerCase() || '';
    const projectGoal = projectContext.goal?.toLowerCase() || '';
    const projectDescription = projectContext.description?.toLowerCase() || '';

    // Project title similarity (high weight)
    const titleWords = projectTitle.split(/\s+/).filter(word => word.length > 3);
    const titleMatches = titleWords.filter(word => content.includes(word)).length;
    if (titleWords.length > 0) {
      score += (titleMatches / titleWords.length) * 0.3;
    }

    // Project goal alignment
    if (projectGoal) {
      const goalWords = projectGoal.split(/\s+/).filter(word => word.length > 3);
      const goalMatches = goalWords.filter(word => content.includes(word)).length;
      if (goalWords.length > 0) {
        score += (goalMatches / goalWords.length) * 0.25;
      }
    }

    // Description relevance
    if (projectDescription) {
      const descWords = projectDescription.split(/\s+/).filter(word => word.length > 3);
      const descMatches = descWords.filter(word => content.includes(word)).length;
      if (descWords.length > 0) {
        score += (descMatches / descWords.length) * 0.2;
      }
    }

    // Materials relevance (exact matches)
    if (projectContext.materials && projectContext.materials.length > 0) {
      const materialMatches = projectContext.materials.filter(material =>
        content.includes(material.toLowerCase())
      ).length;
      score += (materialMatches / projectContext.materials.length) * 0.15;
    }

    // Focus areas alignment
    if (projectContext.focusAreas && projectContext.focusAreas.length > 0) {
      const focusMatches = projectContext.focusAreas.filter(area =>
        content.includes(area.toLowerCase())
      ).length;
      score += (focusMatches / projectContext.focusAreas.length) * 0.1;
    }

    // Source quality bonus
    const qualityBonus = this.getSourceQualityBonus(result.source);
    score += qualityBonus;

    // Resource type alignment bonus
    const typeBonus = this.getResourceTypeBonus(result, resourceType);
    score += typeBonus;

    // Use validation score if available
    if (result.relevanceScore !== undefined) {
      score += result.relevanceScore * 0.01; // Convert 0-100 scale to 0-1
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get quality bonus based on source reputation
   */
  private static getSourceQualityBonus(source: string): number {
    const sourceQuality = {
      'YouTube': 0.05,
      'This Old House': 0.15,
      'Family Handyman': 0.12,
      'Home Depot': 0.10,
      "Lowe's": 0.10,
      'Bob Vila': 0.08,
      'DIY Network': 0.08,
      'Instructables': 0.06,
      'WikiHow': 0.04
    };

    for (const [sourceName, bonus] of Object.entries(sourceQuality)) {
      if (source.includes(sourceName)) {
        return bonus;
      }
    }

    return 0;
  }

  /**
   * Get bonus based on resource type alignment
   */
  private static getResourceTypeBonus(result: DIYSearchResult, resourceType?: string): number {
    if (!resourceType) return 0;

    const content = (result.title + ' ' + result.snippet).toLowerCase();
    
    const typeKeywords = {
      tutorial: ['tutorial', 'how to', 'step by step', 'guide', 'instructions', 'diy'],
      inspiration: ['inspiration', 'ideas', 'gallery', 'examples', 'showcase', 'design'],
      materials: ['materials', 'tools', 'supplies', 'buy', 'shop', 'equipment']
    };

    const keywords = typeKeywords[resourceType as keyof typeof typeKeywords] || [];
    const matches = keywords.filter(keyword => content.includes(keyword)).length;
    
    return matches * 0.02; // Small bonus per matching keyword
  }

  /**
   * Calculate relevance boost based on project context (legacy method, now uses similarity score)
   */
  private static getRelevanceBoost(result: DIYSearchResult, projectContext?: SearchOptions['projectContext']): number {
    // Use the new similarity score as the boost
    const similarityScore = this.calculateProjectSimilarityScore(result, projectContext);
    return Math.max(1.0, similarityScore * 2); // Convert to boost factor
  }

  /**
   * Format source name for display
   */
  private static formatSourceName(hostname: string): string {
    const sourceMap: Record<string, string> = {
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
      'homedepot.com': 'Home Depot',
      'lowes.com': "Lowe's",
      'thisoldhouse.com': 'This Old House',
      'familyhandyman.com': 'Family Handyman',
      'diynetwork.com': 'DIY Network',
      'bobvila.com': 'Bob Vila',
      'instructables.com': 'Instructables',
      'wikihow.com': 'WikiHow'
    };

    return sourceMap[hostname.replace('www.', '')] || 
           hostname.replace('www.', '').split('.')[0].charAt(0).toUpperCase() + 
           hostname.replace('www.', '').split('.')[0].slice(1);
  }

  /**
   * Estimate difficulty level based on title and content
   */
  private static estimateDifficulty(title: string, snippet: string): 'Beginner' | 'Intermediate' | 'Advanced' {
    const content = (title + ' ' + snippet).toLowerCase();
    
    const beginnerKeywords = ['easy', 'simple', 'basic', 'beginner', 'quick', 'no experience'];
    const advancedKeywords = ['advanced', 'expert', 'professional', 'complex', 'difficult', 'technical'];
    
    const beginnerCount = beginnerKeywords.filter(word => content.includes(word)).length;
    const advancedCount = advancedKeywords.filter(word => content.includes(word)).length;
    
    if (beginnerCount > advancedCount) return 'Beginner';
    if (advancedCount > 0) return 'Advanced';
    return 'Intermediate';
  }

  /**
   * Generate relevant tags based on content and analysis
   */
  private static generateTags(
    title: string, 
    snippet: string, 
    resourceType: string, 
    contentAnalysis?: any
  ): string[] {
    const tags: string[] = [resourceType];
    const content = (title + ' ' + snippet).toLowerCase();
    
    // Add content type tags
    if (contentAnalysis) {
      if (contentAnalysis.contentType !== 'article') {
        tags.push(contentAnalysis.contentType);
      }
      
      if (contentAnalysis.isGallery) tags.push('gallery');
      if (contentAnalysis.hasBeforeAfter) tags.push('before-after');
      if (contentAnalysis.isPinterest) tags.push('pinterest');
      if (contentAnalysis.visualQuality === 'high') tags.push('high-quality');
    }
    
    // Common DIY categories
    const categoryTags = {
      'woodworking': ['wood', 'lumber', 'saw', 'drill', 'cabinet', 'furniture'],
      'painting': ['paint', 'brush', 'color', 'wall', 'primer'],
      'plumbing': ['pipe', 'water', 'sink', 'toilet', 'faucet'],
      'electrical': ['wire', 'outlet', 'switch', 'electrical', 'circuit'],
      'flooring': ['floor', 'tile', 'carpet', 'hardwood', 'vinyl'],
      'kitchen': ['kitchen', 'cabinet', 'countertop', 'appliance'],
      'bathroom': ['bathroom', 'shower', 'bath', 'vanity'],
      'outdoor': ['outdoor', 'patio', 'deck', 'garden', 'fence']
    };

    for (const [category, keywords] of Object.entries(categoryTags)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(category);
      }
    }

    return tags.slice(0, 8); // Increased limit to accommodate content tags
  }

  /**
   * Extract YouTube video ID from URL
   */
  private static extractYouTubeId(url: string): string | undefined {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : undefined;
  }

  /**
   * Generate search suggestion for no/low results
   */
  private static generateSearchSuggestion(query: string, resourceType: 'tutorial' | 'inspiration' | 'materials'): string {
    const suggestions: Record<'tutorial' | 'inspiration' | 'materials', string> = {
      tutorial: `Try searching for "${query} tutorial" or "${query} how to" on YouTube`,
      inspiration: `Try searching for "${query} ideas" or "${query} examples" on Pinterest or DIY websites`,
      materials: `Try searching for "${query} supplies" on Home Depot or Amazon`
    };

    return suggestions[resourceType] || `Try searching for "${query}" on DIY websites`;
  }
}