import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SearchService, ProgressiveSearchResult, SearchOptions, DIYSearchResult } from '../../services/searchService';
import { SearchResultCard } from './SearchResultCard';
import { SearchFilters } from './SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchHistory } from './SearchHistory';
import { SearchFavorites } from './SearchFavorites';
import { SearchActionSheet } from './SearchActionSheet';
import { ProjectSelectionModal } from './ProjectSelectionModal';
import { NewProjectFromSearchModal } from './NewProjectFromSearchModal';
import { InAppBrowser } from '../InAppBrowser';
import { NativeModal } from '../NativeModal';
import { Project } from '../../@types';
import { ProjectsService } from '../../services/projectsService';

interface ProgressiveSearchModalProps {
  project?: Project;
  isVisible: boolean;
  onClose: () => void;
  onResultSelect: (result: DIYSearchResult) => void;
  onProjectCreated?: (projectShortId: string) => void;
  initialQuery?: string;
  initialResourceType?: 'tutorial' | 'inspiration' | 'materials';
}

export const ProgressiveSearchModal: React.FC<ProgressiveSearchModalProps> = ({
  project,
  isVisible,
  onClose,
  onResultSelect,
  onProjectCreated,
  initialQuery = '',
  initialResourceType = 'tutorial',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [resourceType, setResourceType] = useState<'tutorial' | 'inspiration' | 'materials'>(initialResourceType);
  const [contentType, setContentType] = useState<'video' | 'visual' | 'article' | 'mixed'>('mixed');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DIYSearchResult[]>([]);
  const [batchInfo, setBatchInfo] = useState<{
    current: number;
    total: number;
    isComplete: boolean;
  } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Action modals
  const [selectedResult, setSelectedResult] = useState<DIYSearchResult | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    console.log('ProgressiveSearchModal isVisible changed:', isVisible);
    if (isVisible) {
      console.log('Modal opening, resetting state');
      setQuery(initialQuery);
      setResourceType(initialResourceType);
      setContentType('mixed');
      setSearchResults([]);
      setBatchInfo(null);
      setHasSearched(false);
      setIsSearching(false);
      setShowHistory(false);
      setShowFavorites(false);
    } else {
      console.log('Modal closing, cleaning up');
      // Cleanup when modal closes
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    }
  }, [isVisible, initialQuery, initialResourceType]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 300);
    } else {
      setSearchResults([]);
      setBatchInfo(null);
      setHasSearched(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, resourceType, contentType]);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Search Required', 'Please enter a search query');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setIsSearching(true);
      setSearchResults([]);
      setBatchInfo(null);
      setHasSearched(true);

      // Cancel previous search if running
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      searchAbortRef.current = new AbortController();

      const searchOptions: SearchOptions = {
        query: query.trim(),
        resourceType,
        contentType,
        numResults: 12,
        progressive: true,
        projectContext: project ? SearchService.buildProjectContext(project) : undefined,
      };

      const progressiveSearch = SearchService.searchDIYResourcesProgressive(searchOptions);
      const accumulatedResults: DIYSearchResult[] = [];

      for await (const batch of progressiveSearch) {
        // Check if search was aborted
        if (searchAbortRef.current?.signal.aborted) {
          break;
        }

        accumulatedResults.push(...batch.results);
        setSearchResults([...accumulatedResults]);
        setBatchInfo({
          current: batch.batch,
          total: batch.totalBatches,
          isComplete: batch.isComplete,
        });

        if (batch.isComplete) {
          break;
        }
      }

    } catch (error: any) {
      console.error('Search failed:', error);
      if (error.name !== 'AbortError') {
        Alert.alert('Search Error', 'Failed to search. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
  };

  const handleResourceTypeChange = (type: 'tutorial' | 'inspiration' | 'materials') => {
    setResourceType(type);
  };

  const handleContentTypeChange = (type: 'video' | 'visual' | 'article' | 'mixed') => {
    setContentType(type);
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    handleSearch();
  };

  const clearSearch = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setSearchResults([]);
    setBatchInfo(null);
    setHasSearched(false);
  };

  const handleResultSelect = async (result: DIYSearchResult) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedResult(result);
    setShowBrowser(true);
  };

  const handleSuggestionSelect = async (suggestion: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(suggestion);
  };

  const handleHistorySelect = async (historyQuery: string, historyResourceType: 'tutorial' | 'inspiration' | 'materials', historyContentType: 'video' | 'visual' | 'article' | 'mixed') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(historyQuery);
    setResourceType(historyResourceType);
    setContentType(historyContentType);
    setShowHistory(false);
  };

  const handleFavoriteSelect = async (result: DIYSearchResult) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedResult(result);
    setShowBrowser(true);
  };

  // Action handlers
  const handleResultAction = (result: DIYSearchResult) => {
    setSelectedResult(result);
    setShowActionSheet(true);
  };

  const handleAddToExistingProject = () => {
    setShowActionSheet(false);
    setShowProjectSelection(true);
  };

  const handleCreateNewProject = () => {
    setShowActionSheet(false);
    setShowNewProject(true);
  };

  const handleOpenLink = async () => {
    if (!selectedResult) return;
    setShowActionSheet(false);
    setShowBrowser(true);
  };

  const handleAddToFavorites = async () => {
    if (!selectedResult) return;
    
    try {
      await SearchService.addToFavorites(
        selectedResult,
        project?.id,
        project?.title
      );
      Alert.alert('Success', 'Added to favorites');
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      Alert.alert('Error', 'Failed to add to favorites');
    }
  };

  const handleShare = async () => {
    if (!selectedResult) return;
    
    try {
      await Share.share({
        message: `Check out this DIY resource: ${selectedResult.title}\n\n${selectedResult.url}`,
        title: selectedResult.title,
        url: selectedResult.url,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleProjectSelected = async (selectedProject: Project, resourceType: 'inspiration' | 'material' | 'checklist') => {
    if (!selectedResult) return;

    try {
      let response;
      
      switch (resourceType) {
        case 'inspiration':
          response = await ProjectsService.addInspiration(selectedProject.shortId, {
            title: selectedResult.title,
            description: selectedResult.snippet || '',
            url: selectedResult.url,
            imageUrl: selectedResult.thumbnailUrl,
            source: selectedResult.source,
            tags: selectedResult.tags || [],
          });
          break;
          
        case 'material':
          response = await ProjectsService.addMaterial(selectedProject.shortId, {
            name: selectedResult.title,
            quantity: '',
            notes: `From: ${selectedResult.source}`,
            checked: false,
            estimatedPrice: 0,
            url: selectedResult.url,
          });
          break;
          
        case 'checklist':
          response = await ProjectsService.addChecklistItem(selectedProject.shortId, {
            title: selectedResult.title,
            description: selectedResult.snippet || `Resource: ${selectedResult.url}`,
            completed: false,
            order: 0,
          });
          break;
      }

      Alert.alert('Success', `Added to ${selectedProject.title} as ${resourceType}`);
      setSelectedResult(null);
      
    } catch (error) {
      console.error(`Failed to add to project as ${resourceType}:`, error);
      Alert.alert('Error', `Failed to add to project`);
    }
  };

  const handleProjectCreated = (projectShortId: string) => {
    setSelectedResult(null);
    Alert.alert('Success', 'Project created successfully!');
    onProjectCreated?.(projectShortId);
  };

  const renderContent = () => {
    if (showHistory) {
      return (
        <SearchHistory
          onSearchSelect={handleHistorySelect}
          projectId={project?.id}
        />
      );
    }

    if (showFavorites) {
      return (
        <SearchFavorites
          onFavoriteSelect={handleFavoriteSelect}
          projectId={project?.id}
        />
      );
    }

    if (isSearching || (searchResults.length > 0 && hasSearched)) {
      return (
        <View style={styles.resultsContainer}>
          {/* Search Progress */}
          {isSearching && batchInfo && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  Loading batch {batchInfo.current} of {batchInfo.total}...
                </Text>
                <ActivityIndicator size="small" color="#667eea" />
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(batchInfo.current / batchInfo.total) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <View style={styles.resultsGrid}>
              {searchResults.map((result, index) => (
                <SearchResultCard
                  key={`${result.url}-${index}`}
                  result={result}
                  onPress={() => handleResultSelect(result)}
                  onActionPress={() => handleResultAction(result)}
                  resourceType={resourceType}
                />
              ))}
            </View>
          ) : (
            !isSearching && hasSearched && (
              <View style={styles.emptyState}>
                <Feather name="search" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyStateTitle}>No Results Found</Text>
                <Text style={styles.emptyStateText}>
                  Try adjusting your search terms or filters
                </Text>
              </View>
            )
          )}
        </View>
      );
    }

    // Default state - show suggestions
    const suggestions = project ? SearchService.getSearchSuggestions(project) : [
      'DIY home improvement',
      'beginner friendly projects', 
      'step by step tutorials',
      'before and after transformations',
      'budget friendly DIY',
      'weekend projects'
    ];
    
    return (
      <SearchSuggestions
        suggestions={suggestions}
        onSuggestionPress={handleSuggestionSelect}
        projectTitle={project?.title}
      />
    );
  };

  console.log('ProgressiveSearchModal render, isVisible:', isVisible);
  
  return (
    <NativeModal
      isVisible={isVisible}
      onClose={onClose}
      title="Search DIY Resources"
      allowSwipeToClose={true}
      backgroundColor="rgba(102, 126, 234, 0.95)"
    >
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="What are you looking to build?"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearButton}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Feather name="x" size={16} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !showHistory && !showFavorites && styles.activeTab]}
          onPress={() => {
            setShowHistory(false);
            setShowFavorites(false);
          }}
        >
          <Feather name="search" size={16} color={!showHistory && !showFavorites ? "#667eea" : "rgba(255, 255, 255, 0.6)"} />
          <Text style={[styles.tabText, !showHistory && !showFavorites && styles.activeTabText]}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, showHistory && styles.activeTab]}
          onPress={() => {
            setShowHistory(true);
            setShowFavorites(false);
          }}
        >
          <Feather name="clock" size={16} color={showHistory ? "#667eea" : "rgba(255, 255, 255, 0.6)"} />
          <Text style={[styles.tabText, showHistory && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, showFavorites && styles.activeTab]}
          onPress={() => {
            setShowHistory(false);
            setShowFavorites(true);
          }}
        >
          <Feather name="heart" size={16} color={showFavorites ? "#667eea" : "rgba(255, 255, 255, 0.6)"} />
          <Text style={[styles.tabText, showFavorites && styles.activeTabText]}>Favorites</Text>
        </TouchableOpacity>
      </View>

      {/* Search Filters - only show on search tab */}
      {!showHistory && !showFavorites && (
        <SearchFilters
          resourceType={resourceType}
          contentType={contentType}
          onResourceTypeChange={handleResourceTypeChange}
          onContentTypeChange={handleContentTypeChange}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Action Modals */}
      <SearchActionSheet
        isVisible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        searchResult={selectedResult}
        onAddToExistingProject={handleAddToExistingProject}
        onCreateNewProject={handleCreateNewProject}
        onOpenLink={handleOpenLink}
        onAddToFavorites={handleAddToFavorites}
        onShare={handleShare}
      />

      <ProjectSelectionModal
        isVisible={showProjectSelection}
        onClose={() => setShowProjectSelection(false)}
        searchResult={selectedResult}
        onProjectSelected={handleProjectSelected}
      />

      <NewProjectFromSearchModal
        isVisible={showNewProject}
        onClose={() => setShowNewProject(false)}
        searchResult={selectedResult}
        onProjectCreated={handleProjectCreated}
      />

      <InAppBrowser
        isVisible={showBrowser}
        onClose={() => setShowBrowser(false)}
        searchResult={selectedResult}
        onActionPress={handleResultAction}
      />
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTabText: {
    color: '#667eea',
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  resultsGrid: {
    gap: 12,
  },
  resultCard: {
    marginBottom: 8,
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