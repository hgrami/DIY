import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { Button } from './Button';
import { Card } from './Card';
import { apiService } from '../services/api';

interface InterviewQuestion {
  question: string;
  answer: string;
}

interface InterviewData {
  questions: string[];
  focusAreas: string[];
  reasoning: string;
  timestamp: string;
}

interface ProjectInterviewModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectShortId: string;
  interviewData: InterviewData;
  onComplete: (answers: Record<string, string>) => void;
}

export const ProjectInterviewModal: React.FC<ProjectInterviewModalProps> = ({
  visible,
  onClose,
  projectId,
  projectShortId,
  interviewData,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(() => {
    if (!interviewData?.questions || !Array.isArray(interviewData.questions)) {
      return [];
    }
    const mappedQuestions = interviewData.questions.map(q => ({ question: q, answer: '' }));
    return mappedQuestions;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const scaleValue = useSharedValue(1);
  const progressValue = useSharedValue(0);

  // Initialize progress animation
  React.useEffect(() => {
    if (visible) {
      const answeredCount = questions.filter(q => q.answer.trim().length > 0).length;
      const progress = questions.length > 0 ? (answeredCount / questions.length) : 0;
      progressValue.value = withTiming(progress, { duration: 800 });

      scaleValue.value = withRepeat(
        withTiming(1.05, { duration: 2000 }),
        -1,
        true
      );
    }
  }, [visible, questions, currentQuestionIndex]);

  const handleAnswerChange = useCallback((index: number, answer: string) => {
    setQuestions(prev => prev.map((q, i) =>
      i === index ? { ...q, answer } : q
    ));
  }, []);

  const handleSubmit = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if at least half the questions are answered
    const answeredQuestions = questions.filter(q => q.answer.trim().length > 0);
    if (answeredQuestions.length === 0) {
      Alert.alert(
        'Please provide some answers',
        'Answer at least one question to help improve your project assistance.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare answers object
      const answers: Record<string, string> = {};
      questions.forEach((q, index) => {
        if (q.answer.trim()) {
          answers[`question_${index + 1}`] = q.answer.trim();
        }
      });

      // Save interview responses to project
      const interviewContext = {
        questions: questions.map(q => q.question),
        answers,
        focusAreas: interviewData.focusAreas,
        reasoning: interviewData.reasoning,
        completedAt: new Date().toISOString(),
        timestamp: interviewData.timestamp,
      };

      const response = await apiService.put(`/api/projects/${projectShortId}/interview`, {
        interviewContext
      });

      if (response.success) {
        onComplete(answers);
        onClose();
      } else {
        throw new Error('Failed to save interview responses');
      }
    } catch (error) {
      console.error('Failed to submit interview:', error);
      Alert.alert(
        'Error',
        'Failed to save your responses. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, projectShortId, interviewData, onComplete, onClose]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Interview',
      'You can always provide this information later to get better project assistance. Skip for now?',
      [
        { text: 'Continue Interview', style: 'cancel' },
        { text: 'Skip', style: 'default', onPress: onClose }
      ]
    );
  }, [onClose]);

  const answeredCount = questions.filter(q => q.answer.trim().length > 0).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) : 0;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scaleValue.value,
      [1, 1.05],
      [1, 1.02]
    );

    return {
      transform: [{ scale }],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${interpolate(progressValue.value, [0, 1], [0, 100])}%`,
    };
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={['#1a1d3a', '#2d1b69', '#667eea']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {showIntro ? (
              /* Introduction Screen */
              <Animated.View
                entering={FadeIn.duration(600)}
                exiting={FadeOut.duration(400)}
                style={styles.introContainer}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleSkip}
                  hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                >
                  <Feather name="x" size={24} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                <View style={styles.introContent}>
                  <Animated.View style={[styles.iconContainer, progressAnimatedStyle]}>
                    <View style={styles.iconInner}>
                      <Feather name="help-circle" size={48} color="#667eea" />
                    </View>

                    {/* Pulsing rings */}
                    <View style={[styles.pulseRing, styles.pulseRing1]} />
                    <View style={[styles.pulseRing, styles.pulseRing2]} />
                    <View style={[styles.pulseRing, styles.pulseRing3]} />
                  </Animated.View>

                  <Text style={styles.introTitle}>Tell Me About Your Project</Text>
                  <Text style={styles.introDescription}>
                    {interviewData.reasoning}
                  </Text>

                  <View style={styles.introStats}>
                    <Text style={styles.introStatsText}>
                      {questions.length} quick questions • Takes 2-3 minutes
                    </Text>
                  </View>

                  <View style={styles.introButtons}>
                    <Button
                      title="Let's Start"
                      onPress={() => setShowIntro(false)}
                      variant="primary"
                      style={styles.startButton}
                    />
                    <Button
                      title="Skip for Now"
                      onPress={handleSkip}
                      variant="outline"
                      style={styles.skipIntroButton}
                    />
                  </View>
                </View>
              </Animated.View>
            ) : (
              /* Question Header - Compact */
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.compactHeader}
              >
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowIntro(true)}
                  hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                >
                  <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                <View style={styles.compactProgress}>
                  <Text style={styles.compactProgressText}>
                    {currentQuestionIndex + 1} of {questions.length}
                  </Text>
                  <View style={styles.compactProgressTrack}>
                    <Animated.View style={[styles.compactProgressFill, progressBarStyle]} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleSkip}
                  hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                >
                  <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Current Question with Side Navigation */}
            {!showIntro && (
              <View style={styles.questionContainer}>
                {questions.length > 0 && questions[currentQuestionIndex] ? (
                  <View style={styles.questionWithNavigation}>
                    {/* Left Navigation Button */}
                    <View style={styles.navButtonContainer}>
                      <TouchableOpacity
                        style={[
                          styles.sideNavButton,
                          styles.leftNavButton,
                          currentQuestionIndex === 0 && styles.sideNavButtonDisabled
                        ]}
                        onPress={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="chevron-left"
                          size={20}
                          color={currentQuestionIndex === 0 ? "rgba(255,255,255,0.3)" : "#FFFFFF"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Question Card */}
                    <Animated.View
                      style={styles.questionCardContainer}
                      entering={SlideInUp.delay(300).duration(600)}
                      exiting={SlideOutDown.duration(300)}
                      key={`question-${currentQuestionIndex}`}
                    >
                      <Card variant="glass" style={styles.questionCard}>
                        <View style={styles.questionHeader}>
                          <View style={styles.questionNumberBadge}>
                            <Text style={styles.questionNumberText}>{currentQuestionIndex + 1}</Text>
                          </View>
                          <Text style={styles.questionText}>
                            {questions[currentQuestionIndex].question}
                          </Text>
                        </View>

                        <View style={styles.answerSection}>
                          <Text style={styles.answerLabel}>Your Answer:</Text>
                          <TextInput
                            style={styles.answerInput}
                            value={questions[currentQuestionIndex].answer || ''}
                            onChangeText={(text) => handleAnswerChange(currentQuestionIndex, text)}
                            placeholder="Share your thoughts here..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            autoFocus={false}
                          />
                        </View>
                      </Card>
                    </Animated.View>

                    {/* Right Navigation Button */}
                    <View style={styles.navButtonContainer}>
                      <TouchableOpacity
                        style={[
                          styles.sideNavButton,
                          styles.rightNavButton,
                          currentQuestionIndex === questions.length - 1 && styles.sideNavButtonDisabled
                        ]}
                        onPress={handleNextQuestion}
                        disabled={currentQuestionIndex === questions.length - 1}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="chevron-right"
                          size={20}
                          color={currentQuestionIndex === questions.length - 1 ? "rgba(255,255,255,0.3)" : "#FFFFFF"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading questions...</Text>
                  </View>
                )}
              </View>
            )}

            {/* Navigation Dots */}
            {!showIntro && (
              <View style={styles.navigationDots}>
                {questions.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dot,
                      index === currentQuestionIndex && styles.activeDot,
                      questions[index].answer.trim() && styles.answeredDot
                    ]}
                    onPress={() => setCurrentQuestionIndex(index)}
                  />
                ))}
              </View>
            )}

            {/* Bottom Action Buttons */}
            {!showIntro && (
              <Animated.View
                entering={FadeIn.delay(600)}
                style={styles.bottomActionContainer}
              >
                <Button
                  title="Skip"
                  onPress={handleSkip}
                  variant="outline"
                  style={styles.bottomSkipButton}
                />
                <Button
                  title={isSubmitting ? "Saving..." : "Save"}
                  onPress={handleSubmit}
                  variant="primary"
                  disabled={isSubmitting}
                  style={styles.bottomSubmitButton}
                />
              </Animated.View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  progressRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    overflow: 'hidden',
  },
  progressRingFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#667eea',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  completionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 10,
    minHeight: 300,
  },
  questionWithNavigation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    flex: 1,
    paddingTop: 20,
  },
  questionCardContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  questionCard: {
    flex: 1,
    marginBottom: 0,
  },
  navButtonContainer: {
    justifyContent: 'center',
    height: 200, // Matches typical question card height
  },
  // Side navigation buttons - more subtle and elegant
  sideNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  leftNavButton: {
    marginRight: 6,
  },
  rightNavButton: {
    marginLeft: 6,
  },
  sideNavButtonDisabled: {
    opacity: 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  questionHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  questionNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  questionNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  questionText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  answerSection: {
    gap: 12,
  },
  answerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  answerInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 80,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  navigationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    backgroundColor: '#667eea',
    transform: [{ scale: 1.2 }],
  },
  answeredDot: {
    backgroundColor: '#48BB78',
  },
  // Bottom action buttons
  bottomActionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    height: 48,
  },
  bottomSkipButton: {
    flex: 1,
  },
  bottomSubmitButton: {
    flex: 2,
  },
  // Old styles kept for compatibility
  actionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  finalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  // Intro screen styles
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  introContent: {
    alignItems: 'center',
    width: '100%',
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  introDescription: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  introStats: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 40,
  },
  introStatsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  introButtons: {
    width: '100%',
    gap: 12,
  },
  startButton: {
    paddingVertical: 16,
  },
  skipIntroButton: {
    paddingVertical: 12,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    borderRadius: 60,
  },
  pulseRing1: {
    width: 80,
    height: 80,
    opacity: 1,
  },
  pulseRing2: {
    width: 100,
    height: 100,
    opacity: 0.7,
  },
  pulseRing3: {
    width: 120,
    height: 120,
    opacity: 0.4,
  },
  // Compact header styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactProgress: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  compactProgressText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 8,
  },
  compactProgressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
});