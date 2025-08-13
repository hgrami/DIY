import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { apiService } from '../../services/api';

interface ChatThread {
  id: string;
  title: string | null;
  startedAt: string;
  lastMessageAt: string;
  messages: Array<{
    id: string;
    content: string;
    role: string;
    createdAt: string;
  }>;
}

interface ChatThreadListProps {
  visible: boolean;
  projectShortId: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onClose: () => void;
  currentThreadId?: string;
}

export const ChatThreadList: React.FC<ChatThreadListProps> = ({
  visible,
  projectShortId,
  onThreadSelect,
  onNewThread,
  onClose,
  currentThreadId,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 [ChatThreadList] Visibility changed to:', visible);
    if (visible) {
      console.log('🔍 [ChatThreadList] Loading chat threads for project:', projectShortId);
      loadChatThreads();
    }
  }, [visible, projectShortId]);

  const loadChatThreads = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<any>(`/api/projects/${projectShortId}/ai-threads`);
      if (response.success && response.data) {
        setThreads(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat threads:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('🔍 [ChatThreadList] Thread selected:', threadId);
    onThreadSelect(threadId);
    console.log('🔍 [ChatThreadList] Calling onClose after thread selection');
    onClose();
  };

  const handleNewThread = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('🔍 [ChatThreadList] New thread requested');
    onNewThread();
    console.log('🔍 [ChatThreadList] Calling onClose after new thread');
    onClose();
  };

  const handleDeleteThread = async (threadId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.delete(`/api/projects/${projectShortId}/ai-threads/${threadId}`);
              setThreads(prev => prev.filter(thread => thread.id !== threadId));

              // If we deleted the current thread, start a new one
              if (threadId === currentThreadId) {
                onNewThread();
              }
            } catch (error) {
              console.error('Failed to delete thread:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getThreadTitle = (thread: ChatThread) => {
    if (thread.title) {
      return thread.title;
    }

    // Use first user message as title
    const firstUserMessage = thread.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 40
        ? firstUserMessage.content.substring(0, 37) + '...'
        : firstUserMessage.content;
    }

    return 'New Conversation';
  };

  const getLastMessage = (thread: ChatThread) => {
    if (thread.messages.length === 0) {
      return 'No messages';
    }

    const lastMessage = thread.messages[thread.messages.length - 1];
    const preview = lastMessage.role === 'user' ? 'You: ' : 'AI: ';
    const content = lastMessage.content.length > 60
      ? lastMessage.content.substring(0, 57) + '...'
      : lastMessage.content;

    return preview + content;
  };

  const renderThreadItem = ({ item: thread }: { item: ChatThread }) => (
    <Animated.View
      entering={FadeIn.delay(100)}
      style={[
        styles.threadItem,
        currentThreadId === thread.id && styles.currentThreadItem
      ]}
    >
      <TouchableOpacity
        style={styles.threadContent}
        onPress={() => handleThreadSelect(thread.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={currentThreadId === thread.id
            ? ['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.15)']
            : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
          }
          style={styles.threadGradient}
        >
          <View style={styles.threadHeader}>
            <Text style={styles.threadTitle} numberOfLines={1}>
              {getThreadTitle(thread)}
            </Text>
            <Text style={styles.threadDate}>
              {formatDate(thread.lastMessageAt)}
            </Text>
          </View>

          <Text style={styles.threadPreview} numberOfLines={2}>
            {getLastMessage(thread)}
          </Text>

          <View style={styles.threadFooter}>
            <View style={styles.messageCount}>
              <Feather name="message-circle" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.messageCountText}>
                {thread.messages.length} messages
              </Text>
            </View>

            {currentThreadId === thread.id && (
              <View style={styles.currentIndicator}>
                <Text style={styles.currentText}>Current</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteThread(thread.id)}
      >
        <Feather name="trash-2" size={16} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </Animated.View>
  );

  console.log('🔍 [ChatThreadList] Render check - visible:', visible);
  
  if (!visible) {
    console.log('🔍 [ChatThreadList] Not visible, returning null');
    return null;
  }

  console.log('🔍 [ChatThreadList] Rendering modal with threads:', threads.length);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={['#1a1d3a', '#2d1b69', '#667eea']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="message-square" size={20} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Chat History</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* New Thread Button */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.newThreadContainer}>
          <TouchableOpacity style={styles.newThreadButton} onPress={handleNewThread}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.newThreadGradient}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.newThreadText}>Start New Conversation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Thread List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chat history...</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a new conversation to begin getting AI assistance with your project.
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            renderItem={renderThreadItem}
            keyExtractor={(item) => item.id}
            style={styles.threadList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.threadListContent}
          />
        )}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1d3a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  newThreadContainer: {
    padding: 20,
  },
  newThreadButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newThreadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  newThreadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  threadList: {
    flex: 1,
  },
  threadListContent: {
    padding: 20,
    paddingTop: 0,
  },
  threadItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  currentThreadItem: {
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  threadContent: {
    flex: 1,
  },
  threadGradient: {
    padding: 16,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  threadDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  threadPreview: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 12,
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  currentIndicator: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#667eea',
  },
  deleteButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
});