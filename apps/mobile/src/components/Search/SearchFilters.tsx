import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface SearchFiltersProps {
  resourceType: 'tutorial' | 'inspiration' | 'materials';
  contentType: 'video' | 'visual' | 'article' | 'mixed';
  onResourceTypeChange: (type: 'tutorial' | 'inspiration' | 'materials') => void;
  onContentTypeChange: (type: 'video' | 'visual' | 'article' | 'mixed') => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  resourceType,
  contentType,
  onResourceTypeChange,
  onContentTypeChange,
  showAdvanced,
  onToggleAdvanced,
}) => {
  const advancedHeight = useSharedValue(0);
  const advancedOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (showAdvanced) {
      advancedHeight.value = withSpring(60);
      advancedOpacity.value = withTiming(1, { duration: 300 });
    } else {
      advancedHeight.value = withSpring(0);
      advancedOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showAdvanced]);

  const handleResourceTypeChange = async (type: 'tutorial' | 'inspiration' | 'materials') => {
    if (type !== resourceType) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onResourceTypeChange(type);
    }
  };

  const handleContentTypeChange = async (type: 'video' | 'visual' | 'article' | 'mixed') => {
    if (type !== contentType) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onContentTypeChange(type);
    }
  };

  const handleToggleAdvanced = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleAdvanced();
  };

  const advancedStyle = useAnimatedStyle(() => ({
    height: advancedHeight.value,
    opacity: advancedOpacity.value,
  }));

  const resourceTypes: Array<{
    key: 'tutorial' | 'inspiration' | 'materials';
    label: string;
    icon: string;
    color: string;
  }> = [
    { key: 'tutorial', label: 'Tutorials', icon: 'play-circle', color: '#667eea' },
    { key: 'inspiration', label: 'Inspiration', icon: 'heart', color: '#ED8936' },
    { key: 'materials', label: 'Materials', icon: 'package', color: '#48BB78' },
  ];

  const contentTypes: Array<{
    key: 'video' | 'visual' | 'article' | 'mixed';
    label: string;
    icon: string;
  }> = [
    { key: 'mixed', label: 'All', icon: 'grid' },
    { key: 'video', label: 'Videos', icon: 'play' },
    { key: 'visual', label: 'Images', icon: 'image' },
    { key: 'article', label: 'Articles', icon: 'file-text' },
  ];

  return (
    <View style={styles.container}>
      {/* Resource Type Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Search For</Text>
        <View style={styles.filterRow}>
          {resourceTypes.map((type) => {
            const isSelected = resourceType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                onPress={() => handleResourceTypeChange(type.key)}
                style={styles.filterButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={
                    isSelected
                      ? [type.color + 'CC', type.color + '99']
                      : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                  }
                  style={[
                    styles.filterButtonGradient,
                    isSelected && styles.selectedFilter,
                  ]}
                >
                  <Feather
                    name={type.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.selectedFilterText,
                    ]}
                  >
                    {type.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Advanced Filters Toggle */}
      <TouchableOpacity
        onPress={handleToggleAdvanced}
        style={styles.advancedToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.advancedToggleText}>Content Type</Text>
        <Feather
          name={showAdvanced ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="rgba(255, 255, 255, 0.6)"
        />
      </TouchableOpacity>

      {/* Advanced Filters */}
      <Animated.View style={[styles.advancedFilters, advancedStyle]}>
        <View style={styles.filterRow}>
          {contentTypes.map((type) => {
            const isSelected = contentType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                onPress={() => handleContentTypeChange(type.key)}
                style={styles.contentTypeButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={
                    isSelected
                      ? ['rgba(102, 126, 234, 0.8)', 'rgba(102, 126, 234, 0.6)']
                      : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']
                  }
                  style={[
                    styles.contentTypeGradient,
                    isSelected && styles.selectedContentType,
                  ]}
                >
                  <Feather
                    name={type.icon as any}
                    size={14}
                    color={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                  />
                  <Text
                    style={[
                      styles.contentTypeText,
                      isSelected && styles.selectedContentTypeText,
                    ]}
                  >
                    {type.label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
  },
  filterButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  selectedFilter: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  advancedFilters: {
    overflow: 'hidden',
  },
  contentTypeButton: {
    flex: 1,
  },
  contentTypeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  selectedContentType: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedContentTypeText: {
    color: '#FFFFFF',
  },
});