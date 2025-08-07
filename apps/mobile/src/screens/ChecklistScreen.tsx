import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Checklist } from '../components/Checklist/Checklist';
import { ChecklistDensity } from '../types/checklist';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  checklistName: string;
  type?: 'local' | 'api';
}

export const ChecklistScreen: React.FC<Props> = ({ 
  checklistName, 
  type = 'local' 
}) => {
  const [density, setDensity] = useState<ChecklistDensity>('normal');

  // Load density preference
  useEffect(() => {
    const loadDensityPreference = async () => {
      try {
        const savedDensity = await AsyncStorage.getItem(`checklist-density-${checklistName}`);
        if (savedDensity && ['compact', 'normal', 'comfortable'].includes(savedDensity)) {
          setDensity(savedDensity as ChecklistDensity);
        }
      } catch (error) {
        console.error('Failed to load density preference:', error);
      }
    };

    loadDensityPreference();
  }, [checklistName]);

  const handleDensityChange = async (newDensity: ChecklistDensity) => {
    try {
      await AsyncStorage.setItem(`checklist-density-${checklistName}`, newDensity);
      setDensity(newDensity);
    } catch (error) {
      console.error('Failed to save density preference:', error);
      // Still update local state even if save fails
      setDensity(newDensity);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <Checklist
          checklistName={checklistName}
          type={type}
          showHeader={true}
          showDensityPicker={true}
          density={density}
          onDensityChange={handleDensityChange}
          useFloatingButton={true}
          enableSearch={true}
          enableFiltering={true}
          enableSorting={true}
          enableBulkActions={true}
          enableStats={true}
          enableSwipeActions={true}
        />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});