/**
 * Image Encryption Utility
 * 
 * Encrypts and decrypts image files using AES-256-GCM
 * Images are encrypted after OCR extraction and stored encrypted in Firebase Storage
 */

const crypto = require('crypto');
const logger = require('./secureLogger');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY not set in environment variables');
  }
  
  const keyBuffer = Buffer.from(key, 'base64');
  
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits)');
  }
  
  return keyBuffer;
}

/**
 * Encrypt image buffer
 * @param {Buffer} imageBuffer - Image data to encrypt
 * @returns {Buffer} Encrypted image buffer with prepended IV and auth tag
 */
function encryptImageBuffer(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the image data
    const encrypted = Buffer.concat([
      cipher.update(imageBuffer),
      cipher.final()
    ]);
    
    // Get auth tag for GCM mode
    const authTag = cipher.getAuthTag();
    
    // Prepend IV and auth tag to encrypted data for storage
    // Format: [IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data]
    return Buffer.concat([iv, authTag, encrypted]);
  } catch (error) {
    throw new Error(`Image encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt image buffer
 * @param {Buffer} encryptedBuffer - Encrypted image buffer with IV and auth tag
 * @returns {Buffer} Decrypted image buffer
 */
function decryptImageBuffer(encryptedBuffer) {
  if (!encryptedBuffer || encryptedBuffer.length < (IV_LENGTH + AUTH_TAG_LENGTH)) {
    throw new Error('Invalid encrypted image buffer');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Extract IV, auth tag, and encrypted data
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the image data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    throw new Error(`Image decryption failed: ${error.message}`);
  }
}

/**
 * Check if encryption is enabled
 * @returns {boolean}
 */
function isEncryptionEnabled() {
  return !!process.env.ENCRYPTION_KEY;
}

/**
 * Encrypt image file from Firebase Storage
 * Fetches, encrypts, and re-uploads the image
 * 
 * @param {Object} bucket - Firebase Storage bucket
 * @param {string} filePath - Path to the file in storage
 * @returns {Promise<string>} Path to encrypted file
 */
async function encryptStoredImage(bucket, filePath) {
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Download the file
    const [buffer] = await file.download();
    
    // Encrypt the buffer
    const encryptedBuffer = encryptImageBuffer(buffer);
    
    // Create new filename with .encrypted extension
    const encryptedFilePath = `${filePath}.encrypted`;
    const encryptedFile = bucket.file(encryptedFilePath);
    
    // Upload encrypted file
    await encryptedFile.save(encryptedBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          encrypted: 'true',
          originalPath: filePath
        }
      }
    });
    
    // Delete original unencrypted file
    await file.delete();
    
    return encryptedFilePath;
  } catch (error) {
    throw new Error(`Failed to encrypt stored image: ${error.message}`);
  }
}

/**
 * Get decrypted image URL (signed URL with decrypted data)
 * This is used to serve decrypted images to authenticated users
 * 
 * @param {Object} bucket - Firebase Storage bucket
 * @param {string} encryptedFilePath - Path to encrypted file
 * @returns {Promise<Buffer>} Decrypted image buffer
 */
async function getDecryptedImageBuffer(bucket, encryptedFilePath) {
  try {
    logger.info('Attempting to decrypt image from path:', encryptedFilePath);
    logger.debug('Bucket name:', bucket.name);
    
    const file = bucket.file(encryptedFilePath);
    const [exists] = await file.exists();
    
    logger.debug('File exists check:', exists);
    
    if (!exists) {
      // List files to debug
      logger.debug('Listing files in bucket to debug...');
      const [files] = await bucket.getFiles({ prefix: encryptedFilePath.split('/').slice(0, -1).join('/') });
      logger.debug('Files found in directory:', files.map(f => f.name));
      
      throw new Error(`Encrypted file not found: ${encryptedFilePath}`);
    }
    
    // Download encrypted file
    logger.info('Downloading encrypted file...');
    const [encryptedBuffer] = await file.download();
    logger.debug('Downloaded encrypted buffer, size:', encryptedBuffer.length, 'bytes');
    
    // Decrypt and return
    logger.info('Decrypting image buffer...');
    const decrypted = decryptImageBuffer(encryptedBuffer);
    logger.debug('Decryption successful, size:', decrypted.length, 'bytes');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error details:', error.message);
    logger.debug('Error stack:', error.stack);
    throw new Error(`Failed to decrypt image: ${error.message}`);
  }
}

module.exports = {
  encryptImageBuffer,
  decryptImageBuffer,
  isEncryptionEnabled,
  encryptStoredImage,
  getDecryptedImageBuffer
};

