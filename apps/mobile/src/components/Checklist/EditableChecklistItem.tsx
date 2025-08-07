import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from '../Card';
import { ChecklistItem } from '../../@types';
import { ChecklistDensity, DENSITY_CONFIGS } from '../../types/checklist';

interface Props {
  item: ChecklistItem;
  density?: ChecklistDensity;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
}

export const EditableChecklistItem: React.FC<Props> = ({
  item,
  density = 'normal',
  onSave,
  onCancel,
}) => {
  const [text, setText] = useState(item.title);
  const inputRef = useRef<TextInput>(null);
  const densityConfig = DENSITY_CONFIGS[density];

  useEffect(() => {
    // Focus and select text after component mounts
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelection(0, text.length);
    }, 100);

    return () => clearTimeout(timer);
  }, [text.length]);

  const handleSave = async () => {
    const trimmedText = text.trim();
    if (trimmedText && trimmedText !== item.title) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSave(trimmedText);
    } else {
      onCancel();
    }
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText(item.title); // Reset text
    onCancel();
  };

  const cardStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: densityConfig.verticalPadding,
    paddingHorizontal: densityConfig.horizontalPadding,
    minHeight: densityConfig.cardHeight,
  };

  const inputStyle = {
    flex: 1,
    fontSize: densityConfig.fontSize,
    lineHeight: densityConfig.lineHeight,
    color: '#333',
    fontWeight: '500' as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.container, { marginVertical: densityConfig.marginVertical }]}
    >
      <Card style={cardStyle}>
        {/* Checkbox placeholder - matches the original checkbox size */}
        <View
          style={[
            styles.checkboxPlaceholder,
            {
              width: densityConfig.checkboxSize,
              height: densityConfig.checkboxSize,
              borderRadius: densityConfig.checkboxSize / 2,
              marginRight: densityConfig.checkboxMargin,
            },
          ]}
        />

        <TextInput
          ref={inputRef}
          style={inputStyle}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSave}
          onBlur={handleSave}
          multiline={density !== 'compact'}
          returnKeyType="done"
          placeholder="Enter task..."
          placeholderTextColor="#999"
          selectTextOnFocus
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  checkboxPlaceholder: {
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
});