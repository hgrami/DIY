import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChecklistDensity } from '../../types/checklist';

interface Props {
  density: ChecklistDensity;
  onDensityChange: (density: ChecklistDensity) => void;
}

const DENSITY_OPTIONS: { value: ChecklistDensity; label: string; icon: string }[] = [
  { value: 'compact', label: 'Compact', icon: '▬' },
  { value: 'normal', label: 'Normal', icon: '☰' },
  { value: 'comfortable', label: 'Comfortable', icon: '≡' },
];

export const ChecklistDensityPicker: React.FC<Props> = ({ density, onDensityChange }) => {
  const handleDensityChange = async (newDensity: ChecklistDensity) => {
    if (newDensity !== density) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDensityChange(newDensity);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Density</Text>
      <View style={styles.optionsContainer}>
        {DENSITY_OPTIONS.map((option) => {
          const isSelected = option.value === density;

          const animatedStyle = useAnimatedStyle(() => ({
            backgroundColor: withSpring(
              isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'
            ),
            borderColor: withSpring(
              isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'
            ),
          }));

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleDensityChange(option.value)}
              activeOpacity={0.7}
            >
              <Animated.View style={[styles.option, animatedStyle]}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={[styles.optionText, isSelected && styles.selectedText]}>
                  {option.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
  },
  optionIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 6,
  },
  optionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});