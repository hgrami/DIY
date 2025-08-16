import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  LiquidGlassThemeConfig,
  defaultThemeConfig,
  updateThemeConfig,
  getThemeConfig,
  initializeLiquidGlassTheme,
  PerformanceMode,
  ThemeMode,
} from '../theme/liquidGlassTheme';

interface LiquidGlassThemeContextType {
  config: LiquidGlassThemeConfig;
  updateConfig: (updates: Partial<LiquidGlassThemeConfig>) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleMotion: () => void;
  isInitialized: boolean;
}

const LiquidGlassThemeContext = createContext<LiquidGlassThemeContextType | undefined>(undefined);

interface LiquidGlassThemeProviderProps {
  children: ReactNode;
}

export const LiquidGlassThemeProvider: React.FC<LiquidGlassThemeProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<LiquidGlassThemeConfig>(defaultThemeConfig);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check accessibility settings
        const isReducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
        
        const initialConfig = {
          ...defaultThemeConfig,
          accessibilityReducedMotion: isReducedMotion,
          motionEnabled: !isReducedMotion, // Respect accessibility preferences
        };

        setConfig(initialConfig);
        updateThemeConfig(initialConfig);
        
        // Initialize the theme system
        await initializeLiquidGlassTheme();
        setIsInitialized(true);
      } catch (error) {
        console.warn('Failed to initialize Liquid Glass theme:', error);
        setIsInitialized(true); // Still mark as initialized to prevent hanging
      }
    };

    initialize();

    // Listen for accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReducedMotion) => {
        updateConfig({
          accessibilityReducedMotion: isReducedMotion,
          motionEnabled: !isReducedMotion,
        });
      }
    );

    return () => subscription?.remove();
  }, []);

  const updateConfig = (updates: Partial<LiquidGlassThemeConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateThemeConfig(newConfig);
  };

  const setPerformanceMode = (mode: PerformanceMode) => {
    updateConfig({ performanceMode: mode });
  };

  const setThemeMode = (mode: ThemeMode) => {
    updateConfig({ themeMode: mode });
  };

  const toggleMotion = () => {
    // Only allow toggling if not restricted by accessibility
    if (!config.accessibilityReducedMotion) {
      updateConfig({ motionEnabled: !config.motionEnabled });
    }
  };

  const contextValue: LiquidGlassThemeContextType = {
    config,
    updateConfig,
    setPerformanceMode,
    setThemeMode,
    toggleMotion,
    isInitialized,
  };

  return (
    <LiquidGlassThemeContext.Provider value={contextValue}>
      {children}
    </LiquidGlassThemeContext.Provider>
  );
};

export const useLiquidGlassTheme = (): LiquidGlassThemeContextType => {
  const context = useContext(LiquidGlassThemeContext);
  if (context === undefined) {
    throw new Error('useLiquidGlassTheme must be used within a LiquidGlassThemeProvider');
  }
  return context;
};

/**
 * Hook for getting themed glass material configurations
 */
export const useGlassMaterial = () => {
  const { config } = useLiquidGlassTheme();
  
  return {
    // Common configurations that respect current theme settings
    interactive: {
      enableDynamicContrast: true,
      enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
      enableSpecularHighlights: true,
      performanceMode: config.performanceMode,
    },
    
    surface: {
      enableDynamicContrast: true,
      enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
      enableSpecularHighlights: true,
      performanceMode: config.performanceMode,
    },
    
    overlay: {
      enableDynamicContrast: true,
      enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
      enableSpecularHighlights: true,
      performanceMode: config.performanceMode,
    },
    
    navigation: {
      enableDynamicContrast: true,
      enableMotionEffects: config.motionEnabled && !config.accessibilityReducedMotion,
      enableSpecularHighlights: false, // Navigation is typically subtle
      performanceMode: config.performanceMode,
    },
  };
};

export default LiquidGlassThemeContext;