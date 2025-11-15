const express = require('express');
const logger = require('../utils/secureLogger');

const router = express.Router();

const firebaseConfigKeys = {
  apiKey: ['PUBLIC_FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY'],
  authDomain: ['PUBLIC_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: ['PUBLIC_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'],
  storageBucket: ['PUBLIC_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: ['PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: ['PUBLIC_FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID']
};

const resolveFirebaseConfig = () => {
  const missingKeys = [];
  const config = Object.entries(firebaseConfigKeys).reduce((acc, [key, envKeys]) => {
    const value = envKeys
      .map((envKey) => process.env[envKey])
      .find((envValue) => typeof envValue === 'string' && envValue.trim().length > 0);

    if (!value) {
      missingKeys.push(key);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  if (missingKeys.length) {
    const error = new Error(`Missing Firebase client config for: ${missingKeys.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }

  return config;
};

router.get('/firebase', (req, res) => {
  try {
    const firebaseConfig = resolveFirebaseConfig();
    res.set('Cache-Control', 'no-store');
    res.json(firebaseConfig);
  } catch (error) {
    logger.error('Failed to provide Firebase client config:', error.message);
    res.status(error.statusCode || 500).json({
      error: 'Firebase client config unavailable',
      message: error.message
    });
  }
});

module.exports = router;


