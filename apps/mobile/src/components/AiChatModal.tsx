import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeModal } from './NativeModal';
import { Project, AiChatMessage } from '../@types';
import { useAuthContext } from '../context/AuthContext';
import { apiService } from '../services/api';
import { ResourceCardContainer } from './chat/ResourceCardContainer';
import { ResourceSuggestion } from './chat/ResourceCard';

interface AiChatModalProps {
  visible: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdate?: () => void;
  initialThreadId?: string;
}

interface ChatMessage extends AiChatMessage {
  isLoading?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Find project inspiration",
  "Generate material list",
  "Break down into steps",
  "Help me budget this project",
  "Create a timeline",
  "Safety considerations"
];

export const AiChatModal: React.FC<AiChatModalProps> = ({
  visible,
  onClose,
  project,
  onProjectUpdate,
  initialThreadId,
}) => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(initialThreadId);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Check user subscription status before sending message
    const isPremiumUser = user?.subscriptionStatus && user.subscriptionStatus !== 'FREE';
    if (!isPremiumUser) {
      Alert.alert(
        'Premium Feature',
        'AI Chat is available for premium users only. Please upgrade to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      projectId: project.id,
      role: 'user',
      content: message.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      console.log(`Making AI chat request to: /api/projects/${project.shortId}/ai-chat`);
      const response = await apiService.post<any>(`/api/projects/${project.shortId}/ai-chat`, {
        message: message.trim(),
        threadId: currentThreadId,
        context: {
          title: project.title,
          goal: project.goal,
          description: project.description,
          deadline: project.deadline,
          inspirationLinks: project.inspirationLinks,
          materials: project.materials,
          checklistItems: project.checklistItems,
          notes: project.notes,
        }
      });

      console.log('AI Chat API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle function calls with null message
        let messageContent = response.data.message;

        if (!messageContent && response.data.functionCall) {
          const funcName = response.data.functionCall.name;
          const funcResult = response.data.functionCall.result;

          switch (funcName) {
            case 'generateMaterials':
              messageContent = funcResult?.message || 'I\'ve generated a materials list for your project! Check the Materials tab to see the new items.';
              break;
            case 'generateChecklist':
              messageContent = funcResult?.message || 'I\'ve created a task checklist for your project! Check the Tasks tab to see the new items.';
              break;
            case 'searchInspiration':
              messageContent = funcResult?.message || 'I\'ve found some great inspiration links for your project! Check the Inspiration tab to see them.';
              break;
            case 'summarizeNotes':
              messageContent = funcResult?.message || 'I\'ve summarized your project notes! Check the Notes tab to see the summary.';
              break;
            default:
              messageContent = 'I\'ve completed the requested action for your project!';
          }
        }

        // Update thread ID if returned from API (either new thread or continuing thread)
        if (response.data.threadId) {
          if (response.data.threadId !== currentThreadId) {
            console.log('🔍 [AiChatModal] Backend returned thread ID:', response.data.threadId, 'Current:', currentThreadId);
            setCurrentThreadId(response.data.threadId);
          }
        }

        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          projectId: project.id,
          role: 'assistant',
          content: messageContent || 'I apologize, but I encountered an issue processing your request.',
          functionCall: response.data.functionCall,
          createdAt: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
        scrollToBottom();
      } else {
        // Handle API response without success flag
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          projectId: project.id,
          role: 'assistant',
          content: 'I apologize, but the AI service is currently unavailable. Please try again later.',
          createdAt: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('AI Chat error:', error);

      // Handle deleted thread error - clear thread and start fresh
      if (error?.message?.includes('thread not found') || error?.message?.includes('Chat thread not found')) {
        console.log('🔍 [AiChatModal] Thread was deleted, clearing currentThreadId and starting fresh');
        setCurrentThreadId(undefined);
        setMessages([]);
      }

      // Create error message for user
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        projectId: project.id,
        role: 'assistant',
        content: error?.message?.includes('JSON')
          ? 'I apologize, but there was a connection issue. Please check your internet connection and try again.'
          : error?.message?.includes('thread not found') || error?.message?.includes('Chat thread not found')
          ? 'Starting a fresh conversation. Please try your message again.'
          : 'I apologize, but I encountered an issue processing your request. Please try again.',
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  }, [project, isLoading, scrollToBottom, user]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);



  // Load initial thread when modal opens with improved persistence
  useEffect(() => {
    if (visible && !initialThreadId && !currentThreadId) {
      // Only clear if we don't have a current thread (maintain session persistence)
      console.log('🔍 [AiChatModal] No initial thread, starting fresh');
      setCurrentThreadId(undefined);
      setMessages([]);
    } else if (visible && currentThreadId) {
      // We already have a thread - maintain it
      console.log('🔍 [AiChatModal] Maintaining current thread:', currentThreadId);
    }
  }, [visible, initialThreadId, currentThreadId]);

  const handleNewThread = useCallback(() => {
    console.log('🔍 [AiChatModal] Starting new thread');
    setCurrentThreadId(undefined);
    setMessages([]);
    setInputText('');
  }, []);



  const convertFunctionCallToResources = useCallback((functionCall: any): ResourceSuggestion[] => {
    const resources: ResourceSuggestion[] = [];

    if (!functionCall?.result) return resources;

    const result = functionCall.result;

    // Convert materials
    if (result.materials) {
      result.materials.forEach((material: any, index: number) => {
        resources.push({
          id: `material-${Date.now()}-${index}`,
          type: 'material',
          title: material.name,
          description: material.notes || `${material.quantity} needed`,
          estimatedCost: material.estimatedPrice,
          details: {
            quantity: material.quantity,
            category: material.category,
          },
        });
      });
    }

    // Convert tasks
    if (result.tasks) {
      result.tasks.forEach((task: any, index: number) => {
        resources.push({
          id: `task-${Date.now()}-${index}`,
          type: 'task',
          title: task.title,
          description: task.notes,
          estimatedTime: task.estimatedTime,
          difficulty: task.difficulty,
          details: {
            order: task.order,
          },
        });
      });
    }

    // Convert inspiration links
    if (result.links) {
      result.links.forEach((link: any, index: number) => {
        resources.push({
          id: `inspiration-${Date.now()}-${index}`,
          type: 'inspiration',
          title: link.title,
          description: `From ${link.source}`,
          url: link.url,
          difficulty: link.difficulty,
          tags: link.tags,
          details: {
            source: link.source,
          },
        });
      });
    }

    // Convert summary note
    if (result.summary && result.summary.content) {
      resources.push({
        id: `note-${Date.now()}`,
        type: 'note',
        title: result.summary.url ? 'Webpage Analysis' : 'Project Notes Summary',
        description: result.summary.content.substring(0, 150) + (result.summary.content.length > 150 ? '...' : ''),
        tags: result.summary.tags,
        url: result.summary.url, // Include URL for webpage analyses
        difficulty: result.summary.difficulty,
        details: {
          fullContent: result.summary.content,
          analysisData: result.summary.analysisData,
        },
      });
    }

    return resources;
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    // Check if this message has function call with resource suggestions
    const hasResourceSuggestions = item.functionCall?.result?.materials ||
      item.functionCall?.result?.tasks ||
      item.functionCall?.result?.links ||
      item.functionCall?.result?.summary;

    return (
      <View style={[styles.messageContainer, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
        <LinearGradient
          colors={item.role === 'user'
            ? ['#667eea', '#764ba2']
            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
          }
          style={styles.messageGradient}
        >
          <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </LinearGradient>

        {/* Render resource cards if function call has suggestions */}
        {hasResourceSuggestions && (
          <View style={styles.resourceCardsContainer}>
            <ResourceCardContainer
              resources={convertFunctionCallToResources(item.functionCall)}
              projectId={project.id}
              projectShortId={project.shortId}
              onResourceAdded={(resource) => {
                console.log('Resource added:', resource);
                // Trigger project data refresh
                if (onProjectUpdate) {
                  onProjectUpdate();
                }
              }}
              onAllResourcesProcessed={() => {
                console.log('All resources processed for message:', item.id);
              }}
            />
          </View>
        )}
      </View>
    );
  }, [project, convertFunctionCallToResources]);

  const renderSuggestedPrompts = useCallback(() => (
    <View style={styles.suggestedPromptsContainer}>
      <Text style={styles.suggestedTitle}>Suggested prompts:</Text>
      <View style={styles.promptsGrid}>
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.promptChip}
            onPress={() => handleSuggestedPrompt(prompt)}
            disabled={isLoading}
          >
            <Text style={styles.promptText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [handleSuggestedPrompt, isLoading]);

  const renderNewConversationButton = useCallback(() => (
    <View style={styles.newConversationContainer}>
      <TouchableOpacity
        style={styles.newConversationButton}
        onPress={handleNewThread}
        disabled={isLoading}
      >
        <LinearGradient
          colors={['rgba(102, 126, 234, 0.8)', 'rgba(118, 75, 162, 0.8)']}
          style={styles.newConversationGradient}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.newConversationText}>Start New Conversation</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  ), [handleNewThread, isLoading]);

  const renderChatInput = useCallback(() => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your project..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            maxLength={500}
            editable={!isLoading}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Feather
              name={isLoading ? "loader" : "send"}
              size={20}
              color={(!inputText.trim() || isLoading) ? "rgba(255,255,255,0.3)" : "#667eea"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  ), [inputText, isLoading, sendMessage]);

  return (
    <>
      <NativeModal
        isVisible={visible}
        onClose={onClose}
        title="AI Project Assistant"
        size="full"
        allowSwipeToClose={true}
        footerComponent={renderChatInput()}
        disableScrollView={true}
        showCloseButton={true}
      >
        {messages.length === 0 ? (
          <View style={styles.chatContainer}>
            {renderSuggestedPrompts()}
          </View>
        ) : (
          <View style={styles.chatContainer}>
            {renderNewConversationButton()}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
              style={styles.messagesList}
              ListFooterComponent={
                isLoading ? (
                  <View style={styles.loadingContainer}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                      style={styles.loadingGradient}
                    >
                      <Text style={styles.loadingText}>AI is thinking...</Text>
                      <Feather name="loader" size={16} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                  </View>
                ) : null
              }
            />
          </View>
        )}
      </NativeModal>


    </>
  );
};

const styles = StyleSheet.create({
  customHeader: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  customHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    minHeight: 200,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContainer: {
    paddingBottom: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageGradient: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: 'rgba(255,255,255,0.9)',
  },
  suggestedPromptsContainer: {
    paddingTop: 8,
  },
  suggestedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  promptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  promptText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  loadingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    maxWidth: '60%',
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    minHeight: 24,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resourceCardsContainer: {
    marginTop: 8,
    width: '100%',
  },
  newConversationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newConversationButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  newConversationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  newConversationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});