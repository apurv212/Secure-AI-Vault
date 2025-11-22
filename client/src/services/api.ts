import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Card, ExtractionResult } from '../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// CSRF Token Management
let csrfToken: string | null = null;

/**
 * Fetch CSRF token from server
 * This should be called on app initialization and after token expiry
 */
const fetchCsrfToken = async (): Promise<string> => {
  try {
    const response = await axios.get(`${API_URL}/csrf-token`, {
      withCredentials: true // Important for cookie-based CSRF
    });
    const token = response.data.csrfToken as string;
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

/**
 * Initialize CSRF token on app start
 * Call this when the app loads
 */
export const initCsrfProtection = async (): Promise<void> => {
  try {
    await fetchCsrfToken();
    console.log('CSRF protection initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
};

const getAuthHeaders = (token: string | null) => {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// Rate limit error handler
interface RateLimitError {
  error: string;
  message: string;
  retryAfter?: number;
  remainingTime?: string;
}

const handleRateLimitError = (error: AxiosError<RateLimitError>): never => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.data?.retryAfter || 900; // Default 15 minutes
    const minutes = Math.ceil(retryAfter / 60);
    const errorMessage = error.response.data?.message || 
      `Rate limit exceeded. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    
    const rateLimitError: any = new Error(errorMessage);
    rateLimitError.isRateLimit = true;
    rateLimitError.retryAfter = retryAfter;
    rateLimitError.status = 429;
    throw rateLimitError;
  }
  throw error;
};

// Configure axios to send cookies with all requests (required for CSRF)
axios.defaults.withCredentials = true;

// Add axios request interceptor to include CSRF token
axios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Only add CSRF token for state-changing methods
    const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '');
    
    if (needsCsrf) {
      // If we don't have a token yet, fetch it
      if (!csrfToken) {
        try {
          await fetchCsrfToken();
        } catch (error) {
          console.error('Failed to fetch CSRF token:', error);
        }
      }
      
      // Add CSRF token to request headers
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add axios response interceptor to handle rate limit and CSRF errors
axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<RateLimitError>) => {
    // Handle rate limit errors
    if (error.response?.status === 429) {
      return Promise.reject(handleRateLimitError(error));
    }
    
    // Handle CSRF token errors - refetch token and retry once
    if (error.response?.status === 403 && 
        error.response?.data?.error === 'Invalid CSRF token') {
      try {
        // Refetch CSRF token
        await fetchCsrfToken();
        
        // Retry the original request with new token
        if (error.config) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
          return axios.request(error.config);
        }
      } catch (retryError) {
        console.error('Failed to refresh CSRF token:', retryError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const shareFolderApi = {
  getAll: async (token: string | null) => {
    try {
      const response = await axios.get(
        `${API_URL}/sharefolders`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (token: string | null, folder: { name: string; description?: string }) => {
    try {
      const response = await axios.post(
        `${API_URL}/sharefolders`,
        folder,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (token: string | null, id: string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/sharefolders/${id}`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addCard: async (token: string | null, folderId: string, cardId: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/sharefolders/${folderId}/cards`,
        { cardId },
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  removeCard: async (token: string | null, folderId: string, cardId: string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/sharefolders/${folderId}/cards/${cardId}`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  generateShareLink: async (token: string | null, folderId: string, expiresIn: string = 'never') => {
    try {
      const response = await axios.post(
        `${API_URL}/sharefolders/${folderId}/share`,
        { expiresIn },
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  revokeShareLink: async (token: string | null, folderId: string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/sharefolders/${folderId}/share`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getShareHistory: async (token: string | null, folderId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/sharefolders/${folderId}/history`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const cardApi = {
  getAll: async (token: string | null, bank?: string, type?: string) => {
    try {
      const params = new URLSearchParams();
      if (bank) params.append('bank', bank);
      if (type) params.append('type', type);
      const response = await axios.get(
        `${API_URL}/cards?${params.toString()}`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCardImage: async (token: string | null, cardId: string): Promise<string> => {
    try {
      const response = await axios.get(
        `${API_URL}/cards/${cardId}/image`,
        {
          ...getAuthHeaders(token),
          responseType: 'arraybuffer' // Get binary data
        }
      );
      
      // Check if response is JSON (unencrypted image URL)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // Response is JSON with imageUrl
        const jsonData = JSON.parse(new TextDecoder().decode(response.data));
        return jsonData.imageUrl;
      }
      
      // Response is binary image data (decrypted)
      // Convert to blob URL for display
      const blob = new Blob([response.data], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      throw error;
    }
  },

  getById: async (token: string | null, id: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/cards/${id}`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  create: async (token: string | null, card: Partial<Card>) => {
    try {
      const response = await axios.post(
        `${API_URL}/cards`,
        card,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (token: string | null, id: string, card: Partial<Card>) => {
    try {
      const response = await axios.put(
        `${API_URL}/cards/${id}`,
        card,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (token: string | null, id: string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/cards/${id}`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCVV: async (token: string | null, id: string) => {
    try {
      const response = await axios.delete(
        `${API_URL}/cards/${id}/cvv`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getBanks: async (token: string | null) => {
    try {
      const response = await axios.get(
        `${API_URL}/cards/banks/list`,
        getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const extractApi = {
  extract: async (token: string | null, imageUrl: string, cardId?: string): Promise<ExtractionResult> => {
    try {
      const response = await axios.post(
        `${API_URL}/extract`,
        { imageUrl, cardId },
        getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }
};

// Export helper function to check if error is rate limit error
export const isRateLimitError = (error: any): boolean => {
  return error?.isRateLimit === true || error?.status === 429;
};

// Export helper to get retry time from error
export const getRetryAfter = (error: any): number => {
  return error?.retryAfter || 900; // Default 15 minutes
};

