/**
 * Secure Logger Utility
 * Prevents logging of sensitive data like card numbers, CVVs, tokens, etc.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Patterns to detect and redact sensitive information
const SENSITIVE_PATTERNS = [
  // Card numbers (13-19 digits)
  { pattern: /\b\d{13,19}\b/g, replacement: '[CARD_REDACTED]' },
  // CVV (3-4 digits after common CVV keywords)
  { pattern: /\b(cvv|cvc|security code|cid)[\s:=]+\d{3,4}\b/gi, replacement: '$1: [CVV_REDACTED]' },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  // Bearer tokens
  { pattern: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g, replacement: 'Bearer [TOKEN_REDACTED]' },
  // API keys (common patterns)
  { pattern: /\b(api[_-]?key|apikey|key)[\s:=]+['"]?[\w-]{20,}['"]?/gi, replacement: '$1: [KEY_REDACTED]' },
  // Private keys
  { pattern: /-----BEGIN [A-Z\s]+PRIVATE KEY-----[\s\S]*?-----END [A-Z\s]+PRIVATE KEY-----/g, replacement: '[PRIVATE_KEY_REDACTED]' },
];

// Fields that should always be redacted in objects
const SENSITIVE_FIELDS = [
  'cardNumber',
  'cvv',
  'cvc',
  'password',
  'token',
  'apiKey',
  'private_key',
  'privateKey',
  'private_key_id',
  'client_id',
  'authorization'
];

/**
 * Sanitize a value by removing sensitive information
 * @param {any} value - Value to sanitize
 * @returns {any} Sanitized value
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    let sanitized = value;
    SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement);
    });
    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      // Check if field name indicates sensitive data
      const isSensitiveField = SENSITIVE_FIELDS.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitiveField) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Format arguments for logging
 * @param {any[]} args - Arguments to format
 * @returns {any[]} Formatted arguments
 */
function formatArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'object') {
      try {
        // Try to sanitize objects
        return sanitizeValue(arg);
      } catch (e) {
        return '[Object - Unable to sanitize]';
      }
    }
    return sanitizeValue(arg);
  });
}

/**
 * Secure logger object
 */
const logger = {
  /**
   * Log info level messages
   * Only logs in development, sanitizes in production
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...formatArgs(args));
    }
  },

  /**
   * Log warning messages
   * Logs in all environments but sanitizes sensitive data
   */
  warn: (...args) => {
    console.warn('[WARN]', ...formatArgs(args));
  },

  /**
   * Log error messages
   * Logs in all environments but sanitizes sensitive data
   */
  error: (...args) => {
    console.error('[ERROR]', ...formatArgs(args));
  },

  /**
   * Log debug messages
   * Only logs in development with DEBUG env var
   */
  debug: (...args) => {
    if (isDevelopment && process.env.DEBUG) {
      console.log('[DEBUG]', ...formatArgs(args));
    }
  },

  /**
   * Log startup/system messages
   * Logs in all environments (no sensitive data expected)
   */
  system: (...args) => {
    console.log('[SYSTEM]', ...args);
  },

  /**
   * Log HTTP request (sanitized)
   */
  http: (method, path, status) => {
    if (isDevelopment) {
      console.log(`[HTTP] ${method} ${path} - ${status}`);
    }
  }
};

module.exports = logger;

