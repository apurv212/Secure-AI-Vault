const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');
const helmet = require('helmet');
const logger = require('./utils/secureLogger');
const { generalLimiter, authLimiter, extractionLimiter, cardOperationsLimiter } = require('./utils/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Restrict to specific origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
    ];
    
    // Allow requests with no origin (health checks, direct API calls, server-to-server)
    // This is safe and necessary for Render health checks and direct API access
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' })); // Add size limit to prevent DoS attacks (20MB for compressed images)
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline styles for React
        "https://fonts.googleapis.com" // Google Fonts
      ],
      scriptSrc: ["'self'"],
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:",
        "https://firebasestorage.googleapis.com", // Firebase Storage
        "https://*.googleapis.com"
      ],
      connectSrc: [
        "'self'",
        "https://firebasestorage.googleapis.com",
        "https://*.googleapis.com",
        "https://identitytoolkit.googleapis.com", // Firebase Auth
        "https://securetoken.googleapis.com", // Firebase Auth
        "https://*.firebaseio.com", // Firebase Realtime Database (if used)
        "https://*.cloudfunctions.net", // Firebase Cloud Functions (if used)
        "wss://*.firebaseio.com", // WebSocket connections for Firebase
        process.env.CLIENT_URL || 'http://localhost:3000'
      ],
      fontSrc: [
        "'self'", 
        "data:",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com" // Google Fonts CDN
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Firebase Storage compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources from Firebase
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true, // X-Content-Type-Options: nosniff
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

logger.info('🛡️  Security headers enabled with Helmet');

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Initialize Firebase Admin
try {
  // Use environment variables instead of JSON file for security
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: 'googleapis.com'
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  
  logger.system('✅ Firebase Admin initialized successfully');
  logger.info('Storage bucket configured');
} catch (error) {
  logger.error('Firebase Admin initialization error:', error.message);
  logger.error('Please ensure all FIREBASE_* environment variables are set in .env file');
  process.exit(1); // Exit if Firebase fails to initialize
}

// Routes with specific rate limiters
// Auth routes have strict rate limiting to prevent brute force attacks
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Card routes have moderate rate limiting to prevent spam
app.use('/api/cards', cardOperationsLimiter, require('./routes/cards'));

// Extract routes have strict rate limiting due to expensive AI API calls
app.use('/api/extract', extractionLimiter, require('./routes/extract'));

// Share folder routes (authenticated + public endpoints)
app.use('/api/sharefolders', cardOperationsLimiter, require('./routes/sharefolders'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve static files from client-build (for production deployment)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, 'client-build');
  
  // Serve static files
  app.use(express.static(clientBuildPath));
  
  // Handle React routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
  
  logger.system('📦 Serving static frontend from client-build/');
}

app.listen(PORT, () => {
  logger.system(`🚀 Server running on port ${PORT}`);
  logger.system(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.system(`🔐 CORS allowed origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

