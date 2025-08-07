import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  onSearch: (query: string) => void;
  onFilterToggle?: (filter: FilterType) => void;
  activeFilters?: FilterType[];
  showFilters?: boolean;
  placeholder?: string;
}

export type FilterType = 'all' | 'completed' | 'pending' | 'recent';

const FILTERS: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all', label: 'All', icon: '📋' },
  { type: 'pending', label: 'Pending', icon: '⏳' },
  { type: 'completed', label: 'Completed', icon: '✅' },
  { type: 'recent', label: 'Recent', icon: '🕒' },
];

export const ChecklistSearchBar: React.FC<Props> = ({
  onSearch,
  onFilterToggle,
  activeFilters = ['all'],
  showFilters = true,
  placeholder = 'Search tasks...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const scale = useSharedValue(1);
  const filterButtonRotation = useSharedValue(0);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, onSearch]);

  const handleFilterPress = async () => {
    if (!showFilters) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setShowFilterPanel(!showFilterPanel);
    filterButtonRotation.value = withSpring(
      showFilterPanel ? 0 : 180,
      { duration: 300 }
    );
  };

  const handleFilterSelect = async (filter: FilterType) => {
    if (!onFilterToggle) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterToggle(filter);
  };

  const handleFocus = () => {
    scale.value = withSpring(1.02, { duration: 200 });
  };

  const handleBlur = () => {
    scale.value = withSpring(1, { duration: 200 });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFilterButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${filterButtonRotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="none"
        />
        
        {showFilters && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleFilterPress}
            activeOpacity={0.7}
          >
            <Animated.Text style={[styles.filterIcon, animatedFilterButtonStyle]}>
              🔽
            </Animated.Text>
          </TouchableOpacity>
        )}
      </View>

      {showFilterPanel && showFilters && (
        <Animated.View
          style={styles.filterPanel}
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutUp.duration(200)}
        >
          <View style={styles.filterGrid}>
            {FILTERS.map((filter, index) => {
              const isActive = activeFilters.includes(filter.type);
              
              return (
                <Animated.View
                  key={filter.type}
                  entering={FadeIn.delay(index * 50)}
                  exiting={FadeOut.duration(100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      isActive && styles.activeFilterItem,
                    ]}
                    onPress={() => handleFilterSelect(filter.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterItemIcon}>{filter.icon}</Text>
                    <Text
                      style={[
                        styles.filterItemText,
                        isActive && styles.activeFilterItemText,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  filterButton: {
    paddingLeft: 12,
  },
  filterIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterPanel: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 80,
  },
  activeFilterItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: 'rgba(76, 175, 80, 0.6)',
  },
  filterItemIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  filterItemText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterItemText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});