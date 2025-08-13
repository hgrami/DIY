import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Haptics from 'expo-haptics';

interface ResourceViewerProps {
  visible: boolean;
  onClose: () => void;
  resource: {
    title: string;
    url: string;
    source: string;
    isYouTube?: boolean;
    videoId?: string;
    snippet?: string;
  };
}

const { width, height } = Dimensions.get('window');

export const ResourceViewer: React.FC<ResourceViewerProps> = ({
  visible,
  onClose,
  resource
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (!visible) return null;

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this DIY resource: ${resource.title}\n${resource.url}`,
        url: resource.url,
        title: resource.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlaying(false);
    onClose();
  };

  const onStateChange = (state: string) => {
    if (state === 'ended') {
      setPlaying(false);
    }
  };

  const renderYouTubePlayer = () => {
    if (!resource.videoId) {
      return (
        <View style={styles.errorContainer}>
          <Feather name="video-off" size={48} color="rgba(255,255,255,0.5)" />
          <Text style={styles.errorText}>Invalid YouTube video</Text>
        </View>
      );
    }

    return (
      <View style={styles.playerContainer}>
        <YoutubePlayer
          height={220}
          play={playing}
          videoId={resource.videoId}
          onChangeState={onStateChange}
          onReady={() => setLoading(false)}
          onError={() => setError(true)}
          webViewStyle={styles.youtubePlayer}
          initialPlayerParams={{
            cc_lang_pref: 'en',
            showClosedCaptions: true,
            rel: false,
            modestbranding: true,
          }}
        />
        
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => setPlaying(!playing)}
        >
          <LinearGradient
            colors={['rgba(255,0,0,0.9)', 'rgba(255,0,0,0.7)']}
            style={styles.playButtonGradient}
          >
            <Feather 
              name={playing ? "pause" : "play"} 
              size={24} 
              color="#FFFFFF" 
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWebView = () => {
    return (
      <WebView
        source={{ uri: resource.url }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        startInLoadingState={true}
        renderError={(errorName) => (
          <View style={styles.errorContainer}>
            <Feather name="wifi-off" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.errorText}>Failed to load page</Text>
            <Text style={styles.errorSubtext}>{errorName}</Text>
          </View>
        )}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
              style={styles.loadingOverlay}
            >
              <Text style={styles.loadingText}>Loading...</Text>
            </LinearGradient>
          </View>
        )}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        domStorageEnabled
        javaScriptEnabled
        mixedContentMode="compatibility"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {resource.title}
            </Text>
            <Text style={styles.source}>
              {resource.source} • {resource.isYouTube ? 'Video' : 'Website'}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Feather name="share" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.errorText}>Unable to load content</Text>
              <Text style={styles.errorSubtext}>Please try again later</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                setError(false);
                setLoading(true);
              }}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : resource.isYouTube ? (
            renderYouTubePlayer()
          ) : (
            renderWebView()
          )}
        </View>

        {/* Description */}
        {resource.snippet && (
          <View style={styles.description}>
            <Text style={styles.descriptionText}>{resource.snippet}</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  source: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    position: 'relative',
  },
  youtubePlayer: {
    backgroundColor: '#000',
  },
  playButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  playButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  description: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  descriptionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
});