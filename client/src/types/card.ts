export type CardType = 'credit' | 'debit' | 'aadhar' | 'pan' | 'other';

export interface Card {
  id?: string;
  userId: string;
  type: CardType;
  cardName?: string;
  cardNumber?: string;
  cardHolderName?: string;
  expiryDate?: string;
  cvv?: string;
  bank?: string;
  imageUrl?: string;
  imageEncrypted?: boolean; // Flag indicating if image is encrypted
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  extractedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  shareFolderId?: string; // Reference to share folder if card is in a shared folder
}

export interface ExtractionResult {
  type: CardType;
  cardNumber?: string;
  cardHolderName?: string;
  expiryDate?: string;
  cvv?: string;
  bank?: string;
  cardName?: string;
  isValid: boolean;
}

export interface ShareFolder {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  cardIds: string[]; // Array of card IDs in this folder
  createdAt?: any;
  updatedAt?: any;
}

