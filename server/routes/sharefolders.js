const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/secureLogger');
const { generateShareToken, calculateExpiry, isExpired } = require('../utils/shareToken');
const { decryptCardData } = require('../utils/encryption');
const { isEncryptionEnabled, getDecryptedImageBuffer } = require('../utils/imageEncryption');
const router = express.Router();

const db = admin.firestore();
const ENCRYPTION_ENABLED = isEncryptionEnabled();
const SHARE_BASE_URL = (() => {
  const candidates = [
    process.env.SHARE_BASE_URL,
    process.env.CLIENT_URL,            // Check CLIENT_URL first for share links
    process.env.SERVER_PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,   // Render's backend URL (lower priority)
    process.env.SERVER_URL,
    `http://localhost:${process.env.PORT || 5000}`
  ];

  const raw = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return raw ? raw.replace(/\/$/, '') : 'http://localhost:5000';
})();

// Separate URL for API endpoints (always server URL, not client URL)
const API_BASE_URL = (() => {
  const candidates = [
    process.env.SERVER_PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.SERVER_URL,
    `http://localhost:${process.env.PORT || 5000}`
  ];

  const raw = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return raw ? raw.replace(/\/$/, '') : 'http://localhost:5000';
})();

// ==================== MIDDLEWARE ====================

// Verify authentication for private endpoints
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
    logger.warn('Authentication failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== PRIVATE ENDPOINTS (Authenticated) ====================

/**
 * GET /api/sharefolders
 * Get all share folders for authenticated user
 */
router.get('/', verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('shareFolders')
      .where('userId', '==', req.user.uid)
      .get();

    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }))
    // Sort in memory instead (no index required)
    .sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA; // Descending order (newest first)
    });

    logger.info(`User ${req.user.uid} retrieved ${folders.length} share folders`);
    res.json(folders);
  } catch (error) {
    logger.error('Error fetching share folders:', error);
    res.status(500).json({ error: 'Failed to fetch share folders' });
  }
});

/**
 * POST /api/sharefolders
 * Create a new share folder
 */
router.post('/', [
  verifyAuth,
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const folderData = {
      userId: req.user.uid,
      name,
      description: description || '',
      cardIds: [],
      isPublic: false,
      shareToken: null,
      expiresAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('shareFolders').add(folderData);
    const folder = {
      id: docRef.id,
      ...folderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info(`User ${req.user.uid} created share folder: ${name} (${docRef.id})`);
    res.status(201).json(folder);
  } catch (error) {
    logger.error('Error creating share folder:', error);
    res.status(500).json({ error: 'Failed to create share folder' });
  }
});

/**
 * DELETE /api/sharefolders/:id
 * Delete a share folder
 */
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const folderId = req.params.id;
    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await folderRef.delete();

    logger.info(`User ${req.user.uid} deleted share folder: ${folderId}`);
    res.json({ message: 'Share folder deleted successfully' });
  } catch (error) {
    logger.error('Error deleting share folder:', error);
    res.status(500).json({ error: 'Failed to delete share folder' });
  }
});

/**
 * POST /api/sharefolders/:id/cards
 * Add a card to share folder
 */
router.post('/:id/cards', [
  verifyAuth,
  body('cardId').notEmpty().withMessage('Card ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const folderId = req.params.id;
    const { cardId } = req.body;

    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify card exists and belongs to user
    const cardRef = db.collection('cards').doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const cardData = cardDoc.data();
    if (cardData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied to card' });
    }

    // Add card to folder if not already present
    const cardIds = folderData.cardIds || [];
    if (cardIds.includes(cardId)) {
      return res.status(400).json({ error: 'Card already in folder' });
    }

    await folderRef.update({
      cardIds: admin.firestore.FieldValue.arrayUnion(cardId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`User ${req.user.uid} added card ${cardId} to folder ${folderId}`);
    res.json({ message: 'Card added to folder successfully' });
  } catch (error) {
    logger.error('Error adding card to folder:', error);
    res.status(500).json({ error: 'Failed to add card to folder' });
  }
});

/**
 * DELETE /api/sharefolders/:id/cards/:cardId
 * Remove a card from share folder
 */
router.delete('/:id/cards/:cardId', verifyAuth, async (req, res) => {
  try {
    const { id: folderId, cardId } = req.params;

    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await folderRef.update({
      cardIds: admin.firestore.FieldValue.arrayRemove(cardId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`User ${req.user.uid} removed card ${cardId} from folder ${folderId}`);
    res.json({ message: 'Card removed from folder successfully' });
  } catch (error) {
    logger.error('Error removing card from folder:', error);
    res.status(500).json({ error: 'Failed to remove card from folder' });
  }
});

/**
 * POST /api/sharefolders/:id/share
 * Generate public share link for folder
 */
router.post('/:id/share', [
  verifyAuth,
  body('expiresIn').optional().isString().withMessage('expiresIn must be string (e.g., "24h", "30d", "never")')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const folderId = req.params.id;
    const { expiresIn = 'never' } = req.body;

    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if folder has cards
    if (!folderData.cardIds || folderData.cardIds.length === 0) {
      return res.status(400).json({ error: 'Cannot share empty folder. Add cards first.' });
    }

    // Generate new share token
    const shareToken = generateShareToken();
    const expiresAt = calculateExpiry(expiresIn);
    const now = new Date(); // Use regular Date for history entries
    const timestampNow = admin.firestore.FieldValue.serverTimestamp(); // Use sentinel for Firestore fields

    // Create share history entry
    const shareHistoryEntry = {
      shareToken,
      expiresAt: expiresAt || null,
      createdAt: now,
      isActive: true,
      revokedAt: null
    };

    // Get existing share history or initialize
    const shareHistory = folderData.shareHistory || [];
    
    // Mark previous active shares as inactive (revoked)
    const updatedHistory = shareHistory.map(entry => ({
      ...entry,
      isActive: false,
      revokedAt: entry.isActive && !entry.revokedAt ? now : entry.revokedAt
    }));

    // Add new share entry
    updatedHistory.push(shareHistoryEntry);

    await folderRef.update({
      isPublic: true,
      shareToken,
      expiresAt: expiresAt || null,
      sharedAt: timestampNow,
      updatedAt: timestampNow,
      shareHistory: updatedHistory
    });

    const shareUrl = `${SHARE_BASE_URL}/shared/${shareToken}`;

    logger.info(`User ${req.user.uid} generated share link for folder ${folderId}`);
    res.json({
      shareToken,
      shareUrl,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      message: 'Share link generated successfully'
    });
  } catch (error) {
    logger.error('Error generating share link:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

/**
 * DELETE /api/sharefolders/:id/share
 * Revoke public share link (disable sharing)
 */
router.delete('/:id/share', verifyAuth, async (req, res) => {
  try {
    const folderId = req.params.id;

    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!folderData.isPublic) {
      return res.status(400).json({ error: 'No active share link to revoke' });
    }

    const now = new Date(); // Use regular Date for history entries
    const timestampNow = admin.firestore.FieldValue.serverTimestamp(); // Use sentinel for Firestore fields
    
    // Update share history to mark current link as revoked
    const shareHistory = folderData.shareHistory || [];
    const updatedHistory = shareHistory.map(entry => {
      if (entry.isActive && entry.shareToken === folderData.shareToken) {
        return {
          ...entry,
          isActive: false,
          revokedAt: now
        };
      }
      return entry;
    });

    // Disable sharing but keep the share token for history
    await folderRef.update({
      isPublic: false,
      revokedAt: timestampNow,
      updatedAt: timestampNow,
      shareHistory: updatedHistory
    });

    logger.info(`User ${req.user.uid} revoked share link for folder ${folderId}`);
    res.json({ message: 'Share link revoked successfully. You can create a new one.' });
  } catch (error) {
    logger.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

/**
 * GET /api/sharefolders/:id/history
 * Get share link history for a folder
 */
router.get('/:id/history', verifyAuth, async (req, res) => {
  try {
    const folderId = req.params.id;

    const folderRef = db.collection('shareFolders').doc(folderId);
    const folderDoc = await folderRef.get();

    if (!folderDoc.exists) {
      return res.status(404).json({ error: 'Share folder not found' });
    }

    const folderData = folderDoc.data();
    if (folderData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shareHistory = folderData.shareHistory || [];
    
    // Convert timestamps and format for frontend
    const formattedHistory = shareHistory.map(entry => ({
      shareToken: entry.shareToken,
      shareUrl: `${SHARE_BASE_URL}/shared/${entry.shareToken}`,
      createdAt: entry.createdAt?.toDate ? entry.createdAt.toDate().toISOString() : entry.createdAt,
      expiresAt: entry.expiresAt?.toDate ? entry.expiresAt.toDate().toISOString() : entry.expiresAt,
      revokedAt: entry.revokedAt?.toDate ? entry.revokedAt.toDate().toISOString() : entry.revokedAt,
      isActive: entry.isActive
    })).sort((a, b) => {
      // Sort by creation date, newest first
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    logger.info(`User ${req.user.uid} retrieved share history for folder ${folderId}`);
    res.json({ history: formattedHistory });
  } catch (error) {
    logger.error('Error fetching share history:', error);
    res.status(500).json({ error: 'Failed to fetch share history' });
  }
});

// ==================== PUBLIC ENDPOINTS (No Authentication) ====================

/**
 * GET /api/sharefolders/public/:token
 * View shared folder by token (PUBLIC - No authentication required)
 */
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find folder by share token
    const snapshot = await db.collection('shareFolders')
      .where('shareToken', '==', token)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn(`Invalid or revoked share token accessed: ${token}`);
      return res.status(404).json({ 
        error: 'Share link not found or has been revoked',
        message: 'This share link may have expired or been disabled by the owner.'
      });
    }

    const folderDoc = snapshot.docs[0];
    const folderData = folderDoc.data();

    // Check if share has expired
    if (folderData.expiresAt && isExpired(folderData.expiresAt)) {
      logger.warn(`Expired share token accessed: ${token}`);
      return res.status(410).json({ 
        error: 'Share link has expired',
        message: 'This share link is no longer valid.'
      });
    }

    // Fetch all cards in the folder
    const cardIds = folderData.cardIds || [];
    if (cardIds.length === 0) {
      return res.json({
        folder: {
          name: folderData.name,
          description: folderData.description,
          cardCount: 0
        },
        cards: []
      });
    }

    // Fetch cards (decrypt if encrypted)
    const cardsSnapshot = await db.collection('cards')
      .where(admin.firestore.FieldPath.documentId(), 'in', cardIds)
      .get();

    const cards = await Promise.all(cardsSnapshot.docs.map(async (doc) => {
      let cardData = doc.data();

      // Decrypt card data if encryption is enabled
      // Always try to decrypt if encryption is enabled - decryptCardData checks individual field flags
      if (ENCRYPTION_ENABLED) {
        try {
          // Log before decryption (check if fields are encrypted)
          const hasEncryptedFields = cardData.cardNumber_encrypted || cardData.cvv_encrypted || cardData.expiryDate_encrypted;
          if (hasEncryptedFields) {
            logger.info(`Decrypting card ${doc.id} for public share (has encrypted fields)`);
          }
          
          cardData = decryptCardData(cardData);
          
          // Log after decryption (verify fields are now readable)
          if (hasEncryptedFields) {
            logger.info(`Card ${doc.id} decrypted successfully - cardNumber length: ${cardData.cardNumber?.length || 0}`);
          }
        } catch (error) {
          logger.error(`Failed to decrypt card ${doc.id} for public share:`, error);
          // Continue with partially decrypted data rather than skipping the card
        }
      } else {
        logger.warn('ENCRYPTION_ENABLED is false - cards will not be decrypted');
      }

      // Construct image URL - use decryption endpoint if image is encrypted
      let imageUrl = cardData.imageUrl || null;
      if (imageUrl && cardData.imageEncrypted) {
        // Use our public decryption endpoint instead of direct storage URL
        imageUrl = `${API_BASE_URL}/api/sharefolders/public/${token}/image/${doc.id}`;
      }

      // Return card data (including CVV as per user requirements)
      return {
        id: doc.id,
        type: cardData.type,
        cardName: cardData.cardName || null,
        cardNumber: cardData.cardNumber || null,
        cardHolderName: cardData.cardHolderName || null,
        expiryDate: cardData.expiryDate || null,
        cvv: cardData.cvv || null, // Include CVV as requested
        bank: cardData.bank || null,
        imageUrl: imageUrl,
        imageEncrypted: cardData.imageEncrypted || false,
        // Don't expose: userId, encrypted flag, timestamps
      };
    }));

    // Filter out any null cards (failed decryption)
    const validCards = cards.filter(card => card !== null);

    logger.info(`Public share accessed: ${token} (${validCards.length} cards)`);

    res.json({
      folder: {
        name: folderData.name,
        description: folderData.description,
        cardCount: validCards.length
      },
      cards: validCards
    });
  } catch (error) {
    logger.error('Error fetching public share:', error);
    res.status(500).json({ 
      error: 'Failed to load shared folder',
      message: 'An error occurred while loading this share.'
    });
  }
});

/**
 * GET /api/sharefolders/public/:token/image/:cardId
 * Get decrypted image for a shared card (PUBLIC - No authentication required)
 */
router.get('/public/:token/image/:cardId', async (req, res) => {
  try {
    const { token, cardId } = req.params;

    // Find folder by share token
    const snapshot = await db.collection('shareFolders')
      .where('shareToken', '==', token)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn(`Invalid share token for image request: ${token}`);
      return res.status(404).json({ error: 'Share link not found or has been revoked' });
    }

    const folderData = snapshot.docs[0].data();

    // Check if share has expired
    if (folderData.expiresAt && isExpired(folderData.expiresAt)) {
      logger.warn(`Expired share token for image request: ${token}`);
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Verify card is in the shared folder
    if (!folderData.cardIds || !folderData.cardIds.includes(cardId)) {
      logger.warn(`Card ${cardId} not in shared folder for token ${token}`);
      return res.status(403).json({ error: 'Card not in shared folder' });
    }

    // Get card document
    const cardDoc = await db.collection('cards').doc(cardId).get();
    if (!cardDoc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const cardData = cardDoc.data();

    // Check if card has an image
    if (!cardData.imageUrl) {
      return res.status(404).json({ error: 'Card has no image' });
    }

    // If image is not encrypted, redirect to Firebase Storage URL
    if (!cardData.imageEncrypted) {
      logger.info(`Serving unencrypted image for shared card ${cardId}`);
      return res.redirect(cardData.imageUrl);
    }

    // Decrypt and serve encrypted image
    if (ENCRYPTION_ENABLED) {
      try {
        logger.info(`Decrypting shared image for card: ${cardId}`);
        
        // Get bucket from storage
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        const bucket = admin.storage().bucket(bucketName);
        
        // Get decrypted image buffer
        const decryptedBuffer = await getDecryptedImageBuffer(bucket, cardData.imageUrl);
        
        // Serve as image with caching
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour (public share)
        res.send(decryptedBuffer);
        
        logger.info(`Shared image decrypted and served successfully for card ${cardId}`);
      } catch (decryptError) {
        logger.error('Shared image decryption failed:', decryptError.message);
        return res.status(500).json({ 
          error: 'Failed to decrypt image',
          message: 'Image decryption failed.'
        });
      }
    } else {
      return res.status(500).json({ 
        error: 'Encryption not configured',
        message: 'Image is encrypted but encryption key is not available.'
      });
    }
  } catch (error) {
    logger.error('Error serving shared card image:', error.message);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

module.exports = router;

