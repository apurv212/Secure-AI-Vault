const express = require('express');
const admin = require('firebase-admin');
const logger = require('../utils/secureLogger');
const router = express.Router();

// Verify Firebase token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    res.json({ 
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    });
  } catch (error) {
    logger.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

