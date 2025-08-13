import React, { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, Modal, Platform, ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolate, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');
const HANDLE_H = 48; // enlarged for easier grabbing

export interface CustomBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    snapPoints?: string[]; // e.g., ['25%','60%','90%']
    initialSnapIndex?: number;
    children: ReactNode;
    contentContainerStyle?: StyleProp<ViewStyle>;
    footer?: ReactNode; // sticky footer
    disableScrollView?: boolean; // Disable scroll view wrapper for FlatList content
    headerRight?: ReactNode; // Optional header right component
}

export const CustomBottomSheet: FC<CustomBottomSheetProps> = ({
    visible,
    onClose,
    title,
    description,
    snapPoints = ['30%', '55%', '90%'],
    initialSnapIndex = 1,
    children,
    contentContainerStyle,
    footer,
    disableScrollView = false,
    headerRight,
}) => {
    const sheetY = useSharedValue(SCREEN_H);
    const dragStartY = useSharedValue(0);
    const [kb, setKb] = useState(0);
    const [level, setLevel] = useState(initialSnapIndex);

    const percents = useMemo(() => snapPoints.map(p => Math.max(0, Math.min(100, parseFloat(p.replace('%', '') || '0'))) / 100), [snapPoints]);

    const freeSpace = SCREEN_H - kb;
    const snapHeight = freeSpace * (percents[level] ?? 0.55);

    const springTo = useCallback((to: number) => {
        sheetY.value = withSpring(to, { damping: 20, stiffness: 200, mass: 0.8 });
    }, [sheetY]);

    const handleDismiss = useCallback(() => {
        Keyboard.dismiss();
        sheetY.value = withTiming(SCREEN_H, { duration: 300 });
        setTimeout(onClose, 300);
    }, [onClose, sheetY]);

    useEffect(() => {
        const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvt, e => setKb(e.endCoordinates.height));
        const hideSub = Keyboard.addListener(hideEvt, () => setKb(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // Open / close
    useEffect(() => {
        if (visible) {
            setLevel(initialSnapIndex);
            sheetY.value = snapHeight;
            springTo(0);
        } else {
            springTo(SCREEN_H);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Level and keyboard changes keep it snapped
    useEffect(() => {
        if (visible) {
            springTo(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, kb]);

    const cycleSnap = useCallback(() => {
        const next = level + 1 <= percents.length - 1 ? level + 1 : 0;
        setLevel(next);
    }, [level, percents.length]);

    const pan = Gesture.Pan()
        .onBegin(() => {
            dragStartY.value = sheetY.value;
        })
        .onUpdate(e => {
            const next = Math.max(0, Math.min(snapHeight + 50, dragStartY.value + e.translationY));
            sheetY.value = next;
        })
        .onEnd(e => {
            const translationY = e.translationY;
            const velocityY = e.velocityY;
            let nextLevel = level;
            if (translationY < -60 || velocityY < -600) { // lowered thresholds
                if (level < percents.length - 1) nextLevel = level + 1;
            } else if (translationY > 60 || velocityY > 600) {
                if (level > 0) nextLevel = level - 1; else {
                    runOnJS(handleDismiss)();
                    return;
                }
            }
            if (nextLevel !== level) {
                runOnJS(setLevel)(nextLevel);
            } else {
                runOnJS(springTo)(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: sheetY.value - kb }],
            height: snapHeight,
        };
    });

    if (!visible) return null;

    return (
        <Modal transparent animationType="none" visible onRequestClose={handleDismiss}>
            <View style={styles.backdrop} />
            <Animated.View style={[styles.sheet, animatedStyle]}>
                {/* Handle area only for dragging; do not overlay header/actions */}
                <GestureDetector gesture={pan}>
                    <View style={styles.handleWrap}>
                        <TouchableOpacity onPress={cycleSnap} activeOpacity={0.8} style={styles.handleTouchable}>
                            <View style={styles.handle} />
                        </TouchableOpacity>
                    </View>
                </GestureDetector>

                {!!title && (
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{title}</Text>
                        <View style={styles.headerActions}>
                            {headerRight}
                            <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }} style={styles.closeButton}>
                                <Feather name="x" size={22} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {!!description && <Text style={styles.description}>{description}</Text>}

                {disableScrollView ? (
                    <View style={[styles.contentWrapper, contentContainerStyle, { paddingBottom: footer ? 96 : 24 }]}>
                        {children}
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.contentContainer, contentContainerStyle, { paddingBottom: footer ? 96 : 24 }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                )}

                {footer && (
                    <View style={styles.footer}>
                        {footer}
                    </View>
                )}
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#2C2C2E',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    handleWrap: { height: HANDLE_H, alignItems: 'center', justifyContent: 'center' },
    handleTouchable: { paddingVertical: 10, paddingHorizontal: 28, borderRadius: 16 },
    handle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#666' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    closeButton: {
        // No additional styles needed, using existing behavior
    },
    description: { color: 'rgba(255,255,255,0.7)', fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
    scroll: { flex: 1, paddingHorizontal: 16 },
    contentContainer: { paddingTop: 8 },
    contentWrapper: { flex: 1, paddingTop: 8 },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255, 255, 255, 0.12)'
    },
});
