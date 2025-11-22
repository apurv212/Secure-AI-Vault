const { doubleCsrf } = require('csrf-csrf');
const logger = require('./secureLogger');

// Configure CSRF protection with double submit cookie pattern
const isProduction = process.env.NODE_ENV === 'production';

const {
  generateCsrfToken,      // Use this to generate a CSRF token
  doubleCsrfProtection,   // This is the middleware to protect routes
} = doubleCsrf({
  // Secret used to sign the CSRF tokens
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production',

  // Required in v4: unique identifier per "session" (we are stateless, so derive from request)
  // This keeps the library happy without introducing express-session.
  getSessionIdentifier: (req) => {
    // Prefer authenticated user id when available, otherwise fall back to IP + user agent
    const userId = req.user?.uid;
    if (userId) return `uid:${userId}`;
    const ua = req.headers['user-agent'] || 'unknown-agent';
    return `ip:${req.ip}|ua:${ua}`;
  },

  // Use __Host- prefix only in production (requires HTTPS)
  cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',     // Strict same-site policy
    path: '/',
    secure: isProduction,   // Secure only in production (requires HTTPS)
    httpOnly: true,         // Prevent XSS access
    maxAge: 3600000         // 1 hour
  },
  size: 64,                  // Token size
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't protect read-only methods
  getTokenFromRequest: (req) => {
    // Try to get token from header first, then from body
    return req.headers['x-csrf-token'] || req.body?.csrfToken;
  },
});

// Export the protection middleware
const csrfProtection = (req, res, next) => {
  // IMPORTANT: Paths here are relative to the `/api` mount in `index.js`.
  // Skip CSRF for:
  // - Auth endpoints (`/auth/*`) to avoid breaking login / token verification flow
  // - Public share endpoints (they use time-limited tokens instead)
  // - Health check
  // - CSRF token endpoint itself
  if (
    req.path.startsWith('/auth') || // e.g. `/auth/verify`
    req.path.includes('/sharefolders/shared/') ||
    req.path === '/health' ||
    req.path === '/csrf-token'
  ) {
    return next();
  }
  
  // Apply CSRF protection
  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      logger.warn('CSRF validation failed:', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        error: err.message
      });
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'Request blocked due to invalid security token. Please refresh the page and try again.'
      });
    }
    next();
  });
};

// Export token generator
const getCsrfToken = (req, res) => {
  try {
    // generateCsrfToken returns a token string and sets the cookie
    const token = generateCsrfToken(req, res);
    logger.debug('CSRF token generated successfully');
    return token;
  } catch (error) {
    logger.error('Failed to generate CSRF token:', error.message);
    logger.error('Error details:', error);
    throw error;
  }
};

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateCsrfToken
};

