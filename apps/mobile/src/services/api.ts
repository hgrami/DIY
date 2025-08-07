import { ApiResponse } from '../@types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// Auth error codes from the backend
export const AUTH_ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOKEN_VERIFICATION_FAILED: 'TOKEN_VERIFICATION_FAILED',
  AUTH_FAILED: 'AUTH_FAILED',
} as const;

interface ApiError extends Error {
  code?: string;
  status?: number;
  response?: any;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  backoffMultiplier: number;
}

class ApiService {
  private tokenProvider?: () => Promise<string | null>;
  private onAuthError?: (error: ApiError) => Promise<void>;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
  };

  /**
   * Configure the API service with token provider and auth error handler
   */
  configure(options: {
    tokenProvider: () => Promise<string | null>;
    onAuthError?: (error: ApiError) => Promise<void>;
    retryConfig?: Partial<RetryConfig>;
  }) {
    this.tokenProvider = options.tokenProvider;
    this.onAuthError = options.onAuthError;
    if (options.retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...options.retryConfig };
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get auth token for API request:', error);
      }
    }

    return headers;
  }

  private createApiError(response: Response, data: any): ApiError {
    const error = new Error(data?.error || `HTTP ${response.status}`) as ApiError;
    error.status = response.status;
    error.code = data?.code;
    error.response = data;
    return error;
  }

  private async shouldRetryRequest(error: ApiError, attempt: number): Promise<boolean> {
    // Don't retry if we've exhausted our attempts
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on token expired errors (we'll get a fresh token)
    if (error.code === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
      return true;
    }

    // Retry on network errors
    if (!error.status) {
      return true;
    }

    // Retry on server errors (5xx)
    if (error.status >= 500) {
      return true;
    }

    return false;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;

      // Get fresh auth headers for each attempt
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
      });

      // Try to parse response data
      let data: any;
      const responseText = await response.text();
      
      try {
        data = responseText ? JSON.parse(responseText) : { success: true, data: null };
      } catch (parseError) {
        console.error(`[ApiService] JSON parse error for ${endpoint}:`, parseError);
        data = { success: false, error: 'Invalid response format' };
      }

      // Handle successful responses
      if (response.ok) {
        return data;
      }

      // Handle 401 authentication errors
      if (response.status === 401) {
        const apiError = this.createApiError(response, data);

        // Check if we should retry
        if (await this.shouldRetryRequest(apiError, attempt)) {
          console.log(`API auth error, retrying request (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}):`, data);

          // Wait before retrying with exponential backoff
          const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
          await this.sleep(delay);

          return this.makeRequest<T>(endpoint, options, attempt + 1);
        }

        // If we can't retry or have exhausted retries, handle auth error
        if (this.onAuthError) {
          await this.onAuthError(apiError);
        }

        throw apiError;
      }

      // Handle other HTTP errors
      const apiError = this.createApiError(response, data);

      // Check if we should retry for server errors
      if (await this.shouldRetryRequest(apiError, attempt)) {
        console.log(`API error ${response.status}, retrying request (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}):`, data);

        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        await this.sleep(delay);

        return this.makeRequest<T>(endpoint, options, attempt + 1);
      }

      throw apiError;

    } catch (error: any) {
      // Handle network errors and other exceptions
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.error('API request failed:', error);
      }

      // For network errors, try to retry
      if (!error.status && await this.shouldRetryRequest(error, attempt)) {
        console.log(`Network error, retrying request (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}):`, error.message);

        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        await this.sleep(delay);

        return this.makeRequest<T>(endpoint, options, attempt + 1);
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

export type { ApiService };
export const apiService = new ApiService();