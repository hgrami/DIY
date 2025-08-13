import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { ProjectInterviewModal } from './ProjectInterviewModal';
import { apiService } from '../services/api';

interface ProjectSetupModalProps {
  visible: boolean;
  projectId: string;
  projectShortId: string;
  onComplete: () => void;
}

export const ProjectSetupModal: React.FC<ProjectSetupModalProps> = ({
  visible,
  projectId,
  projectShortId,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'loading' | 'interview'>('loading');
  const [interviewData, setInterviewData] = useState<any>(null);
  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Start animations
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
      
      scaleValue.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );

      // Load interview questions
      loadInterviewQuestions();
    }
  }, [visible]);

  const loadInterviewQuestions = async () => {
    try {
      // Simulate minimum loading time for smooth UX
      const [response] = await Promise.all([
        apiService.get(`/api/projects/${projectShortId}/interview`),
        new Promise(resolve => setTimeout(resolve, 2000)) // Minimum 2 second loading
      ]);

      if (response.success && response.data) {
        const data = response.data as any;
        if (data.hasInterview) {
          // Project already has interview context, complete setup
          onComplete();
        } else {
          // Show interview modal
          setInterviewData(data.interviewData);
          setPhase('interview');
        }
      } else {
        console.error('Failed to load interview questions:', response);
        onComplete(); // Skip if API fails
      }
    } catch (error) {
      console.error('Load interview questions error:', error);
      onComplete(); // Skip if API fails
    }
  };

  const handleInterviewComplete = () => {
    onComplete();
  };

  const rotatingStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotateValue.value}deg` }
      ],
    };
  });

  const scalingStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scaleValue.value,
      [1, 1.2],
      [1, 1.1]
    );
    
    return {
      transform: [{ scale }],
    };
  });

  if (!visible) return null;

  return (
    <>
      {/* Loading Phase */}
      {phase === 'loading' && (
        <Modal
          visible={true}
          animationType="fade"
          presentationStyle="fullScreen"
        >
          <LinearGradient
            colors={['#1a1d3a', '#2d1b69', '#667eea']}
            style={styles.container}
          >
            <StatusBar barStyle="light-content" />
            
            <Animated.View 
              entering={FadeIn.duration(600)}
              style={styles.loadingContent}
            >
              {/* Animated Icon */}
              <Animated.View style={[styles.iconContainer, scalingStyle]}>
                <Animated.View style={[styles.iconInner, rotatingStyle]}>
                  <Feather name="settings" size={48} color="#667eea" />
                </Animated.View>
                
                {/* Pulsing rings */}
                <Animated.View style={[styles.pulseRing, styles.pulseRing1]} />
                <Animated.View style={[styles.pulseRing, styles.pulseRing2]} />
                <Animated.View style={[styles.pulseRing, styles.pulseRing3]} />
              </Animated.View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>Setting Up Your Project</Text>
                <Text style={styles.subtitle}>
                  We're preparing a personalized experience for you
                </Text>
                
                {/* Loading Steps */}
                <View style={styles.stepsContainer}>
                  <LoadingStep 
                    text="Analyzing project details" 
                    delay={0} 
                    duration={800}
                  />
                  <LoadingStep 
                    text="Preparing smart questions" 
                    delay={600} 
                    duration={800}
                  />
                  <LoadingStep 
                    text="Optimizing AI assistance" 
                    delay={1200} 
                    duration={800}
                  />
                </View>
              </View>
            </Animated.View>
          </LinearGradient>
        </Modal>
      )}

      {/* Interview Phase */}
      {phase === 'interview' && interviewData && (
        <ProjectInterviewModal
          visible={true}
          projectId={projectId}
          projectShortId={projectShortId}
          interviewData={interviewData}
          onComplete={handleInterviewComplete}
          onClose={handleInterviewComplete} // Allow skip
        />
      )}
    </>
  );
};

interface LoadingStepProps {
  text: string;
  delay: number;
  duration: number;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ text, delay, duration }) => {
  const opacityValue = useSharedValue(0);

  useEffect(() => {
    opacityValue.value = withSequence(
      withTiming(0, { duration: delay }),
      withTiming(1, { duration: duration }),
      withTiming(0.6, { duration: duration })
    );
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View style={[styles.stepContainer, animatedStyle]}>
      <View style={styles.stepDot} />
      <Text style={styles.stepText}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
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
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  stepsContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 280,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
});