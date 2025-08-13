import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import { Button } from './Button';
import { ChatThreadList } from './chat/ChatThreadList';
import { apiService } from '../services/api';
import { Project } from '../@types';

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

interface AiChatTabProps {
  project: Project;
  onStartChat: () => void;
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string;
}

export const AiChatTab: React.FC<AiChatTabProps> = ({
  project,
  onStartChat,
  onSelectThread,
  currentThreadId,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllThreads, setShowAllThreads] = useState(false);

  useEffect(() => {
    loadChatThreads();
  }, [project.shortId]);

  const loadChatThreads = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<ChatThread[]>(`/api/projects/${project.shortId}/ai-threads`);
      if (response.success && response.data) {
        setThreads(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = useCallback(async (threadId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectThread(threadId);
  }, [onSelectThread]);

  const handleNewThread = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartChat();
  }, [onStartChat]);

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
              await apiService.delete(`/api/projects/${project.shortId}/ai-threads/${threadId}`);
              setThreads(prev => prev.filter(thread => thread.id !== threadId));
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
    
    const firstUserMessage = thread.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 30 
        ? firstUserMessage.content.substring(0, 27) + '...'
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
    const content = lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 47) + '...'
      : lastMessage.content;
    
    return preview + content;
  };

  const recentThreads = threads.slice(0, 3);
  const hasMoreThreads = threads.length > 3;

  if (loading) {
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="glass">
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chat history...</Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Start New Chat Card */}
        <Animated.View entering={FadeIn.delay(100)}>
          <Card variant="highlighted">
            <View style={styles.newChatContainer}>
              <Feather name="message-circle" size={48} color="#667eea" />
              <Text style={styles.newChatTitle}>AI Project Assistant</Text>
              <Text style={styles.newChatDescription}>
                Get intelligent help and suggestions for your project
              </Text>
              <Button
                title="Start New Chat"
                onPress={handleNewThread}
                variant="primary"
              />
            </View>
          </Card>
        </Animated.View>

        {/* Recent Conversations */}
        {threads.length > 0 && (
          <Animated.View entering={FadeIn.delay(200)}>
            <Card variant="glass">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Conversations</Text>
                {hasMoreThreads && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setShowAllThreads(true)}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <Feather name="chevron-right" size={16} color="#667eea" />
                  </TouchableOpacity>
                )}
              </View>

              {recentThreads.map((thread, index) => (
                <Animated.View
                  key={thread.id}
                  entering={FadeIn.delay(300 + index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.threadItem,
                      currentThreadId === thread.id && styles.currentThreadItem
                    ]}
                    onPress={() => handleThreadSelect(thread.id)}
                  >
                    <LinearGradient
                      colors={currentThreadId === thread.id 
                        ? ['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.15)']
                        : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
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

                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          onPress={() => handleDeleteThread(thread.id)}
                        >
                          <Feather name="trash-2" size={14} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Empty State for no conversations */}
        {threads.length === 0 && (
          <Animated.View entering={FadeIn.delay(300)}>
            <Card variant="default">
              <View style={styles.emptyStateContainer}>
                <Feather name="message-square" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateTitle}>No conversations yet</Text>
                <Text style={styles.emptyStateDescription}>
                  Start a new conversation to begin getting AI assistance with your project.
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Full Thread List Modal */}
      <ChatThreadList
        visible={showAllThreads}
        projectShortId={project.shortId}
        onThreadSelect={(threadId) => {
          handleThreadSelect(threadId);
          setShowAllThreads(false);
        }}
        onNewThread={() => {
          handleNewThread();
          setShowAllThreads(false);
        }}
        onClose={() => setShowAllThreads(false)}
        currentThreadId={currentThreadId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  newChatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
  newChatTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  newChatDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    fontWeight: '400',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  threadItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentThreadItem: {
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
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
  deleteIconButton: {
    padding: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});