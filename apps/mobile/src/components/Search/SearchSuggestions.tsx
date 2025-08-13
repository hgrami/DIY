import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SearchSuggestionsProps {
  suggestions: string[];
  onSuggestionPress: (suggestion: string) => void;
  projectTitle?: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSuggestionPress,
  projectTitle,
}) => {
  const handleSuggestionPress = async (suggestion: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSuggestionPress(suggestion);
  };

  // Group suggestions into categories
  const projectSuggestions = suggestions.filter(s => 
    projectTitle && s.toLowerCase().includes(projectTitle.toLowerCase())
  );
  
  const genericSuggestions = suggestions.filter(s => 
    !projectTitle || !s.toLowerCase().includes(projectTitle.toLowerCase())
  );

  const quickSuggestions = [
    'step by step tutorial',
    'before and after',
    'budget friendly',
    'beginner friendly',
    'DIY inspiration',
    'weekend project',
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="zap" size={20} color="#ED8936" />
        <Text style={styles.headerTitle}>Search Suggestions</Text>
      </View>

      {/* Project-specific suggestions */}
      {projectTitle && projectSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For "{projectTitle}"</Text>
          <View style={styles.suggestionsGrid}>
            {projectSuggestions.slice(0, 4).map((suggestion, index) => (
              <TouchableOpacity
                key={`project-${index}`}
                onPress={() => handleSuggestionPress(suggestion)}
                style={styles.suggestionButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(237, 137, 54, 0.2)', 'rgba(237, 137, 54, 0.1)']}
                  style={styles.suggestionGradient}
                >
                  <Feather name="target" size={14} color="#ED8936" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick suggestions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Searches</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {quickSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`quick-${index}`}
              onPress={() => handleSuggestionPress(suggestion)}
              style={styles.quickSuggestionButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(102, 126, 234, 0.15)', 'rgba(102, 126, 234, 0.08)']}
                style={styles.quickSuggestionGradient}
              >
                <Feather name="trending-up" size={12} color="#667eea" />
                <Text style={styles.quickSuggestionText}>{suggestion}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* General suggestions */}
      {genericSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Ideas</Text>
          <View style={styles.listContainer}>
            {genericSuggestions.slice(0, 6).map((suggestion, index) => (
              <TouchableOpacity
                key={`generic-${index}`}
                onPress={() => handleSuggestionPress(suggestion)}
                style={styles.listItem}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <Feather name="search" size={14} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.listItemText} numberOfLines={1}>
                    {suggestion}
                  </Text>
                  <Feather name="arrow-up-left" size={12} color="rgba(255, 255, 255, 0.4)" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Help text */}
      <View style={styles.helpContainer}>
        <Feather name="info" size={14} color="rgba(255, 255, 255, 0.4)" />
        <Text style={styles.helpText}>
          Tap any suggestion to search, or type your own query above
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    width: '48%',
  },
  suggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(237, 137, 54, 0.2)',
    gap: 8,
    minHeight: 50,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  horizontalScroll: {
    marginHorizontal: -20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickSuggestionButton: {
    marginRight: 8,
  },
  quickSuggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    gap: 6,
  },
  quickSuggestionText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  listContainer: {
    gap: 4,
  },
  listItem: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
});