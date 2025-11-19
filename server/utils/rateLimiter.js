/**
 * Rate Limiting Configuration
 * Prevents abuse, brute force attacks, and API overuse
 */

const rateLimit = require('express-rate-limit');
const logger = require('./secureLogger');

/**
 * General API rate limiter
 * Applies to all API endpoints unless overridden
 * Allows 500 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    retryAfter: 900 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force login attacks
 * Allows only 5 attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the maximum number of login attempts. Please try again after 15 minutes.',
      retryAfter: 900
    });
  }
});

/**
 * Strict rate limiter for AI extraction endpoint
 * Prevents abuse of expensive AI API calls (Gemini)
 * Allows 50 extractions per hour per user
 * 
 * Note: This uses IP-based limiting. For user-specific limiting,
 * apply this after authentication middleware sets req.user
 */
const extractionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Only 50 extractions per hour
  message: {
    error: 'Too many extraction requests',
    message: 'You can only perform 50 card extractions per hour',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Extraction rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.uid || 'unknown',
      path: req.path
    });
    res.status(429).json({
      error: 'Too many extraction requests',
      message: 'You have reached the maximum number of card extractions (50 per hour). This limit helps us manage costs and prevent abuse.',
      retryAfter: 3600, // 1 hour in seconds
      remainingTime: '1 hour'
    });
  }
  // Using default IP-based key generator
  // To use user ID, implement custom store with Redis
});

/**
 * Moderate rate limiter for file upload operations
 * Prevents storage abuse
 * Allows 100 uploads per hour
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    error: 'Too many upload requests',
    message: 'You can only upload 50 files per hour',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.uid || 'unknown'
    });
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'You have reached the maximum number of file uploads (50 per hour).',
      retryAfter: 3600
    });
  }
});

/**
 * Strict rate limiter for card operations (CRUD)
 * Prevents rapid card creation/deletion spam
 * Allows 200 operations per 15 minutes
 */
const cardOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 operations per 15 minutes
  message: {
    error: 'Too many card operations',
    message: 'Please slow down. You can perform up to 200 card operations every 15 minutes',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Card operations rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.uid || 'unknown',
      method: req.method,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many card operations',
      message: 'You are performing too many operations. Please wait a few minutes and try again.',
      retryAfter: 900
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  extractionLimiter,
  uploadLimiter,
  cardOperationsLimiter
};

