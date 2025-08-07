import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { AuthUser } from '../@types';
import { apiService, AUTH_ERROR_CODES } from '../services/api';
import { secureStorage, StoredUserData } from '../services/secureStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  authenticate: (token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, signOut, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      handleClerkAuth();
    } else if (!isSignedIn) {
      handleLogout();
    }
  }, [isSignedIn, clerkUser]);

  // Configure API service with token provider and auth error handler
  useEffect(() => {
    apiService.configure({
      tokenProvider: getClerkToken,
      onAuthError: handleApiAuthError,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
      },
    });
  }, []);

  const getClerkToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!getToken) {
        console.warn('getToken function not available from Clerk');
        return null;
      }
      
      const token = await getToken();
      if (token) {
        setToken(token);
        setAuthError(null);
      }
      return token;
    } catch (error) {
      console.error('Failed to get token from Clerk:', error);
      return null;
    }
  }, [getToken]);

  const handleApiAuthError = useCallback(async (error: any) => {
    console.error('API authentication error:', error);
    
    // Handle different types of auth errors
    switch (error.code) {
      case AUTH_ERROR_CODES.TOKEN_EXPIRED:
        // Token expired - this should have been handled by automatic retry
        // If we reach here, it means all retries failed
        setAuthError('Your session has expired. Please log in again.');
        await logout();
        break;
      
      case AUTH_ERROR_CODES.TOKEN_INVALID:
      case AUTH_ERROR_CODES.TOKEN_VERIFICATION_FAILED:
        // Token is invalid - force logout
        setAuthError('Authentication failed. Please log in again.');
        await logout();
        break;
      
      case AUTH_ERROR_CODES.USER_NOT_FOUND:
        // User doesn't exist in backend - try to sync
        setAuthError('Account sync failed. Retrying...');
        try {
          await syncUser();
        } catch (syncError) {
          setAuthError('Failed to sync account. Please log in again.');
          await logout();
        }
        break;
      
      default:
        setAuthError('Authentication error occurred. Please try again.');
        console.error('Unhandled auth error:', error);
    }
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Migrate data from AsyncStorage if needed
      await secureStorage.migrateFromAsyncStorage();
      
      // Check if we have stored user data
      const hasStoredSession = await secureStorage.hasStoredSession();
      if (hasStoredSession) {
        const userData = await secureStorage.getUserData();
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            subscriptionStatus: userData.subscriptionStatus,
          });
        }
      }
      
      // If user is signed in with Clerk, sync with backend
      if (isSignedIn && clerkUser) {
        await handleClerkAuth();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setAuthError('Failed to initialize authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleClerkAuth = async () => {
    try {
      if (!clerkUser || !getToken) return;

      setLoading(true);
      setAuthError(null);
      
      const token = await getToken();
      if (token) {
        setToken(token);
        await syncUser();
      }
    } catch (error) {
      console.error('Failed to handle Clerk auth:', error);
      setAuthError('Failed to authenticate with Clerk');
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async (newToken: string, refreshToken?: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      setToken(newToken);
      await syncUser();
    } catch (error) {
      console.error('Authentication failed:', error);
      await logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    try {
      const response = await apiService.get('/auth/sync');

      if (response.success && response.data) {
        const userData = response.data as AuthUser;
        setUser(userData);
        
        // Store user data securely
        const storedData: StoredUserData = {
          id: userData.id,
          email: userData.email,
          clerkId: userData.id, // Assuming id is clerkId
          subscriptionStatus: userData.subscriptionStatus || 'FREE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await secureStorage.storeUserData(storedData);
        
        setAuthError(null);
      } else {
        throw new Error('Failed to sync user');
      }
    } catch (error: any) {
      console.error('Failed to sync user:', error);
      
      // Don't immediately logout for sync errors - let the API service handle retries
      if (error.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
        // This should be handled by the API service retry logic
        throw error;
      } else {
        setAuthError('Failed to sync user data');
        throw error;
      }
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    setAuthError(null);
    await secureStorage.clearAll();
  };

  const logout = async () => {
    try {
      await signOut();
      await handleLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      await handleLogout();
    }
  };

  const refreshUser = async () => {
    try {
      setAuthError(null);
      await syncUser();
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setAuthError('Failed to refresh user data');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: !!user && !!token,
    user,
    token,
    authenticate,
    logout,
    refreshUser,
    loading,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};