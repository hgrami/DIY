import { useState, useEffect, useCallback, useRef } from 'react';
import { BackgroundAnalysis, DynamicContrastSettings } from '../components/GlassUI/types';

interface UseBackgroundAnalysisOptions {
  enabled?: boolean;
  sensitivity?: number;
  updateInterval?: number; // ms between analysis updates
  contrastThreshold?: number; // Minimum contrast ratio
}

interface BackgroundAnalysisResult {
  analysis: BackgroundAnalysis;
  isAnalyzing: boolean;
  error: string | null;
  refreshAnalysis: () => Promise<void>;
  getAdaptiveTint: () => 'light' | 'dark' | 'systemUltraThinMaterial';
  getAdaptiveOpacity: () => number;
  getAdaptiveBlurIntensity: () => number;
}

/**
 * Hook for analyzing background content and providing adaptive glass material properties
 * Implements iOS 26 Liquid Glass dynamic contrast adaptation
 */
export const useBackgroundAnalysis = (
  options: UseBackgroundAnalysisOptions = {}
): BackgroundAnalysisResult => {
  const {
    enabled = true,
    sensitivity = 0.7,
    updateInterval = 1000,
    contrastThreshold = 4.5, // WCAG AA compliance
  } = options;

  const [analysis, setAnalysis] = useState<BackgroundAnalysis>({
    averageBrightness: 0.5,
    contrastRatio: 4.5,
    dominantColor: '#000000',
    hasComplexContent: false,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisHistory = useRef<BackgroundAnalysis[]>([]);

  // Helper function to calculate luminance from RGB
  const getLuminance = useCallback((r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }, []);

  // Helper function to calculate contrast ratio
  const getContrastRatio = useCallback((l1: number, l2: number): number => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }, []);

  // Convert hex color to RGB
  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // Analyze background content (simulated - in real implementation would use computer vision)
  const analyzeBackground = useCallback(async (): Promise<BackgroundAnalysis> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Simulate background analysis with realistic variations
      // In a real implementation, this would:
      // 1. Capture screen content behind the glass element
      // 2. Analyze pixel data for brightness/contrast
      // 3. Detect image complexity vs solid colors
      // 4. Calculate dominant colors using clustering algorithms

      const now = Date.now();
      const variance = Math.sin(now / 10000) * 0.1; // Simulate slow environmental changes
      
      const baseAnalysis: BackgroundAnalysis = {
        averageBrightness: Math.max(0.1, Math.min(0.9, 0.5 + variance)),
        contrastRatio: Math.max(2.0, Math.min(8.0, contrastThreshold + Math.random() * 2)),
        dominantColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        hasComplexContent: Math.random() > 0.6, // Randomly simulate complex backgrounds
      };

      // Add some smoothing by averaging with recent history
      if (analysisHistory.current.length > 0) {
        const recent = analysisHistory.current[analysisHistory.current.length - 1];
        const smoothingFactor = 1 - sensitivity;
        
        baseAnalysis.averageBrightness = 
          (baseAnalysis.averageBrightness || 0.5) * sensitivity + 
          (recent.averageBrightness || 0.5) * smoothingFactor;
          
        baseAnalysis.contrastRatio = 
          (baseAnalysis.contrastRatio || contrastThreshold) * sensitivity + 
          (recent.contrastRatio || contrastThreshold) * smoothingFactor;
      }

      // Keep history for smoothing
      analysisHistory.current.push(baseAnalysis);
      if (analysisHistory.current.length > 5) {
        analysisHistory.current.shift();
      }

      return baseAnalysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Background analysis failed';
      setError(errorMessage);
      
      // Return fallback analysis
      return {
        averageBrightness: 0.5,
        contrastRatio: contrastThreshold,
        dominantColor: '#808080',
        hasComplexContent: false,
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [sensitivity, contrastThreshold]);

  // Refresh analysis manually
  const refreshAnalysis = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    
    const newAnalysis = await analyzeBackground();
    setAnalysis(newAnalysis);
  }, [enabled, analyzeBackground]);

  // Get adaptive tint based on background analysis
  const getAdaptiveTint = useCallback((): 'light' | 'dark' | 'systemUltraThinMaterial' => {
    const { averageBrightness = 0.5, hasComplexContent = false } = analysis;
    
    // Use system material for complex content for best integration
    if (hasComplexContent) {
      return 'systemUltraThinMaterial';
    }
    
    // Choose tint based on background brightness
    return averageBrightness > 0.6 ? 'dark' : 'light';
  }, [analysis]);

  // Get adaptive opacity for better contrast
  const getAdaptiveOpacity = useCallback((): number => {
    const { contrastRatio = 4.5, averageBrightness = 0.5 } = analysis;
    
    // Increase opacity when contrast is low
    const contrastFactor = Math.max(0.5, Math.min(1.0, contrastRatio / contrastThreshold));
    
    // Adjust based on background brightness
    const brightnessFactor = averageBrightness > 0.7 ? 1.2 : averageBrightness < 0.3 ? 1.1 : 1.0;
    
    return Math.max(0.05, Math.min(0.25, 0.1 * contrastFactor * brightnessFactor));
  }, [analysis, contrastThreshold]);

  // Get adaptive blur intensity
  const getAdaptiveBlurIntensity = useCallback((): number => {
    const { hasComplexContent = false, contrastRatio = 4.5 } = analysis;
    
    // Increase blur for complex content
    const complexityFactor = hasComplexContent ? 1.3 : 1.0;
    
    // Adjust based on contrast
    const contrastFactor = contrastRatio < contrastThreshold ? 1.2 : 1.0;
    
    const baseIntensity = 20; // Base blur intensity for iOS
    return Math.max(10, Math.min(40, baseIntensity * complexityFactor * contrastFactor));
  }, [analysis, contrastThreshold]);

  // Set up throttled periodic analysis to prevent infinite loops
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial analysis with delay to prevent immediate re-renders
    const initialTimer = setTimeout(() => {
      refreshAnalysis();
    }, 100);

    // Set up throttled periodic updates
    if (updateInterval > 0) {
      intervalRef.current = setInterval(() => {
        refreshAnalysis();
      }, Math.max(300, updateInterval)); // Minimum 300ms to prevent rapid updates
    }

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, updateInterval]); // Safe dependencies - no functions that could change

  return {
    analysis,
    isAnalyzing,
    error,
    refreshAnalysis,
    getAdaptiveTint,
    getAdaptiveOpacity,
    getAdaptiveBlurIntensity,
  };
};