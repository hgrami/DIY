/**
 * Themed Components with iOS 26 Liquid Glass
 * These components automatically use the global Liquid Glass theme configuration
 */

import React from 'react';
import { Button as BaseButton } from './Button';
import { Card as BaseCard } from './Card';
import { NativeModal as BaseNativeModal } from './NativeModal';
import { useGlassMaterial } from '../context/LiquidGlassThemeContext';

// Re-export component props for external use
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';
export type { NativeModalProps } from './NativeModal';

/**
 * Themed Button that automatically applies Liquid Glass settings
 */
export const ThemedButton: React.FC<React.ComponentProps<typeof BaseButton>> = (props) => {
  const glassMaterial = useGlassMaterial();
  
  return (
    <BaseButton
      {...glassMaterial.interactive}
      {...props}
    />
  );
};

/**
 * Themed Card that automatically applies Liquid Glass settings
 */
export const ThemedCard: React.FC<React.ComponentProps<typeof BaseCard>> = (props) => {
  const glassMaterial = useGlassMaterial();
  
  return (
    <BaseCard
      {...glassMaterial.surface}
      {...props}
    />
  );
};

/**
 * Themed Modal that automatically applies Liquid Glass settings
 */
export const ThemedModal: React.FC<React.ComponentProps<typeof BaseNativeModal>> = (props) => {
  const glassMaterial = useGlassMaterial();
  
  return (
    <BaseNativeModal
      {...glassMaterial.overlay}
      {...props}
    />
  );
};

/**
 * Quick access to themed components
 */
export const LiquidGlass = {
  Button: ThemedButton,
  Card: ThemedCard,
  Modal: ThemedModal,
};

/**
 * Default exports (can be used as drop-in replacements)
 */
export const Button = ThemedButton;
export const Card = ThemedCard;
export const Modal = ThemedModal;