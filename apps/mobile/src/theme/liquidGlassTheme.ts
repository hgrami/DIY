import { Platform } from 'react-native';
import { EnhancedGlassMaterial as EnhancedGlassMaterialType } from '../components/GlassUI/types';

/**
 * iOS 26 Liquid Glass Theme Configuration
 * Provides consistent glass material configurations across the entire app
 */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type PerformanceMode = 'high' | 'balanced' | 'low';

interface LiquidGlassThemeConfig {
  performanceMode: PerformanceMode;
  themeMode: ThemeMode;
  motionEnabled: boolean;
  accessibilityReducedMotion: boolean;
}

// Default theme configuration
export const defaultThemeConfig: LiquidGlassThemeConfig = {
  performanceMode: 'balanced',
  themeMode: 'auto',
  motionEnabled: true,
  accessibilityReducedMotion: false,
};

// Global theme state (in a real app, this would be managed by Context/Redux)
let globalThemeConfig: LiquidGlassThemeConfig = { ...defaultThemeConfig };

export const updateThemeConfig = (config: Partial<LiquidGlassThemeConfig>) => {
  globalThemeConfig = { ...globalThemeConfig, ...config };
};

export const getThemeConfig = (): LiquidGlassThemeConfig => globalThemeConfig;

/**
 * Base glass material configurations for different component types
 */
export const liquidGlassPresets = {
  // Primary interactive elements (buttons, controls)
  interactive: (config = globalThemeConfig): EnhancedGlassMaterialType => ({
    blurIntensity: config.performanceMode === 'high' ? 25 : config.performanceMode === 'balanced' ? 20 : 15,
    tint: 'systemUltraThinMaterial' as const,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderColor: 'rgba(102, 126, 234, 0.4)',
    shadowOpacity: 0.25,
    
    dynamicContrast: {
      enabled: true,
      sensitivity: 0.7,
      minContrast: 4.5,
      adaptSpeed: 300,
    },
    
    refraction: {
      enabled: config.motionEnabled && !config.accessibilityReducedMotion,
      intensity: 0.3,
      layers: 2,
      motionSensitivity: 0.6,
    },
    
    specularHighlights: {
      enabled: true,
      intensity: 0.4,
      size: 1.0,
      motionResponse: config.motionEnabled && !config.accessibilityReducedMotion,
      interactionResponse: true,
      animationDuration: 200,
    },
    
    performanceMode: config.performanceMode,
    enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: config.performanceMode === 'high',
    },
    
    androidOptimizations: {
      useRenderScript: config.performanceMode === 'high',
      fallbackBlur: config.performanceMode === 'low',
    },
  }),

  // Content cards and containers
  surface: (config = globalThemeConfig): EnhancedGlassMaterialType => ({
    blurIntensity: config.performanceMode === 'high' ? 22 : config.performanceMode === 'balanced' ? 18 : 14,
    tint: 'systemUltraThinMaterial' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowOpacity: 0.15,
    
    dynamicContrast: {
      enabled: true,
      sensitivity: 0.6,
      minContrast: 3.5,
      adaptSpeed: 400,
    },
    
    refraction: {
      enabled: config.motionEnabled && !config.accessibilityReducedMotion,
      intensity: 0.2,
      layers: 2,
      motionSensitivity: 0.4,
    },
    
    specularHighlights: {
      enabled: true,
      intensity: 0.2,
      size: 1.2,
      motionResponse: config.motionEnabled && !config.accessibilityReducedMotion,
      interactionResponse: false,
      animationDuration: 300,
    },
    
    performanceMode: config.performanceMode,
    enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: config.performanceMode === 'high',
    },
    
    androidOptimizations: {
      useRenderScript: config.performanceMode === 'high',
      fallbackBlur: config.performanceMode === 'low',
    },
  }),

  // Modals and overlays
  overlay: (config = globalThemeConfig): EnhancedGlassMaterialType => ({
    blurIntensity: Platform.OS === 'ios' ? 35 : 25,
    tint: 'systemUltraThinMaterial' as const,
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0.4,
    
    dynamicContrast: {
      enabled: true,
      sensitivity: 0.5,
      minContrast: 3.0,
      adaptSpeed: 500,
    },
    
    refraction: {
      enabled: config.motionEnabled && !config.accessibilityReducedMotion,
      intensity: 0.15,
      layers: 2,
      motionSensitivity: 0.3,
    },
    
    specularHighlights: {
      enabled: true,
      intensity: 0.15,
      size: 1.5,
      motionResponse: config.motionEnabled && !config.accessibilityReducedMotion,
      interactionResponse: false,
      animationDuration: 400,
    },
    
    performanceMode: config.performanceMode,
    enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: config.performanceMode === 'high',
    },
    
    androidOptimizations: {
      useRenderScript: config.performanceMode === 'high',
      fallbackBlur: config.performanceMode === 'low',
    },
  }),

  // Navigation and system UI
  navigation: (config = globalThemeConfig): EnhancedGlassMaterialType => ({
    blurIntensity: 15,
    tint: 'systemUltraThinMaterial' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowOpacity: 0.1,
    
    dynamicContrast: {
      enabled: true,
      sensitivity: 0.5,
      minContrast: 3.0,
      adaptSpeed: 300,
    },
    
    refraction: {
      enabled: config.motionEnabled && !config.accessibilityReducedMotion,
      intensity: 0.1,
      layers: 1,
      motionSensitivity: 0.3,
    },
    
    specularHighlights: {
      enabled: false, // Disabled for subtle navigation
      intensity: 0,
      size: 0,
      motionResponse: false,
      interactionResponse: false,
      animationDuration: 0,
    },
    
    performanceMode: config.performanceMode,
    enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: false,
    },
    
    androidOptimizations: {
      useRenderScript: false,
      fallbackBlur: true,
    },
  }),

  // Floating action buttons and accent elements
  accent: (config = globalThemeConfig): EnhancedGlassMaterialType => ({
    blurIntensity: 25,
    tint: 'systemUltraThinMaterial' as const,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: 'rgba(102, 126, 234, 0.4)',
    shadowOpacity: 0.3,
    
    dynamicContrast: {
      enabled: true,
      sensitivity: 0.8,
      minContrast: 4.5,
      adaptSpeed: 200,
    },
    
    refraction: {
      enabled: config.motionEnabled && !config.accessibilityReducedMotion,
      intensity: 0.4,
      layers: 2,
      motionSensitivity: 0.7,
    },
    
    specularHighlights: {
      enabled: true,
      intensity: 0.5,
      size: 1.0,
      motionResponse: config.motionEnabled && !config.accessibilityReducedMotion,
      interactionResponse: true,
      animationDuration: 150,
    },
    
    performanceMode: config.performanceMode,
    enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
    
    iosOptimizations: {
      useSystemMaterials: true,
      metalPerformanceShaders: config.performanceMode === 'high',
    },
    
    androidOptimizations: {
      useRenderScript: config.performanceMode === 'high',
      fallbackBlur: config.performanceMode === 'low',
    },
  }),
};

/**
 * Utility functions for common glass configurations
 */
export const createGlassMaterial = (
  preset: keyof typeof liquidGlassPresets,
  overrides?: Partial<EnhancedGlassMaterialType>
): EnhancedGlassMaterialType => {
  const baseConfig = liquidGlassPresets[preset]();
  return { ...baseConfig, ...overrides };
};

/**
 * Component-specific convenience functions
 */
export const glassTheme = {
  button: {
    primary: () => createGlassMaterial('interactive', {
      backgroundColor: 'rgba(102, 126, 234, 0.15)',
      borderColor: 'rgba(102, 126, 234, 0.4)',
    }),
    secondary: () => createGlassMaterial('interactive', {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
    }),
    outline: () => createGlassMaterial('interactive', {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      tint: 'systemUltraThinMaterial' as const,
    }),
  },
  
  card: {
    default: () => createGlassMaterial('surface'),
    elevated: () => createGlassMaterial('surface', {
      blurIntensity: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      shadowOpacity: 0.2,
    }),
    glass: () => createGlassMaterial('surface', {
      blurIntensity: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      shadowOpacity: 0.12,
    }),
    highlighted: () => createGlassMaterial('surface', {
      backgroundColor: 'rgba(102, 126, 234, 0.18)',
      borderColor: 'rgba(102, 126, 234, 0.4)',
      shadowOpacity: 0.18,
    }),
  },
  
  modal: () => createGlassMaterial('overlay'),
  navigation: () => createGlassMaterial('navigation'),
  fab: () => createGlassMaterial('accent'),
};

/**
 * Initialize theme with accessibility and performance settings
 */
export const initializeLiquidGlassTheme = async () => {
  // In a real implementation, you would:
  // 1. Check AccessibilityInfo.isReduceMotionEnabled()
  // 2. Detect device performance capabilities
  // 3. Load user preferences from storage
  // 4. Update globalThemeConfig accordingly
  
  try {
    // Example: Check for reduced motion
    // const isReducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
    // updateThemeConfig({ accessibilityReducedMotion: isReducedMotion });
    
    console.log('Liquid Glass theme initialized with iOS 26 features');
  } catch (error) {
    console.warn('Failed to initialize theme:', error);
  }
};