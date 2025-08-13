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
  tint?: 'light' | 'dark' | 'systemMaterial' | 'systemThinMaterial';
  backgroundColor?: string;
  borderColor?: string;
  shadowOpacity?: number;
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