export type PopoverPosition = 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'auto';

export interface GlassMaterial {
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'systemMaterial' | 'systemThinMaterial' | 'systemUltraThinMaterial';
  backgroundColor?: string;
  borderColor?: string;
  shadowOpacity?: number;
}

export interface DynamicContrastSettings {
  enabled?: boolean;
  sensitivity?: number; // 0-1, how sensitive to background changes
  minContrast?: number; // Minimum contrast ratio for accessibility
  adaptSpeed?: number; // Animation duration for tint changes (ms)
}

export interface RefractionSettings {
  enabled?: boolean;
  intensity?: number; // 0-1, strength of parallax effect
  layers?: number; // Number of refraction layers (1-3)
  motionSensitivity?: number; // 0-1, responsiveness to device motion
}

export interface SpecularHighlightSettings {
  enabled?: boolean;
  intensity?: number; // 0-1, brightness of highlights
  size?: number; // Size multiplier for highlight areas
  motionResponse?: boolean; // Respond to device motion
  interactionResponse?: boolean; // Respond to touch/press
  animationDuration?: number; // Duration of highlight animations (ms)
}

export interface BackgroundAnalysis {
  averageBrightness?: number; // 0-1, calculated background brightness
  contrastRatio?: number; // Current contrast ratio
  dominantColor?: string; // Hex color of dominant background
  hasComplexContent?: boolean; // Whether background has images/gradients
}

export interface EnhancedGlassMaterial extends GlassMaterial {
  // Dynamic contrast adaptation
  dynamicContrast?: DynamicContrastSettings;
  
  // Real-time refraction/parallax
  refraction?: RefractionSettings;
  
  // Enhanced specular highlights
  specularHighlights?: SpecularHighlightSettings;
  
  // Background content analysis
  backgroundAnalysis?: BackgroundAnalysis;
  
  // Performance settings
  performanceMode?: 'high' | 'balanced' | 'low';
  enableMotionEffects?: boolean;
  
  // Platform-specific optimizations
  iosOptimizations?: {
    useSystemMaterials?: boolean;
    metalPerformanceShaders?: boolean;
  };
  
  androidOptimizations?: {
    useRenderScript?: boolean;
    fallbackBlur?: boolean;
  };
}

export interface MotionData {
  x: number; // Device rotation on X axis
  y: number; // Device rotation on Y axis
  z: number; // Device rotation on Z axis
  timestamp: number; // When the motion was captured
}

export interface InteractionState {
  isPressed: boolean;
  pressLocation?: { x: number; y: number };
  pressIntensity?: number; // For 3D Touch/Force Touch
  gestureVelocity?: { x: number; y: number };
}

export interface GlassAnimationConfig {
  spring?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
  timing?: {
    duration?: number;
    easing?: string;
  };
}

export interface ButtonDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface PopoverDimensions {
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface PositionCalculation {
  x: number;
  y: number;
  position: PopoverPosition;
  originX: number;
  originY: number;
}

export interface GlassMenuButtonProps {
  // Display content
  text?: string;
  icon?: React.ReactNode;
  
  // Popover behavior
  popoverPosition?: PopoverPosition;
  popoverWidth?: number;
  popoverHeight?: number;
  isOpen?: boolean; // External state control
  
  // Content
  renderPopover: () => React.ReactNode;
  
  // Callbacks
  onOpenChange?: (open: boolean) => void;
  
  // Styling
  size?: number;
  maxWidth?: number;
  glassMaterial?: GlassMaterial;
  
  // Animation
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}

export interface GlassPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  buttonDimensions: ButtonDimensions;
  popoverDimensions: PopoverDimensions;
  position: PopoverPosition;
  children: React.ReactNode;
  glassMaterial?: GlassMaterial;
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}