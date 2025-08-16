import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Card } from '../Card';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface ResourceSuggestion {
  id: string;
  type: 'material' | 'task' | 'inspiration' | 'note';
  title: string;
  description?: string;
  details: any; // Type-specific details
  estimatedCost?: number;
  estimatedTime?: string;
  difficulty?: string;
  url?: string;
  tags?: string[];
}

interface ResourceCardProps {
  resource: ResourceSuggestion;
  onAdd: (resource: ResourceSuggestion) => Promise<void>;
  onDismiss: (resourceId: string) => void;
  onView?: (resource: ResourceSuggestion) => void;
  projectId: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onAdd,
  onDismiss,
  onView,
  projectId,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  const getResourceIcon = () => {
    switch (resource.type) {
      case 'material':
        return 'package';
      case 'task':
        return 'check-square';
      case 'inspiration':
        return 'heart';
      case 'note':
        return 'file-text';
      default:
        return 'plus';
    }
  };

  const getResourceColor = () => {
    switch (resource.type) {
      case 'material':
        return '#48BB78';
      case 'task':
        return '#667eea';
      case 'inspiration':
        return '#ED8936';
      case 'note':
        return '#9F7AEA';
      default:
        return '#667eea';
    }
  };

  const getActionLabel = () => {
    switch (resource.type) {
      case 'material':
        return 'Add to Materials';
      case 'task':
        return 'Add to Tasks';
      case 'inspiration':
        return 'Add to Inspiration';
      case 'note':
        return 'Add to Notes';
      default:
        return 'Add to Project';
    }
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animate button press
      cardScale.value = withSequence(
        withTiming(0.95, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      await onAdd(resource);
      
      // Success animation
      cardOpacity.value = withTiming(0.3, { duration: 300 });
      setTimeout(() => setIsDismissed(true), 300);
      
    } catch (error) {
      console.error('Failed to add resource:', error);
      Alert.alert('Error', 'Failed to add resource to project');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDismiss = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Dismiss animation
    cardOpacity.value = withTiming(0, { duration: 200 });
    cardScale.value = withTiming(0.8, { duration: 200 });
    
    setTimeout(() => {
      runOnJS(onDismiss)(resource.id);
    }, 200);
  };

  const handleViewResource = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onView) {
      onView(resource);
    } else if (resource.url) {
      // Fallback to external browser if no viewer provided
      Alert.alert('Info', `${resource.title}\n\n${resource.description || 'No additional details available'}`);
    } else {
      Alert.alert('Info', `${resource.title}\n\n${resource.description || 'No additional details available'}`);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  if (isDismissed) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Card
        variant="elevated"
        noPadding
        enableDynamicContrast={true}
        enableMotionEffects={true}
        enableSpecularHighlights={true}
        performanceMode="balanced"
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather
              name={getResourceIcon() as any}
              size={20}
              color={getResourceColor()}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.type}>{resource.type.toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          >
            <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {resource.description && (
          <Text style={styles.description} numberOfLines={3}>
            {resource.description}
          </Text>
        )}

        {/* Details */}
        <View style={styles.details}>
          {resource.estimatedCost && (
            <View style={styles.detailItem}>
              <Feather name="dollar-sign" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.detailText}>${resource.estimatedCost}</Text>
            </View>
          )}
          {resource.estimatedTime && (
            <View style={styles.detailItem}>
              <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.detailText}>{resource.estimatedTime}</Text>
            </View>
          )}
          {resource.difficulty && (
            <View style={styles.detailItem}>
              <Feather name="bar-chart" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.detailText}>{resource.difficulty}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleDismiss}
            style={[styles.actionButton, styles.dismissActionButton]}
            disabled={isAdding}
          >
            <Text style={styles.dismissActionText}>Dismiss</Text>
          </TouchableOpacity>
          
          {/* View Resource Button */}
          {(resource.url || resource.description) && (
            <TouchableOpacity
              onPress={handleViewResource}
              style={[styles.actionButton, styles.viewActionButton]}
              disabled={isAdding}
            >
              <Feather name="external-link" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.viewActionText}>View</Text>
            </TouchableOpacity>
          )}
          
          <AnimatedTouchableOpacity
            onPress={handleAdd}
            style={[styles.actionButton, styles.addActionButton, { backgroundColor: getResourceColor() }]}
            disabled={isAdding}
          >
            <LinearGradient
              colors={[getResourceColor(), `${getResourceColor()}CC`]}
              style={styles.addActionGradient}
            >
              {isAdding ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.addActionText}>Adding...</Text>
                </View>
              ) : (
                <>
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.addActionText}>{getActionLabel()}</Text>
                </>
              )}
            </LinearGradient>
          </AnimatedTouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    lineHeight: 20,
  },
  type: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  viewActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 0.8,
  },
  viewActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  addActionButton: {
    flex: 2,
    overflow: 'hidden',
  },
  addActionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
  },
  addActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});