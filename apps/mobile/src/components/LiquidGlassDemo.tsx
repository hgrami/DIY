import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { EnhancedButton } from './EnhancedButton';
import { GlassButton } from './GlassButton';
import { 
  EnhancedGlassMaterial, 
  SpecularHighlight, 
  ParallaxGlassLayer
} from './GlassUI';
import { 
  EnhancedGlassMaterial as EnhancedGlassMaterialType 
} from './GlassUI/types';

interface DemoSettings {
  dynamicContrast: boolean;
  motionEffects: boolean;
  specularHighlights: boolean;
  performanceMode: 'high' | 'balanced' | 'low';
}

/**
 * Demo component showcasing iOS 26 Liquid Glass enhancements
 * Compare original vs enhanced glass components
 */
export const LiquidGlassDemo: React.FC = () => {
  const [settings, setSettings] = useState<DemoSettings>({
    dynamicContrast: true,
    motionEffects: true,
    specularHighlights: true,
    performanceMode: 'balanced',
  });

  const updateSetting = <K extends keyof DemoSettings>(
    key: K,
    value: DemoSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Demo glass material for cards
  const demoGlassMaterial: EnhancedGlassMaterialType = {
    blurIntensity: 25,
    tint: 'systemUltraThinMaterial',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0.3,
    
    dynamicContrast: {
      enabled: settings.dynamicContrast,
      sensitivity: 0.8,
      minContrast: 4.5,
      adaptSpeed: 250,
    },
    
    refraction: {
      enabled: settings.motionEffects,
      intensity: 0.6,
      layers: 3,
      motionSensitivity: 0.8,
    },
    
    specularHighlights: {
      enabled: settings.specularHighlights,
      intensity: 0.5,
      size: 1.2,
      motionResponse: settings.motionEffects,
      interactionResponse: true,
      animationDuration: 300,
    },
    
    performanceMode: settings.performanceMode,
    enableMotionEffects: settings.motionEffects,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: settings.performanceMode === 'high',
    },
    
    androidOptimizations: {
      useRenderScript: settings.performanceMode === 'high',
      fallbackBlur: settings.performanceMode === 'low',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>iOS 26 Liquid Glass Demo</Text>
          <Text style={styles.subtitle}>
            Experience dynamic contrast, real-time refraction, and specular highlights
          </Text>
        </View>

        {/* Settings Panel */}
        <View style={styles.settingsPanel}>
          <EnhancedGlassMaterial
            material={{
              ...demoGlassMaterial,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              blurIntensity: 15,
            }}
            borderRadius={16}
          >
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Liquid Glass Settings</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Dynamic Contrast</Text>
                <Switch
                  value={settings.dynamicContrast}
                  onValueChange={(value) => updateSetting('dynamicContrast', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Motion Effects</Text>
                <Switch
                  value={settings.motionEffects}
                  onValueChange={(value) => updateSetting('motionEffects', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Specular Highlights</Text>
                <Switch
                  value={settings.specularHighlights}
                  onValueChange={(value) => updateSetting('specularHighlights', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </EnhancedGlassMaterial>
        </View>

        {/* Button Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Buttons</Text>
          
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Original</Text>
              <GlassButton
                onPress={() => console.log('Original button pressed')}
                icon="star"
                variant="opacity"
                size={48}
              />
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>iOS 26 Enhanced</Text>
              <EnhancedButton
                title="Enhanced"
                onPress={() => console.log('Enhanced button pressed')}
                variant="primary"
                size="medium"
                enableDynamicContrast={settings.dynamicContrast}
                enableMotionEffects={settings.motionEffects}
                enableSpecularHighlights={settings.specularHighlights}
                performanceMode={settings.performanceMode}
              />
            </View>
          </View>
        </View>

        {/* Glass Card with All Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactive Glass Card</Text>
          
          <View style={styles.glassCard}>
            <EnhancedGlassMaterial
              material={demoGlassMaterial}
              borderRadius={20}
            >
              {settings.specularHighlights && (
                <SpecularHighlight
                  settings={demoGlassMaterial.specularHighlights!}
                  borderRadius={20}
                  width={300}
                  height={200}
                />
              )}
              
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Liquid Glass Material</Text>
                <Text style={styles.cardDescription}>
                  This card demonstrates all iOS 26 Liquid Glass features:
                  {'\n'}• Dynamic contrast adaptation
                  {'\n'}• Real-time refraction with device motion
                  {'\n'}• Interactive specular highlights
                  {'\n'}• Multi-layer depth simulation
                </Text>
                
                <View style={styles.cardActions}>
                  <EnhancedButton
                    title="Interact"
                    onPress={() => console.log('Card action')}
                    variant="secondary"
                    size="small"
                    enableDynamicContrast={settings.dynamicContrast}
                    enableMotionEffects={settings.motionEffects}
                    enableSpecularHighlights={settings.specularHighlights}
                    performanceMode={settings.performanceMode}
                  />
                </View>
              </View>
            </EnhancedGlassMaterial>
          </View>
        </View>

        {/* Performance Mode Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Mode</Text>
          
          <View style={styles.performanceModes}>
            {(['high', 'balanced', 'low'] as const).map((mode) => (
              <EnhancedButton
                key={mode}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                onPress={() => updateSetting('performanceMode', mode)}
                variant={settings.performanceMode === mode ? 'primary' : 'outline'}
                size="small"
                enableDynamicContrast={settings.dynamicContrast}
                enableMotionEffects={settings.motionEffects}
                enableSpecularHighlights={settings.specularHighlights}
                performanceMode={settings.performanceMode}
                style={styles.performanceButton}
              />
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <EnhancedGlassMaterial
            material={{
              ...demoGlassMaterial,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              blurIntensity: 12,
            }}
            borderRadius={16}
          >
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionsTitle}>How to Experience Liquid Glass</Text>
              <Text style={styles.instructionsText}>
                • Tilt your device to see real-time refraction effects
                {'\n'}• Press and hold buttons to see interaction highlights
                {'\n'}• Change background content to see dynamic contrast adaptation
                {'\n'}• Toggle settings to compare features
                {'\n'}• Performance mode affects quality vs. battery life
              </Text>
            </View>
          </EnhancedGlassMaterial>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsPanel: {
    marginBottom: 30,
  },
  settingsContent: {
    padding: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 12,
  },
  glassCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardActions: {
    alignItems: 'flex-start',
  },
  performanceModes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  instructions: {
    marginTop: 20,
  },
  instructionsContent: {
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});