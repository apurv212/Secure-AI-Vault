import axios from 'axios';
import { Card, ExtractionResult } from '../types/card';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = (token: string | null) => {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const cardApi = {
  getAll: async (token: string | null, bank?: string, type?: string) => {
    const params = new URLSearchParams();
    if (bank) params.append('bank', bank);
    if (type) params.append('type', type);
    const response = await axios.get(
      `${API_URL}/cards?${params.toString()}`,
      getAuthHeaders(token)
    );
    return response.data;
  },

  getById: async (token: string | null, id: string) => {
    const response = await axios.get(
      `${API_URL}/cards/${id}`,
      getAuthHeaders(token)
    );
    return response.data;
  },

  create: async (token: string | null, card: Partial<Card>) => {
    const response = await axios.post(
      `${API_URL}/cards`,
      card,
      getAuthHeaders(token)
    );
    return response.data;
  },

  update: async (token: string | null, id: string, card: Partial<Card>) => {
    const response = await axios.put(
      `${API_URL}/cards/${id}`,
      card,
      getAuthHeaders(token)
    );
    return response.data;
  },

  delete: async (token: string | null, id: string) => {
    const response = await axios.delete(
      `${API_URL}/cards/${id}`,
      getAuthHeaders(token)
    );
    return response.data;
  },

  getBanks: async (token: string | null) => {
    const response = await axios.get(
      `${API_URL}/cards/banks/list`,
      getAuthHeaders(token)
    );
    return response.data;
  }
};

export const extractApi = {
  extract: async (token: string | null, imageUrl: string, cardId?: string): Promise<ExtractionResult> => {
    const response = await axios.post(
      `${API_URL}/extract`,
      { imageUrl, cardId },
      getAuthHeaders(token)
    );
    return response.data.data;
  }
};

