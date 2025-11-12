/**
 * Encryption Utility for Sensitive Card Data
 * 
 * Uses AES-256-GCM for strong encryption
 * Each field gets a unique IV (Initialization Vector)
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 * In production, this should come from a secure key management service
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY not set in environment variables');
  }
  
  // Convert base64 key to buffer
  // Key should be 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, 'base64');
  
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits). Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"');
  }
  
  return keyBuffer;
}

/**
 * Encrypt sensitive data
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Encrypted data in format: iv:authTag:ciphertext (all base64)
 */
function encrypt(plaintext) {
  if (!plaintext || plaintext.trim() === '') {
    return null; // Don't encrypt empty values
  }
  
  try {
    const key = getEncryptionKey();
    
    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag for GCM mode (ensures data integrity)
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data in format: iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    return null; // Return null for empty values
  }
  
  try {
    const key = getEncryptionKey();
    
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt card data fields
 * @param {Object} cardData - Card data object
 * @returns {Object} Card data with encrypted sensitive fields
 */
function encryptCardData(cardData) {
  const encrypted = { ...cardData };
  
  // Fields to encrypt
  const sensitiveFields = ['cardNumber', 'cvv', 'expiryDate'];
  
  sensitiveFields.forEach(field => {
    if (cardData[field]) {
      try {
        encrypted[field] = encrypt(cardData[field]);
        encrypted[`${field}_encrypted`] = true; // Flag to indicate encryption
      } catch (error) {
        console.error(`Failed to encrypt ${field}:`, error.message);
        // Don't store unencrypted data - throw error
        throw new Error(`Failed to encrypt sensitive field: ${field}`);
      }
    }
  });
  
  return encrypted;
}

/**
 * Decrypt card data fields
 * @param {Object} cardData - Card data object with encrypted fields
 * @returns {Object} Card data with decrypted fields
 */
function decryptCardData(cardData) {
  const decrypted = { ...cardData };
  
  // Fields to decrypt
  const sensitiveFields = ['cardNumber', 'cvv', 'expiryDate'];
  
  sensitiveFields.forEach(field => {
    if (cardData[field] && cardData[`${field}_encrypted`]) {
      try {
        decrypted[field] = decrypt(cardData[field]);
        delete decrypted[`${field}_encrypted`]; // Remove encryption flag
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error.message);
        decrypted[field] = null; // Return null if decryption fails
      }
    }
  });
  
  return decrypted;
}

/**
 * Generate a new encryption key (for setup)
 * @returns {string} Base64 encoded encryption key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Mask card number for display (show only last 4 digits)
 * @param {string} cardNumber - Full card number
 * @returns {string} Masked card number (e.g., "**** **** **** 1234")
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber || cardNumber.length < 4) {
    return '****';
  }
  
  const last4 = cardNumber.slice(-4);
  const masked = '*'.repeat(cardNumber.length - 4) + last4;
  
  // Format with spaces (every 4 digits)
  return masked.match(/.{1,4}/g).join(' ');
}

module.exports = {
  encrypt,
  decrypt,
  encryptCardData,
  decryptCardData,
  generateEncryptionKey,
  maskCardNumber
};

