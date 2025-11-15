import axios, { AxiosError } from 'axios';
import { Card, ExtractionResult } from '../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Add axios interceptor to handle rate limit errors globally
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError<RateLimitError>) => {
    if (error.response?.status === 429) {
      return Promise.reject(handleRateLimitError(error));
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

