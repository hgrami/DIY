import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeModal } from '../NativeModal';

import { SearchService, DIYSearchResult, SearchOptions } from '../../services/searchService';
import { Project } from '../../@types';
import { SearchResultCard } from './SearchResultCard';
import { SearchFilters } from './SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SearchModalProps {
  project?: Project;
  isVisible: boolean;
  onClose: () => void;
  onResultSelect: (result: DIYSearchResult) => void;
  initialQuery?: string;
  initialResourceType?: 'tutorial' | 'inspiration' | 'materials';
}

export const SearchModal: React.FC<SearchModalProps> = ({
  project,
  isVisible,
  onClose,
  onResultSelect,
  initialQuery = '',
  initialResourceType = 'tutorial',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [resourceType, setResourceType] = useState<'tutorial' | 'inspiration' | 'materials'>(initialResourceType);
  const [contentType, setContentType] = useState<'video' | 'visual' | 'article' | 'mixed'>('mixed');
  const [results, setResults] = useState<DIYSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string>('');

  const inputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const searchProgress = useSharedValue(0);
  const resultsOpacity = useSharedValue(0);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isVisible]);

  // Auto-search with debouncing
  useEffect(() => {
    if (query.trim().length > 2) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      
      searchTimeout.current = setTimeout(() => {
        performSearch();
      }, 800); // 800ms debounce
    } else {
      setResults([]);
      setSearchError(null);
      setSearchMessage('');
      resultsOpacity.value = withTiming(0);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, resourceType, contentType]);

  const performSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      setSearchMessage('');
      searchProgress.value = withTiming(1, { duration: 2000 });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const searchOptions: SearchOptions = {
        query: query.trim(),
        resourceType,
        contentType,
        numResults: 8,
        projectContext: project ? SearchService.buildProjectContext(project) : undefined,
      };

      const response = await SearchService.searchDIYResources(searchOptions);

      if (response.success) {
        setResults(response.links);
        setSearchMessage(response.message);
        resultsOpacity.value = withSpring(1);
        
        if (response.links.length === 0) {
          setSearchError('No results found. Try adjusting your search terms or filters.');
        }
      } else {
        setSearchError(response.message || 'Search failed. Please try again.');
        setResults([]);
      }

    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search is temporarily unavailable. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
      searchProgress.value = withTiming(0, { duration: 300 });
    }
  };

  const handleResultPress = (result: DIYSearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onResultSelect(result);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchError(null);
    setSearchMessage('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Animated styles
  const searchProgressStyle = useAnimatedStyle(() => ({
    width: `${searchProgress.value * 100}%`,
  }));

  const resultsStyle = useAnimatedStyle(() => ({
    opacity: resultsOpacity.value,
  }));

  const suggestions = project ? SearchService.getSearchSuggestions(project) : [];

  return (
    <NativeModal
      isVisible={isVisible}
      onClose={handleClose}
      title="Search DIY Resources"
      size="full"
      allowSwipeToClose={true}
      headerComponent={
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Feather name="search" size={24} color="#FFFFFF" />
            <Text style={styles.title}>Search DIY Resources</Text>
          </View>
        </View>
      }
    >

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']}
            style={styles.searchInputContainer}
          >
            <Feather name="search" size={20} color="rgba(255,255,255,0.6)" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="What are you looking for?"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={performSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </LinearGradient>

          {/* Search Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, searchProgressStyle]} />
          </View>
        </View>

        {/* Filters */}
        <SearchFilters
          resourceType={resourceType}
          contentType={contentType}
          onResourceTypeChange={setResourceType}
          onContentTypeChange={setContentType}
          showAdvanced={showFilters}
          onToggleAdvanced={() => setShowFilters(!showFilters)}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Search Suggestions */}
          {query.length === 0 && suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              onSuggestionPress={handleSuggestionPress}
              projectTitle={project?.title}
            />
          )}

          {/* Search Message */}
          {searchMessage && (
            <View style={styles.messageContainer}>
              <Text style={styles.searchMessage}>{searchMessage}</Text>
            </View>
          )}

          {/* Search Error */}
          {searchError && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <Animated.View style={[styles.resultsContainer, resultsStyle]}>
              <Text style={styles.resultsHeader}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </Text>
              {results.map((result, index) => (
                <SearchResultCard
                  key={`${result.url}-${index}`}
                  result={result}
                  onPress={() => handleResultPress(result)}
                  resourceType={resourceType}
                />
              ))}
            </Animated.View>
          )}

          {/* Loading State */}
          {isSearching && results.length === 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching for {resourceType}...</Text>
              <View style={styles.loadingDots}>
                <View style={styles.loadingDot} />
                <View style={styles.loadingDot} />
                <View style={styles.loadingDot} />
              </View>
            </View>
          )}
        </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
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
  progressBarContainer: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  resultsContainer: {
    gap: 12,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    opacity: 0.3,
  },
});