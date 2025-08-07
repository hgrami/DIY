import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 using expo-crypto as fallback
 * This is a simplified UUID v4 implementation for React Native
 */
export function generateUUID(): string {
  try {
    // Try to use the standard uuid library first (should work with our polyfill)
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  } catch (error) {
    // Fallback: Generate UUID manually using expo-crypto
    console.warn('Using fallback UUID generation:', error);
    
    const bytes = Crypto.getRandomBytes(16);
    
    // Set version (4) and variant bits according to UUID v4 spec
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    // Convert to hex string with proper formatting
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }
}