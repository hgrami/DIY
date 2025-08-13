import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tab {
  id: string;
  label: string;
  icon: string;
  visible?: boolean;
}

interface CompactTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
}

export const CompactTabBar: React.FC<CompactTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const indicatorPosition = useSharedValue(0);

  // Filter visible tabs
  const visibleTabs = tabs.filter(tab => tab.visible !== false);

  useEffect(() => {
    const newIndex = visibleTabs.findIndex(tab => tab.id === activeTab);
    if (newIndex >= 0) {
      indicatorPosition.value = withTiming(newIndex, {
        duration: 250,
      });

      // Auto-scroll to center active tab
      const tabWidth = 100; // Approximate tab width
      const scrollX = Math.max(0, (newIndex * tabWidth) - (SCREEN_WIDTH / 2) + (tabWidth / 2));
      scrollViewRef.current?.scrollTo({ x: scrollX, animated: true });
    }
  }, [activeTab, visibleTabs]);

  const handleTabPress = async (tabId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(tabId);
  };

  const renderTab = (tab: Tab, index: number) => {
    const isActive = tab.id === activeTab;
    
    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        indicatorPosition.value,
        [index - 1, index, index + 1],
        [0.95, 1, 0.95],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ scale }],
      };
    });

    return (
      <TouchableOpacity
        key={tab.id}
        style={styles.tab}
        onPress={() => handleTabPress(tab.id)}
        activeOpacity={0.7}
        accessibilityLabel={`${tab.label} tab`}
        accessibilityHint={`Navigate to ${tab.label.toLowerCase()} section`}
        accessibilityState={{ selected: isActive }}
      >
        <Animated.View style={[styles.tabContent, animatedStyle]}>
          <Feather
            name={tab.icon as any}
            size={18}
            color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </Animated.View>
        
        {/* Active indicator */}
        {isActive && (
          <Animated.View
            style={styles.activeIndicator}
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        decelerationRate="fast"
      >
        {visibleTabs.map(renderTab)}
      </ScrollView>
      
      {/* Background overlay for better contrast */}
      <View style={styles.backgroundOverlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
    zIndex: -1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  tab: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});

export default CompactTabBar;