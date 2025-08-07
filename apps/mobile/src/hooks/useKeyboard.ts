import { useEffect, useState } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface KeyboardInfo {
  keyboardHeight: number;
  keyboardShown: boolean;
  screenHeight: number;
  availableHeight: number;
}

export const useKeyboard = () => {
  const [keyboard, setKeyboard] = useState<KeyboardInfo>({
    keyboardHeight: 0,
    keyboardShown: false,
    screenHeight: Dimensions.get('window').height,
    availableHeight: Dimensions.get('window').height,
  });
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const updateScreenDimensions = () => {
      const { height } = Dimensions.get('window');
      setKeyboard(prev => ({
        ...prev,
        screenHeight: height,
        availableHeight: prev.keyboardShown 
          ? height - prev.keyboardHeight - insets.bottom
          : height,
      }));
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const onKeyboardShow = (event: any) => {
      const keyboardHeight = event.endCoordinates?.height || 0;
      const screenHeight = Dimensions.get('window').height;
      
      setKeyboard({
        keyboardHeight,
        keyboardShown: true,
        screenHeight,
        availableHeight: screenHeight - keyboardHeight - insets.bottom,
      });
    };

    const onKeyboardHide = () => {
      const screenHeight = Dimensions.get('window').height;
      
      setKeyboard({
        keyboardHeight: 0,
        keyboardShown: false,
        screenHeight,
        availableHeight: screenHeight,
      });
    };

    const showListener = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, onKeyboardHide);
    const dimensionsListener = Dimensions.addEventListener('change', updateScreenDimensions);

    return () => {
      showListener?.remove();
      hideListener?.remove();
      dimensionsListener?.remove();
    };
  }, [insets.bottom]);

  // Calculate dynamic snap points based on keyboard state
  const calculateSnapPoints = (baseSnapPoints: string[]): string[] => {
    if (!keyboard.keyboardShown) {
      return baseSnapPoints;
    }

    // Convert percentage snap points to absolute values, then adjust for keyboard
    return baseSnapPoints.map(point => {
      const percentage = parseInt(point.replace('%', ''));
      const absoluteHeight = (keyboard.screenHeight * percentage) / 100;
      
      // Ensure the bottom sheet doesn't go behind the keyboard
      const maxAllowedHeight = keyboard.availableHeight * 0.9; // 90% of available space
      const adjustedHeight = Math.min(absoluteHeight, maxAllowedHeight);
      
      // Convert back to percentage of original screen height
      const adjustedPercentage = Math.round((adjustedHeight / keyboard.screenHeight) * 100);
      return `${Math.max(adjustedPercentage, 25)}%`; // Minimum 25%
    });
  };

  return {
    ...keyboard,
    calculateSnapPoints,
  };
};