// apps/mobile/src/components/ChecklistItemCard.tsx
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, ViewStyle, StyleProp, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeOutLeft,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    withSequence,
    withDelay,
    runOnJS,
    SlideInRight,
    SlideOutLeft,
    interpolate,
    clamp
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Card } from '../Card';
import { 
  EnhancedGlassMaterial, 
  SpecularHighlight
} from '../GlassUI';
import { 
  EnhancedGlassMaterial as EnhancedGlassMaterialType,
  InteractionState 
} from '../GlassUI/types';
import * as Haptics from 'expo-haptics';
import { ChecklistItem } from '../../@types';
import { ChecklistDensity, DENSITY_CONFIGS } from '../../types/checklist';
import { ChecklistContextMenu } from './ChecklistContextMenu';
import { ChecklistInlineEditor } from './ChecklistInlineEditor';
import { ChecklistSwipeActions } from './ChecklistSwipeActions';

interface Props {
    item: ChecklistItem;
    onToggle: () => void;
    onDelete: () => void;
    onEdit?: (itemId: string, newTitle: string) => void;
    onDuplicate?: (item: ChecklistItem) => void;
    cardStyle?: StyleProp<ViewStyle>;
    density?: ChecklistDensity;
    isExpanded?: boolean;
    onExpand?: () => void;
    onSelect?: () => void;
    isSelected?: boolean;
    enableSwipeActions?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ChecklistItemCard: React.FC<Props> = ({
    item,
    onToggle,
    onDelete,
    cardStyle,
    density = 'normal',
    isExpanded = false,
    onExpand,
    onEdit,
    onDuplicate,
    onSelect,
    isSelected = false,
    enableSwipeActions = true
}) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const scale = useSharedValue(1);
    const checkboxScale = useSharedValue(item.completed ? 1 : 0.8);
    const checkboxRotation = useSharedValue(0);
    const shadowOpacity = useSharedValue(0.1);
    const borderWidth = useSharedValue(0);
    const selectionOpacity = useSharedValue(isSelected ? 0.3 : 0);

    // Swipe gesture values
    const translateX = useSharedValue(0);
    const panStartX = useSharedValue(0);

    // Update checkbox animation when completion status changes
    useEffect(() => {
        if (item.completed) {
            // Completion animation sequence
            checkboxScale.value = withSequence(
                withSpring(1.2, { duration: 200 }),
                withSpring(1, { duration: 200 })
            );
            checkboxRotation.value = withSequence(
                withTiming(360, { duration: 400 }),
                withTiming(0, { duration: 0 })
            );
        } else {
            checkboxScale.value = withSpring(0.8, { duration: 300 });
            checkboxRotation.value = withTiming(0, { duration: 200 });
        }
    }, [item.completed, checkboxScale, checkboxRotation]);

    // Update selection animation
    useEffect(() => {
        selectionOpacity.value = withTiming(isSelected ? 0.3 : 0, { duration: 200 });
    }, [isSelected, selectionOpacity]);

    const handlePress = async () => {
        // Check if bulk selection is active
        if (onSelect && isSelected !== undefined) {
            handleItemSelect();
            return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Enhanced press animation with micro-interactions
        scale.value = withSequence(
            withTiming(0.96, { duration: 100 }),
            withSpring(1.02, { duration: 150 }),
            withSpring(1, { duration: 200 })
        );

        // Border flash effect
        borderWidth.value = withSequence(
            withTiming(2, { duration: 150 }),
            withDelay(100, withTiming(0, { duration: 200 }))
        );

        // Shadow pulse effect
        shadowOpacity.value = withSequence(
            withTiming(0.3, { duration: 150 }),
            withTiming(0.1, { duration: 300 })
        );

        onToggle();
    };

    const handleLongPress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Long press visual feedback
        scale.value = withSpring(0.95, { duration: 200 });
        shadowOpacity.value = withTiming(0.4, { duration: 200 });

        setShowContextMenu(true);
    };

    const handleContextMenuClose = () => {
        // Reset visual feedback when menu closes
        scale.value = withSpring(1, { duration: 300 });
        shadowOpacity.value = withTiming(0.1, { duration: 300 });
        setShowContextMenu(false);
    };


    const handleDuplicate = () => {
        if (onDuplicate) {
            onDuplicate(item);
        }
    };


    const handleInlineEditSave = (newTitle: string) => {
        if (onEdit) {
            onEdit(item.id, newTitle);
        }
        setIsEditing(false);
    };

    const handleInlineEditCancel = () => {
        setIsEditing(false);
    };

    const handleItemSelect = () => {
        if (onSelect) {
            onSelect();
        }
    };

    // Swipe gesture handlers
    const panGesture = Gesture.Pan()
        .onStart(() => {
            panStartX.value = translateX.value;
        })
        .onUpdate((event) => {
            if (!enableSwipeActions || isEditing || showContextMenu) return;

            const newTranslateX = panStartX.value + event.translationX;

            // Limit swipe distance and add resistance at edges
            if (newTranslateX > 120) {
                translateX.value = 120 + (newTranslateX - 120) * 0.1;
            } else if (newTranslateX < -120) {
                translateX.value = -120 + (newTranslateX + 120) * 0.1;
            } else {
                translateX.value = newTranslateX;
            }
        })
        .onEnd((event) => {
            if (!enableSwipeActions || isEditing || showContextMenu) {
                translateX.value = withSpring(0);
                return;
            }

            const velocity = event.velocityX;
            const translation = translateX.value;

            // Determine action based on swipe distance and velocity
            const shouldTriggerAction = Math.abs(translation) > 80 || Math.abs(velocity) > 1000;

            if (shouldTriggerAction) {
                if (translation > 0 && !item.completed) {
                    // Swipe right to complete
                    runOnJS(onToggle)();
                    translateX.value = withSpring(0);
                } else if (translation < 0) {
                    // Swipe left to delete
                    runOnJS(onDelete)();
                    translateX.value = withSpring(0);
                } else {
                    translateX.value = withSpring(0);
                }
            } else {
                translateX.value = withSpring(0);
            }
        })
        .enabled(enableSwipeActions && !isEditing && !showContextMenu);

    const handleSwipeComplete = () => {
        onToggle();
        translateX.value = withSpring(0);
    };

    const handleSwipeDelete = () => {
        onDelete();
        translateX.value = withSpring(0);
    };

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
        borderWidth: borderWidth.value,
        borderColor: 'rgba(76, 175, 80, 0.6)',
    }));

    const animatedSelectionStyle = useAnimatedStyle(() => ({
        opacity: selectionOpacity.value,
        backgroundColor: withTiming(
            isSelected ? 'rgba(33, 150, 243, 0.3)' : 'transparent',
            { duration: 200 }
        ),
    }));

    const animatedCheckboxStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: checkboxScale.value },
            { rotate: `${checkboxRotation.value}deg` }
        ],
        backgroundColor: item.completed
            ? 'rgba(76, 175, 80, 0.9)'
            : 'rgba(255, 255, 255, 0.1)',
        borderColor: item.completed
            ? 'rgba(76, 175, 80, 1)'
            : 'rgba(255, 255, 255, 0.4)',
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: item.completed ? 0.7 : 1,
        color: item.completed ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 1)',
    }));

    const animatedSwipeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const densityConfig = DENSITY_CONFIGS[density];
    const shouldTruncate = density === 'compact' && !isExpanded && item.title.length > 50;
    const displayText = shouldTruncate ? `${item.title.substring(0, 47)}...` : item.title;

    const handleTextPress = () => {
        if (shouldTruncate && onExpand) {
            onExpand();
        }
    };

    // Show inline editor when editing
    if (isEditing) {
        return (
            <Animated.View
                entering={SlideInRight.delay(100).springify()}
                exiting={SlideOutLeft.duration(400)}
                style={[styles.container, { marginVertical: densityConfig.marginVertical }]}
            >
                <ChecklistInlineEditor
                    initialText={item.title}
                    onSave={handleInlineEditSave}
                    onCancel={handleInlineEditCancel}
                    placeholder="Enter task title..."
                    maxLength={200}
                    multiline={false}
                    autoFocus={true}
                />
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={SlideInRight.delay(100).springify()}
            exiting={SlideOutLeft.duration(400)}
            style={[styles.container, { marginVertical: densityConfig.marginVertical }]}
        >
            {/* Swipe Actions Background */}
            {enableSwipeActions && (
                <ChecklistSwipeActions
                    translateX={translateX}
                    onComplete={handleSwipeComplete}
                    onDelete={handleSwipeDelete}
                    isCompleted={item.completed}
                    showComplete={!item.completed}
                    showDelete={true}
                />
            )}

            {/* Selection overlay */}
            <Animated.View
                style={[styles.selectionOverlay, animatedSelectionStyle]}
                pointerEvents="none"
            />

            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedSwipeStyle}>
                    <AnimatedPressable
                        onPress={handlePress}
                        onLongPress={handleLongPress}
                        style={animatedContainerStyle}
                    >
                        <Card 
                            noPadding 
                            disableTextSelection 
                            style={cardStyle ? StyleSheet.flatten([getCardStyle(densityConfig), cardStyle]) : getCardStyle(densityConfig)}
                            variant={item.completed ? "glass" : "default"}
                            enableDynamicContrast={true}
                            enableMotionEffects={true}
                            enableSpecularHighlights={true}
                            performanceMode="balanced"
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <View style={styles.selectionIndicator}>
                                    <Text style={styles.selectionCheckmark} selectable={false}>✓</Text>
                                </View>
                            )}

                            <Animated.View
                                style={[
                                    getCheckboxStyle(densityConfig),
                                    animatedCheckboxStyle,
                                ]}
                            >
                                {item.completed && (
                                    <Animated.View
                                        entering={FadeIn.duration(200)}
                                        style={styles.checkmark}
                                    >
                                        <Text style={styles.checkmarkText} selectable={false}>✓</Text>
                                    </Animated.View>
                                )}
                            </Animated.View>

                            <View style={styles.textContainer} pointerEvents={shouldTruncate ? 'auto' : 'none'}>
                                <Animated.Text
                                    onPress={shouldTruncate ? handleTextPress : undefined}
                                    style={[
                                        getTextStyle(densityConfig),
                                        animatedTextStyle,
                                        { textDecorationLine: item.completed ? 'line-through' : 'none' },
                                    ]}
                                    numberOfLines={density === 'compact' && !isExpanded ? 1 : undefined}
                                    selectable={false}
                                >
                                    {displayText}
                                </Animated.Text>

                            </View>
                        </Card>
                    </AnimatedPressable>
                </Animated.View>
            </GestureDetector>

            <ChecklistContextMenu
                item={item}
                visible={showContextMenu}
                onClose={handleContextMenuClose}
                onEdit={() => setIsEditing(true)}
                onDelete={onDelete}
                onDuplicate={handleDuplicate}
            />
        </Animated.View>
    );
};

const getCardStyle = (config: typeof DENSITY_CONFIGS.normal) => ({
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: config.verticalPadding,
    paddingHorizontal: config.horizontalPadding,
    minHeight: config.cardHeight,
});

const getCheckboxStyle = (config: typeof DENSITY_CONFIGS.normal) => ({
    width: config.checkboxSize,
    height: config.checkboxSize,
    borderRadius: config.checkboxSize / 2,
    borderWidth: 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: config.checkboxMargin,
    marginTop: 2, // Small fixed margin to align with text baseline
    flexShrink: 0, // Prevent checkbox from shrinking
    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
});

const getTextStyle = (config: typeof DENSITY_CONFIGS.normal) => ({
    color: '#fff',
    fontSize: config.fontSize,
    flex: 1,
    lineHeight: config.lineHeight,
    fontWeight: '500' as const,
    paddingTop: 0,
});

const styles = StyleSheet.create({
    container: {},
    checkmark: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // Inline editing and selection styles
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        zIndex: -1,
    },
    selectionIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(33, 150, 243, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    selectionCheckmark: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 2, // Align text with checkbox visually
    },
});
