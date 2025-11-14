const crypto = require('crypto');

/**
 * Generate a secure random share token
 * Format: 32 characters (alphanumeric, URL-safe)
 */
const generateShareToken = () => {
  return crypto.randomBytes(24).toString('base64url');
};

/**
 * Validate share token format
 */
const isValidShareToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  // Base64url tokens are 32 characters for 24 bytes
  return /^[A-Za-z0-9_-]{32}$/.test(token);
};

/**
 * Calculate expiry date from duration
 * @param {string} duration - '24h', '30d', or timestamp
 * @returns {Date|null} - Expiry date or null for never
 */
const calculateExpiry = (duration) => {
  if (!duration || duration === 'never') return null;

  const now = new Date();
  
  // Handle hour format (24h, 48h, etc.)
  const hoursMatch = duration.match(/^(\d+)h$/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }
  
  // Handle days format (1d, 7d, 30d, etc.)
  const daysMatch = duration.match(/^(\d+)d$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // Handle custom timestamp
  const timestamp = parseInt(duration);
  if (!isNaN(timestamp) && timestamp > Date.now()) {
    return new Date(timestamp);
  }
  
  // Default to never expire if invalid format
  return null;
};

/**
 * Check if share has expired
 */
const isExpired = (expiresAt) => {
  if (!expiresAt) return false; // Never expires
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return expiry < new Date();
};

/**
 * Format expiry date for display
 */
const formatExpiry = (expiresAt) => {
  if (!expiresAt) return 'Never';
  const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return expiry.toLocaleString();
};

module.exports = {
  generateShareToken,
  isValidShareToken,
  calculateExpiry,
  isExpired,
  formatExpiry
};

