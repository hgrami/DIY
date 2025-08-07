import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export interface StoredUserData {
  id: string;
  email: string;
  clerkId: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
}

class SecureStorageService {
  /**
   * Store a value securely
   */
  private async setSecureValue(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to store ${key} in SecureStore:`, error);
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Get a value securely
   */
  private async getSecureValue(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
    } catch (error) {
      console.error(`Failed to retrieve ${key} from SecureStore:`, error);
    }

    // Fallback to AsyncStorage
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to retrieve ${key} from AsyncStorage:`, error);
      return null;
    }
  }

  /**
   * Remove a value securely
   */
  private async removeSecureValue(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from SecureStore:`, error);
    }

    // Also remove from AsyncStorage as fallback cleanup
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from AsyncStorage:`, error);
    }
  }

  // Token management
  async storeAuthToken(token: string): Promise<void> {
    await this.setSecureValue(KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return this.getSecureValue(KEYS.AUTH_TOKEN);
  }

  async removeAuthToken(): Promise<void> {
    await this.removeSecureValue(KEYS.AUTH_TOKEN);
  }

  // User data management
  async storeUserData(userData: StoredUserData): Promise<void> {
    await this.setSecureValue(KEYS.USER_DATA, JSON.stringify(userData));
  }

  async getUserData(): Promise<StoredUserData | null> {
    const data = await this.getSecureValue(KEYS.USER_DATA);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      // Clean up corrupted data
      await this.removeUserData();
      return null;
    }
  }

  async removeUserData(): Promise<void> {
    await this.removeSecureValue(KEYS.USER_DATA);
  }

  // Refresh token management (for future use)
  async storeRefreshToken(token: string): Promise<void> {
    await this.setSecureValue(KEYS.REFRESH_TOKEN, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.getSecureValue(KEYS.REFRESH_TOKEN);
  }

  async removeRefreshToken(): Promise<void> {
    await this.removeSecureValue(KEYS.REFRESH_TOKEN);
  }

  // Clear all stored data
  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeAuthToken(),
      this.removeUserData(),
      this.removeRefreshToken(),
    ]);
  }

  // Check if user data exists (useful for initialization)
  async hasStoredSession(): Promise<boolean> {
    const userData = await this.getUserData();
    return userData !== null;
  }

  // Validate stored data integrity
  async validateStoredData(): Promise<boolean> {
    try {
      const userData = await this.getUserData();
      return userData !== null && 
             typeof userData.id === 'string' && 
             typeof userData.email === 'string' &&
             typeof userData.clerkId === 'string';
    } catch (error) {
      console.error('Failed to validate stored data:', error);
      return false;
    }
  }

  // Migration helper to move data from AsyncStorage to SecureStore
  async migrateFromAsyncStorage(): Promise<void> {
    try {
      // Check for existing token in AsyncStorage
      const oldToken = await AsyncStorage.getItem('auth_token');
      if (oldToken) {
        // Move to SecureStore
        await this.storeAuthToken(oldToken);
        // Remove from AsyncStorage
        await AsyncStorage.removeItem('auth_token');
        console.log('Successfully migrated auth token to SecureStore');
      }
    } catch (error) {
      console.error('Failed to migrate data from AsyncStorage:', error);
    }
  }
}

export const secureStorage = new SecureStorageService();