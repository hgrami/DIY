import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type SortType = 'date-desc' | 'date-asc' | 'alphabetical' | 'completion' | 'manual';
export type SortDirection = 'asc' | 'desc';

interface Props {
  currentSort: SortType;
  onSortChange: (sort: SortType) => void;
  showSortPanel?: boolean;
  onTogglePanel?: () => void;
}

const SORT_OPTIONS: { type: SortType; label: string; icon: string; description: string }[] = [
  { type: 'date-desc', label: 'Newest First', icon: '📅', description: 'Most recent tasks first' },
  { type: 'date-asc', label: 'Oldest First', icon: '📆', description: 'Oldest tasks first' },
  { type: 'alphabetical', label: 'A to Z', icon: '🔤', description: 'Alphabetical order' },
  { type: 'completion', label: 'By Status', icon: '✅', description: 'Completed items last' },
  { type: 'manual', label: 'Manual', icon: '✋', description: 'Drag to reorder' },
];

export const ChecklistSortOptions: React.FC<Props> = ({
  currentSort,
  onSortChange,
  showSortPanel = false,
  onTogglePanel,
}) => {
  const scale = useSharedValue(1);
  
  const handleSortSelect = async (sort: SortType) => {
    if (sort === currentSort) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(sort);
    
    // Brief celebration animation
    scale.value = withSpring(1.05, { duration: 150 }, () => {
      scale.value = withSpring(1, { duration: 150 });
    });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const currentSortOption = SORT_OPTIONS.find(option => option.type === currentSort);

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Current sort indicator */}
      <TouchableOpacity
        style={styles.currentSortButton}
        onPress={onTogglePanel}
        activeOpacity={0.7}
      >
        <Text style={styles.currentSortIcon}>{currentSortOption?.icon}</Text>
        <Text style={styles.currentSortText}>{currentSortOption?.label}</Text>
        <Text style={styles.chevron}>{showSortPanel ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showSortPanel && (
        <Animated.View
          style={styles.sortPanel}
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutUp.duration(200)}
        >
          {SORT_OPTIONS.map((option, index) => {
            const isActive = option.type === currentSort;
            
            return (
              <Animated.View
                key={option.type}
                entering={FadeIn.delay(index * 30)}
                exiting={FadeOut.duration(100)}
              >
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    isActive && styles.activeSortOption,
                    index === SORT_OPTIONS.length - 1 && styles.lastSortOption,
                  ]}
                  onPress={() => handleSortSelect(option.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sortOptionLeft}>
                    <Text style={styles.sortOptionIcon}>{option.icon}</Text>
                    <View style={styles.sortOptionText}>
                      <Text
                        style={[
                          styles.sortOptionTitle,
                          isActive && styles.activeSortOptionTitle,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.sortOptionDescription}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  
                  {isActive && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      style={styles.checkmark}
                    >
                      <Text style={styles.checkmarkText}>✓</Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  currentSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  currentSortIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  currentSortText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  chevron: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginLeft: 8,
  },
  sortPanel: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastSortOption: {
    borderBottomWidth: 0,
  },
  activeSortOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sortOptionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  sortOptionText: {
    flex: 1,
  },
  sortOptionTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  activeSortOptionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortOptionDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});