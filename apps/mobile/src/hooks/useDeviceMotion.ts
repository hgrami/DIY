import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceMotion } from 'expo-sensors';
import { MotionData, InteractionState } from '../components/GlassUI/types';

interface UseDeviceMotionOptions {
  enabled?: boolean;
  updateInterval?: number; // ms between motion updates
  smoothingFactor?: number; // 0-1, higher = more smoothing
  motionThreshold?: number; // Minimum motion to register
  enableGyroscope?: boolean;
  enableAccelerometer?: boolean;
}

interface DeviceMotionResult {
  motionData: MotionData;
  isAvailable: boolean;
  isActive: boolean;
  error: string | null;
  startMotionTracking: () => Promise<void>;
  stopMotionTracking: () => void;
  getParallaxOffset: (intensity: number, bounds?: { x: number; y: number }) => { x: number; y: number };
  getSpecularPosition: (intensity: number) => { x: number; y: number };
  resetMotionData: () => void;
}

/**
 * Hook for tracking device motion and providing iOS 26 Liquid Glass motion effects
 * Implements real-time refraction and specular highlight positioning
 */
export const useDeviceMotion = (
  options: UseDeviceMotionOptions = {}
): DeviceMotionResult => {
  const {
    enabled = true,
    updateInterval = 16, // ~60fps
    smoothingFactor = 0.8,
    motionThreshold = 0.01,
    enableGyroscope = true,
    enableAccelerometer = true,
  } = options;

  const [motionData, setMotionData] = useState<MotionData>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: Date.now(),
  });

  const [isAvailable, setIsAvailable] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<any | null>(null);
  const lastMotionRef = useRef<MotionData>({ x: 0, y: 0, z: 0, timestamp: Date.now() });
  const motionHistoryRef = useRef<MotionData[]>([]);

  // Check if device motion is available
  const checkAvailability = useCallback(async () => {
    try {
      const available = await DeviceMotion.isAvailableAsync();
      setIsAvailable(available);
      
      if (!available) {
        setError('Device motion sensors not available');
        return false;
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check device motion availability';
      setError(errorMessage);
      setIsAvailable(false);
      return false;
    }
  }, []);

  // Smooth motion data using exponential moving average
  const smoothMotionData = useCallback((newData: MotionData): MotionData => {
    const lastData = lastMotionRef.current;
    
    // Apply smoothing
    const smoothedData: MotionData = {
      x: lastData.x * smoothingFactor + newData.x * (1 - smoothingFactor),
      y: lastData.y * smoothingFactor + newData.y * (1 - smoothingFactor),
      z: lastData.z * smoothingFactor + newData.z * (1 - smoothingFactor),
      timestamp: newData.timestamp,
    };

    // Only update if motion exceeds threshold
    const deltaX = Math.abs(smoothedData.x - lastData.x);
    const deltaY = Math.abs(smoothedData.y - lastData.y);
    const deltaZ = Math.abs(smoothedData.z - lastData.z);
    
    if (deltaX > motionThreshold || deltaY > motionThreshold || deltaZ > motionThreshold) {
      lastMotionRef.current = smoothedData;
      
      // Keep motion history for advanced calculations
      motionHistoryRef.current.push(smoothedData);
      if (motionHistoryRef.current.length > 10) {
        motionHistoryRef.current.shift();
      }
      
      return smoothedData;
    }

    return lastData;
  }, [smoothingFactor, motionThreshold]);

  // Start motion tracking
  const startMotionTracking = useCallback(async (): Promise<void> => {
    if (!enabled || isActive) return;

    const available = await checkAvailability();
    if (!available) return;

    try {
      // Set update interval
      DeviceMotion.setUpdateInterval(updateInterval);

      // Subscribe to motion updates
      subscriptionRef.current = DeviceMotion.addListener((motionEvent) => {
        if (!motionEvent) return;

        // Extract motion data based on available sensors
        let motionUpdate: MotionData = {
          x: 0,
          y: 0,
          z: 0,
          timestamp: Date.now(),
        };

        // Use rotation data if available (preferred for parallax)
        if (enableGyroscope && motionEvent.rotation) {
          motionUpdate.x = motionEvent.rotation.alpha || 0; // Z-axis rotation
          motionUpdate.y = motionEvent.rotation.beta || 0;  // X-axis rotation
          motionUpdate.z = motionEvent.rotation.gamma || 0; // Y-axis rotation
        }
        // Fallback to acceleration data
        else if (enableAccelerometer && motionEvent.acceleration) {
          // Convert acceleration to rotation-like values
          motionUpdate.x = (motionEvent.acceleration.x || 0) * 0.1;
          motionUpdate.y = (motionEvent.acceleration.y || 0) * 0.1;
          motionUpdate.z = (motionEvent.acceleration.z || 0) * 0.1;
        }

        // Apply smoothing and update state
        const smoothedData = smoothMotionData(motionUpdate);
        setMotionData(smoothedData);
      });

      setIsActive(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start motion tracking';
      setError(errorMessage);
      setIsActive(false);
    }
  }, [enabled, isActive, checkAvailability, updateInterval, enableGyroscope, enableAccelerometer, smoothMotionData]);

  // Stop motion tracking
  const stopMotionTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsActive(false);
  }, []);

  // Get parallax offset for refraction effects
  const getParallaxOffset = useCallback((
    intensity: number, 
    bounds: { x: number; y: number } = { x: 10, y: 10 }
  ): { x: number; y: number } => {
    if (!isActive || intensity === 0) {
      return { x: 0, y: 0 };
    }

    // Convert device rotation to parallax offset
    // Clamp values to prevent excessive movement
    const maxOffset = Math.min(bounds.x, bounds.y);
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, motionData.y * intensity * 10));
    const offsetY = Math.max(-maxOffset, Math.min(maxOffset, motionData.x * intensity * 10));

    return { x: offsetX, y: offsetY };
  }, [isActive, motionData]);

  // Get specular highlight position based on motion
  const getSpecularPosition = useCallback((intensity: number): { x: number; y: number } => {
    if (!isActive || intensity === 0) {
      return { x: 0.5, y: 0.5 }; // Center position when no motion
    }

    // Convert motion to highlight position (0-1 normalized)
    // Invert Y axis for natural lighting behavior
    const x = Math.max(0, Math.min(1, 0.5 + (motionData.y * intensity * 0.5)));
    const y = Math.max(0, Math.min(1, 0.5 - (motionData.x * intensity * 0.5)));

    return { x, y };
  }, [isActive, motionData]);

  // Reset motion data
  const resetMotionData = useCallback(() => {
    const resetData: MotionData = { x: 0, y: 0, z: 0, timestamp: Date.now() };
    setMotionData(resetData);
    lastMotionRef.current = resetData;
    motionHistoryRef.current = [];
  }, []);

  // Auto-start motion tracking when enabled (with debouncing)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (enabled && isAvailable && !isActive) {
      // Debounce startup to prevent rapid toggles
      timeoutId = setTimeout(() => {
        startMotionTracking();
      }, 100);
    } else if (!enabled && isActive) {
      stopMotionTracking();
    }

    return () => {
      clearTimeout(timeoutId);
      stopMotionTracking();
    };
  }, [enabled, isAvailable, isActive]); // Include isActive but debounce changes

  // Check availability on mount only
  useEffect(() => {
    checkAvailability();
  }, []); // No dependencies to prevent re-checks

  return {
    motionData,
    isAvailable,
    isActive,
    error,
    startMotionTracking,
    stopMotionTracking,
    getParallaxOffset,
    getSpecularPosition,
    resetMotionData,
  };
};