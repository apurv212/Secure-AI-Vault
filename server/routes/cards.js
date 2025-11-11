const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const { normalizeBankName } = require('../utils/bankNormalizer');
const router = express.Router();

const db = admin.firestore();

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
    let cards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt in memory (fallback if index not created)
    cards.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime; // Descending order
    });
    
    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
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
    res.json({ id: doc.id, ...data });
  } catch (error) {
    console.error('Error fetching card:', error);
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

    const cardData = {
      ...req.body,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('cards').add(cardData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating card:', error);
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

    const updateData = { ...req.body };

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

    await db.collection('cards').doc(req.params.id).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updated = await db.collection('cards').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const doc = await db.collection('cards').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('cards').doc(req.params.id).delete();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
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
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks', message: error.message });
  }
});

module.exports = router;

