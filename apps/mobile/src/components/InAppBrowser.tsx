import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeModal } from './NativeModal';
import { DIYSearchResult } from '../services/searchService';

interface InAppBrowserProps {
  isVisible: boolean;
  onClose: () => void;
  searchResult: DIYSearchResult | null;
  onActionPress?: (result: DIYSearchResult) => void;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({
  isVisible,
  onClose,
  searchResult,
  onActionPress,
}) => {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [error, setError] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setLoading(navState.loading);
  };

  const handleGoBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.goBack();
  };

  const handleGoForward = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.goForward();
  };

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    webViewRef.current?.reload();
  };

  const handleShare = async () => {
    if (!searchResult || !currentUrl) return;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out this DIY resource: ${searchResult.title}\n\n${currentUrl}`,
        title: searchResult.title,
        url: currentUrl,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleActionPress = async () => {
    if (!searchResult) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onActionPress?.(searchResult);
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setError(false);
    setLoading(false);
  };

  const handleLoadStart = () => {
    setError(false);
    setLoading(true);
  };

  if (!searchResult) return null;

  return (
    <NativeModal
      isVisible={isVisible}
      onClose={onClose}
      backgroundColor="rgba(28, 28, 30, 1)"
      allowSwipeToClose={false}
      showCloseButton={false}
      disableScrollView={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1c1c1e" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <LinearGradient
          colors={['rgba(28, 28, 30, 1)', 'rgba(28, 28, 30, 0.95)']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.headerContent}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title and URL */}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {searchResult.title}
            </Text>
            <Text style={styles.url} numberOfLines={1}>
              {currentUrl || searchResult.url}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {onActionPress && (
              <TouchableOpacity
                onPress={handleActionPress}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="plus-circle" size={20} color="#667eea" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleShare}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="share" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* WebView Container */}
      <View style={styles.webViewContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Feather name="wifi-off" size={48} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.errorTitle}>Unable to Load Page</Text>
            <Text style={styles.errorMessage}>
              Check your internet connection and try again
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.retryButton}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.retryButtonGradient}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: searchResult.url }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onError={handleError}
            onLoad={handleLoad}
            onLoadStart={handleLoadStart}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
            allowsBackForwardNavigationGestures={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <LinearGradient
          colors={['rgba(28, 28, 30, 0.95)', 'rgba(28, 28, 30, 1)']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.navControls}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
            disabled={!canGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather 
              name="arrow-left" 
              size={20} 
              color={canGoBack ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoForward}
            style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
            disabled={!canGoForward}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather 
              name="arrow-right" 
              size={20} 
              color={canGoForward ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.navButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather 
              name={loading ? "x" : "refresh-cw"} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </NativeModal>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  url: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 40,
  },
  navButton: {
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
});