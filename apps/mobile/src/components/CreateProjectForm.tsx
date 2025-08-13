import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from './Button';
import { ProjectsService } from '../services/projectsService';
import { CreateProjectRequest, ProjectConfig, AuthUser } from '../@types';

interface CreateProjectFormProps {
  user: AuthUser | null;
  onSuccess: (shortId: string, project: any) => void;
  onCancel: () => void;
  formData?: {
    title: string;
    goal: string;
    description: string;
    deadline: string;
  };
  setFormData?: (data: { title: string; goal: string; description: string; deadline: string } | ((prev: { title: string; goal: string; description: string; deadline: string }) => { title: string; goal: string; description: string; deadline: string })) => void;
}

export interface CreateProjectFormRef {
  focus: () => void;
}

export const CreateProjectForm = forwardRef<CreateProjectFormRef, CreateProjectFormProps>(({
  user,
  onSuccess,
  onCancel,
  formData: externalFormData,
  setFormData: externalSetFormData,
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [internalFormData, setInternalFormData] = useState({
    title: '',
    goal: '',
    description: '',
    deadline: '',
  });

  // Use external form data if provided, otherwise use internal state
  const formData = externalFormData || internalFormData;
  const setFormData = externalSetFormData || setInternalFormData;

  const titleInputRef = useRef<TextInput>(null);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      titleInputRef.current?.focus();
    }
  }));

  const isFreeUser = !user?.subscriptionStatus || user?.subscriptionStatus === 'FREE';

  const [config, setConfig] = useState<ProjectConfig>({
    aiEnabled: !isFreeUser, // AI disabled for free users by default
    showInspiration: true,
    showMaterials: true,
    showChecklist: true,
    showNotes: true,
    showPhotos: true,
  });


  const renderConfigToggle = (
    key: keyof ProjectConfig,
    label: string,
    description: string,
    icon: string,
    isPremium = false
  ) => {
    const isDisabled = isPremium && isFreeUser;

    return (
      <View style={styles.configItem}>
        <View style={styles.configHeader}>
          <Feather name={icon as any} size={18} color={isDisabled ? "#666" : "#FFFFFF"} />
          <View style={styles.configText}>
            <View style={styles.configLabelRow}>
              <Text style={[styles.configLabel, isDisabled && styles.disabledText]}>
                {label}
              </Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.configDescription, isDisabled && styles.disabledText]}>
              {description}
              {isPremium && isFreeUser && ' (Premium feature)'}
            </Text>
          </View>
          <Switch
            value={config[key]}
            onValueChange={isDisabled ? undefined : (value) => setConfig(prev => ({ ...prev, [key]: value }))}
            trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#667eea' }}
            thumbColor={config[key] ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'}
            disabled={isDisabled}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Project Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Project Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            ref={titleInputRef}
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="Enter project title..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            maxLength={100}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Goal</Text>
          <TextInput
            style={styles.input}
            value={formData.goal}
            onChangeText={(text) => setFormData(prev => ({ ...prev, goal: text }))}
            placeholder="What do you want to achieve?"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            maxLength={200}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your project in detail..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deadline (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.deadline}
            onChangeText={(text) => setFormData(prev => ({ ...prev, deadline: text }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
          />
          <Text style={styles.inputHint}>
            Enter date in YYYY-MM-DD format
          </Text>
        </View>
      </View>

      {/* Project Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Features</Text>
        <Text style={styles.sectionSubtitle}>
          Choose which features to enable for this project
        </Text>

        {renderConfigToggle(
          'aiEnabled',
          'AI Assistant',
          'Get AI help with planning and guidance',
          'message-circle',
          true // This is a premium feature
        )}

        {renderConfigToggle(
          'showInspiration',
          'Inspiration Board',
          'Collect and organize inspiration links',
          'heart'
        )}

        {renderConfigToggle(
          'showMaterials',
          'Materials & Tools',
          'Track supplies and equipment needed',
          'package'
        )}

        {renderConfigToggle(
          'showChecklist',
          'Task Checklist',
          'Break down project into actionable steps',
          'check-square'
        )}

        {renderConfigToggle(
          'showNotes',
          'Project Notes',
          'Keep track of ideas and observations',
          'file-text'
        )}

        {renderConfigToggle(
          'showPhotos',
          'Photo Gallery',
          'Document before, during, and after photos',
          'image'
        )}
      </View>

    </View>
  );
});

interface CreateProjectButtonsProps {
  loading: boolean;
  canCreate: boolean;
  onCancel: () => void;
  onCreate: () => void;
}

export const CreateProjectButtons: React.FC<CreateProjectButtonsProps> = ({
  loading,
  canCreate,
  onCancel,
  onCreate,
}) => {
  return (
    <View style={styles.createProjectButtons}>
      <TouchableOpacity
        style={[styles.bottomSheetButton, styles.cancelButton]}
        onPress={onCancel}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.bottomSheetButton, styles.createButton]}
        onPress={onCreate}
        disabled={loading || !canCreate}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>Create Project</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20, // Reduced padding since we now have height constraint
  },
  section: {
    marginBottom: 24, // Reduced spacing since we have height constraint
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16, // Reduced spacing since we have height constraint
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textArea: {
    height: 80, // Reduced height since we have height constraint
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  configItem: {
    marginBottom: 16,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configText: {
    flex: 1,
    marginLeft: 12,
  },
  configLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  configDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
  },
  createProjectButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  bottomSheetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  createButton: {
    backgroundColor: '#6366F1',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});