const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const { normalizeBankName } = require('../utils/bankNormalizer');
const logger = require('../utils/secureLogger');
const { encryptCardData, decryptCardData } = require('../utils/encryption');
const { getDecryptedImageBuffer, isEncryptionEnabled } = require('../utils/imageEncryption');
const router = express.Router();

const db = admin.firestore();

// Check if encryption is enabled
const ENCRYPTION_ENABLED = isEncryptionEnabled();

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all cards for user
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { bank, type } = req.query;
    let query = db.collection('cards').where('userId', '==', req.user.uid);
    
    // Handle bank filter
    if (bank) {
      if (bank === 'other') {
        // For "other", we need to filter cards where type is "other" OR bank is null/empty
        // Since Firestore doesn't support OR queries easily, fetch all and filter in memory
        const allCardsSnapshot = await db.collection('cards')
          .where('userId', '==', req.user.uid)
          .get();
        
        let cards = allCardsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(card => {
            // Include if type is "other" OR bank is null/empty/undefined
            return card.type === 'other' || !card.bank || card.bank.trim() === '';
          });
        
        // Apply type filter if specified
        if (type) {
          cards = cards.filter(card => card.type === type);
        }
        
        // Sort by createdAt
        cards.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        
        return res.json(cards);
      } else {
        // Normalize bank name and filter
        const normalizedBank = normalizeBankName(bank);
        if (normalizedBank) {
          query = query.where('bank', '==', normalizedBank);
        }
      }
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    let cards = snapshot.docs.map(doc => {
      const data = doc.data();
      let cardData = { id: doc.id, ...data };
      
      // Decrypt sensitive fields if encryption is enabled
      if (ENCRYPTION_ENABLED) {
        try {
          cardData = { id: doc.id, ...decryptCardData(data) };
        } catch (decryptError) {
          logger.error('Decryption failed for card:', doc.id);
          // Return card without sensitive data if decryption fails
          cardData = { 
            id: doc.id, 
            ...data,
            cardNumber: null,
            cvv: null,
            expiryDate: null,
            _decryptionFailed: true
          };
        }
      }
      
      return cardData;
    });
    
    // Sort by createdAt in memory (fallback if index not created)
    cards.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime; // Descending order
    });
    
    res.json(cards);
  } catch (error) {
    logger.error('Error fetching cards:', error.message);
    res.status(500).json({ error: 'Failed to fetch cards', message: error.message });
  }
});

// Get single card
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const doc = await db.collection('cards').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const data = doc.data();
    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Decrypt sensitive fields if encryption is enabled
    let cardData = { id: doc.id, ...data };
    if (ENCRYPTION_ENABLED) {
      try {
        cardData = { id: doc.id, ...decryptCardData(data) };
      } catch (decryptError) {
        logger.error('Decryption failed for card:', doc.id);
        // Return card without sensitive data if decryption fails
        cardData = { id: doc.id, ...data, cardNumber: null, cvv: null };
      }
    }
    
    res.json(cardData);
  } catch (error) {
    logger.error('Error fetching card:', error.message);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Create card
router.post('/', verifyAuth, [
  body('type').isIn(['credit', 'debit', 'aadhar', 'pan', 'other']),
  body('cardName').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let cardData = {
      ...req.body,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Encrypt sensitive fields if encryption is enabled
    if (ENCRYPTION_ENABLED) {
      try {
        cardData = encryptCardData(cardData);
        logger.info('Card data encrypted before storage');
      } catch (encryptError) {
        logger.error('Encryption failed:', encryptError.message);
        return res.status(500).json({ 
          error: 'Failed to encrypt card data',
          message: 'Encryption is required but failed. Please check server configuration.'
        });
      }
    }

    // Add CVV warning timestamp if CVV is present
    if (req.body.cvv) {
      cardData.cvvStoredAt = admin.firestore.FieldValue.serverTimestamp();
      cardData.cvvWarningShown = false; // Frontend should show warning
    }

    const docRef = await db.collection('cards').add(cardData);
    const doc = await docRef.get();
    
    // Decrypt for response
    let responseData = { id: doc.id, ...doc.data() };
    if (ENCRYPTION_ENABLED) {
      try {
        responseData = { id: doc.id, ...decryptCardData(doc.data()) };
      } catch (decryptError) {
        logger.error('Decryption failed for response');
      }
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    logger.error('Error creating card:', error.message);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card
router.put('/:id', verifyAuth, async (req, res) => {
  try {
    const doc = await db.collection('cards').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let updateData = { ...req.body }; // Changed to 'let' for encryption reassignment

    // Normalize bank name if provided
    if (updateData.bank) {
      const normalizedBank = normalizeBankName(updateData.bank);
      if (normalizedBank) {
        updateData.bank = normalizedBank;
      } else {
        // If bank name couldn't be normalized, remove it
        delete updateData.bank;
      }
    }

    // If no bank found and type is not "other", set type to "other"
    if (!updateData.bank && updateData.type !== 'other') {
      const existingData = doc.data();
      if (!existingData.bank) {
        updateData.type = 'other';
      }
    }

    // Encrypt sensitive fields if encryption is enabled
    if (ENCRYPTION_ENABLED) {
      try {
        updateData = encryptCardData(updateData);
      } catch (encryptError) {
        logger.error('Encryption failed:', encryptError.message);
        return res.status(500).json({ 
          error: 'Failed to encrypt card data',
          message: 'Encryption is required but failed.'
        });
      }
    }

    // Update CVV timestamp if CVV is being updated
    if (req.body.cvv) {
      updateData.cvvStoredAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.cvvWarningShown = false;
    }

    await db.collection('cards').doc(req.params.id).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await db.collection('cards').doc(req.params.id).get();
    
    // Decrypt for response
    let responseData = { id: updated.id, ...updated.data() };
    if (ENCRYPTION_ENABLED) {
      try {
        responseData = { id: updated.id, ...decryptCardData(updated.data()) };
      } catch (decryptError) {
        logger.error('Decryption failed for response:', decryptError.message);
      }
    }
    
    res.json(responseData);
  } catch (error) {
    logger.error('Error updating card:', error.message);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update card',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete CVV only (recommended for security)
router.delete('/:id/cvv', verifyAuth, async (req, res) => {
  try {
    const doc = await db.collection('cards').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove CVV and related fields
    await db.collection('cards').doc(req.params.id).update({
      cvv: admin.firestore.FieldValue.delete(),
      cvv_encrypted: admin.firestore.FieldValue.delete(),
      cvvStoredAt: admin.firestore.FieldValue.delete(),
      cvvWarningShown: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('CVV deleted for card:', req.params.id);
    res.json({ 
      message: 'CVV deleted successfully',
      info: 'You can add it again later if needed'
    });
  } catch (error) {
    logger.error('Error deleting CVV:', error.message);
    res.status(500).json({ error: 'Failed to delete CVV' });
  }
});

// Delete card
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const doc = await db.collection('cards').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const cardData = doc.data();
    if (cardData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete image from Firebase Storage if exists
    if (cardData.imageUrl) {
      try {
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        const bucket = admin.storage().bucket(bucketName);
        
        // Extract file path from imageUrl
        let filePath = cardData.imageUrl;
        
        // If it's a full URL, extract the path
        if (filePath.includes('firebasestorage.googleapis.com')) {
          const urlParts = filePath.split('/o/');
          if (urlParts.length > 1) {
            filePath = decodeURIComponent(urlParts[1].split('?')[0]);
          }
        }
        
        logger.debug('Attempting to delete image:', filePath);
        
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        
        if (exists) {
          await file.delete();
          logger.info('Image deleted from storage:', filePath);
          
          // Also try to delete encrypted version if it exists
          const encryptedFile = bucket.file(`${filePath}.encrypted`);
          const [encryptedExists] = await encryptedFile.exists();
          if (encryptedExists) {
            await encryptedFile.delete();
            logger.info('Encrypted image deleted from storage:', `${filePath}.encrypted`);
          }
        } else {
          logger.warn('Image file not found in storage:', filePath);
          
          // Try to find files with similar name pattern for debugging
          const userFolder = filePath.split('/').slice(0, -1).join('/');
          logger.debug('Searching in folder:', userFolder);
          
          try {
            const [files] = await bucket.getFiles({ prefix: userFolder });
            logger.debug('Files found in folder:', files.map(f => f.name));
            
            // Try to find and delete the file by pattern matching
            const fileName = filePath.split('/').pop();
            const matchingFiles = files.filter(f => f.name.includes(fileName));
            
            if (matchingFiles.length > 0) {
              logger.info('Found matching files by pattern:', matchingFiles.map(f => f.name));
              for (const matchingFile of matchingFiles) {
                await matchingFile.delete();
                logger.info('Deleted matched file:', matchingFile.name);
              }
            }
          } catch (listError) {
            logger.error('Error listing files:', listError.message);
          }
        }
      } catch (storageError) {
        logger.error('Failed to delete image from storage:', storageError.message);
        logger.debug('Storage error details:', storageError.stack);
        // Continue with card deletion even if image deletion fails
      }
    }

    await db.collection('cards').doc(req.params.id).delete();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    logger.error('Error deleting card:', error.message);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get banks list
router.get('/banks/list', verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('cards')
      .where('userId', '==', req.user.uid)
      .get();
    
    const bankSet = new Set();
    
    snapshot.docs.forEach(doc => {
      const cardData = doc.data();
      const bank = cardData.bank;
      const type = cardData.type;
      
      // If card has a bank, normalize it and add to set
      if (bank) {
        const normalizedBank = normalizeBankName(bank);
        if (normalizedBank) {
          bankSet.add(normalizedBank);
        }
      }
      
      // If card type is "other" (no bank), add "other" to the filter list
      if (type === 'other' || !bank) {
        bankSet.add('other');
      }
    });
    
    // Convert set to array and sort
    const banks = Array.from(bankSet).sort();
    res.json(banks);
  } catch (error) {
    logger.error('Error fetching banks:', error.message);
    res.status(500).json({ error: 'Failed to fetch banks', message: error.message });
  }
});

// Serve decrypted card image
// GET /api/cards/:id/image
router.get('/:id/image', verifyAuth, async (req, res) => {
  try {
    const cardId = req.params.id;
    
    // Get card document
    const doc = await db.collection('cards').doc(cardId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const cardData = doc.data();
    
    // Verify ownership
    if (cardData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if card has an image
    if (!cardData.imageUrl) {
      return res.status(404).json({ error: 'Card has no image' });
    }
    
    // If image is not encrypted, redirect to Firebase Storage URL
    if (!cardData.imageEncrypted) {
      // For unencrypted images, return the URL for client to fetch
      return res.json({ imageUrl: cardData.imageUrl, encrypted: false });
    }
    
    // Decrypt and serve encrypted image
    if (ENCRYPTION_ENABLED) {
      try {
        logger.info('Decrypting image for card:', cardId);
        logger.debug('Image path:', cardData.imageUrl);
        
        // Get bucket from storage (use the configured bucket)
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        const bucket = admin.storage().bucket(bucketName);
        
        // Get decrypted image buffer
        const decryptedBuffer = await getDecryptedImageBuffer(bucket, cardData.imageUrl);
        
        // Serve as image
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
        res.send(decryptedBuffer);
        
        logger.info('Image decrypted and served successfully');
      } catch (decryptError) {
        logger.error('Image decryption failed:', decryptError.message);
        return res.status(500).json({ 
          error: 'Failed to decrypt image',
          message: 'Image decryption failed. The image may be corrupted or the encryption key may have changed.'
        });
      }
    } else {
      // Encryption not enabled but image marked as encrypted
      return res.status(500).json({ 
        error: 'Encryption not configured',
        message: 'Image is encrypted but encryption key is not available.'
      });
    }
  } catch (error) {
    logger.error('Error serving card image:', error.message);
    res.status(500).json({ error: 'Failed to retrieve card image' });
  }
});

module.exports = router;

