import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { DIYSearchResult } from '../../services/searchService';

interface SearchResultCardProps {
  result: DIYSearchResult;
  onPress: () => void;
  onLongPress?: () => void;
  onActionPress?: () => void;
  resourceType: 'tutorial' | 'inspiration' | 'materials';
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  onPress,
  onLongPress,
  onActionPress,
  resourceType,
}) => {
  const [imageError, setImageError] = useState(false);
  const cardScale = useSharedValue(1);

  const getResourceIcon = () => {
    switch (resourceType) {
      case 'tutorial':
        return result.isYouTube ? 'play-circle' : 'book-open';
      case 'inspiration':
        return 'heart';
      case 'materials':
        return 'package';
      default:
        return 'external-link';
    }
  };

  const getResourceColor = () => {
    switch (resourceType) {
      case 'tutorial':
        return result.isYouTube ? '#FF0000' : '#667eea';
      case 'inspiration':
        return '#ED8936';
      case 'materials':
        return '#48BB78';
      default:
        return '#667eea';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return '#48BB78';
      case 'intermediate':
        return '#ED8936';
      case 'advanced':
        return '#E53E3E';
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getContentTypeIcon = () => {
    switch (result.contentType) {
      case 'video':
        return 'play';
      case 'visual':
        return 'image';
      case 'article':
        return 'file-text';
      default:
        return 'link';
    }
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate press
    cardScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    onPress();
  };

  const handleExternalPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const canOpen = await Linking.canOpenURL(result.url);
      if (canOpen) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.();
  };

  const handleActionPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onActionPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const hasImage = result.thumbnailUrl && !imageError;
  const showQualityBadge = result.visualQuality && result.visualQuality !== 'low';
  const showValidationBadge = result.isValidated && result.relevanceScore && result.relevanceScore > 80;

  return (
    <AnimatedTouchableOpacity
      style={[styles.container, animatedStyle]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Card
        variant="default"
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
              size={18}
              color={getResourceColor()}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.source} numberOfLines={1}>
              {String(result.source || 'Unknown Source')}
            </Text>
            <View style={styles.badges}>
              {result.contentType && (
                <View style={[styles.badge, styles.contentTypeBadge]}>
                  <Feather name={getContentTypeIcon() as any} size={10} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.badgeText}>{String(result.contentType || '').toUpperCase()}</Text>
                </View>
              )}
              {showQualityBadge && (
                <View style={[styles.badge, styles.qualityBadge]}>
                  <Text style={styles.badgeText}>
                    {String(result.visualQuality || '').toUpperCase()} QUALITY
                  </Text>
                </View>
              )}
              {showValidationBadge && (
                <View style={[styles.badge, styles.validatedBadge]}>
                  <Feather name="check-circle" size={10} color="#48BB78" />
                  <Text style={styles.badgeText}>VERIFIED</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            {onActionPress && (
              <TouchableOpacity
                onPress={handleActionPress}
                style={styles.actionButton}
                hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              >
                <Feather name="more-horizontal" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleExternalPress}
              style={styles.externalButton}
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <Feather name="external-link" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {hasImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: result.thumbnailUrl }}
                style={styles.thumbnail}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
              {result.isYouTube && (
                <View style={styles.playOverlay}>
                  <Feather name="play" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          )}
          
          <View style={[styles.textContent, hasImage && styles.textContentWithImage]}>
            <Text style={styles.title} numberOfLines={2}>
              {String(result.title || 'Untitled')}
            </Text>
            
            {result.snippet && typeof result.snippet === 'string' && (
              <Text style={styles.snippet} numberOfLines={3}>
                {result.snippet}
              </Text>
            )}

            {/* Details */}
            <View style={styles.details}>
              {result.difficulty && typeof result.difficulty === 'string' && (
                <View style={styles.detailItem}>
                  <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor(result.difficulty) }]} />
                  <Text style={styles.detailText}>{result.difficulty}</Text>
                </View>
              )}
              
              {result.publishedDate && typeof result.publishedDate === 'string' && (
                <View style={styles.detailItem}>
                  <Feather name="calendar" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.detailText}>
                    {new Date(result.publishedDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {result.relevanceScore && typeof result.relevanceScore === 'number' && result.relevanceScore > 70 && (
                <View style={styles.detailItem}>
                  <Feather name="trending-up" size={12} color="#48BB78" />
                  <Text style={[styles.detailText, { color: '#48BB78' }]}>
                    {Math.round(result.relevanceScore)}% match
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            {result.tags && Array.isArray(result.tags) && result.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {result.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{String(tag || '')}</Text>
                  </View>
                ))}
                {result.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{result.tags.length - 3} more</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Additional Info */}
        {(result.hasImages || result.hasBeforeAfter || result.isGallery) && (
          <View style={styles.additionalInfo}>
            {result.hasBeforeAfter && (
              <View style={styles.infoItem}>
                <Feather name="refresh-cw" size={12} color="#ED8936" />
                <Text style={styles.infoText}>Before & After</Text>
              </View>
            )}
            {result.isGallery && (
              <View style={styles.infoItem}>
                <Feather name="grid" size={12} color="#9F7AEA" />
                <Text style={styles.infoText}>Gallery</Text>
              </View>
            )}
            {result.hasImages && result.imageCount && typeof result.imageCount === 'number' && result.imageCount > 1 && (
              <View style={styles.infoItem}>
                <Feather name="image" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.infoText}>{result.imageCount} images</Text>
              </View>
            )}
          </View>
        )}
      </Card>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
  },
  source: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  contentTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityBadge: {
    backgroundColor: 'rgba(237, 137, 54, 0.2)',
  },
  validatedBadge: {
    backgroundColor: 'rgba(72, 187, 120, 0.2)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  externalButton: {
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
  },
  textContent: {
    flex: 1,
  },
  textContentWithImage: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 6,
  },
  snippet: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});