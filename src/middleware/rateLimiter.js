const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Rate limiter for webhook endpoints
 */
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many webhook requests',
    retryAfter: '1 minute',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + User-Agent for more specific rate limiting
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit exceeded for webhook:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
  }
});

/**
 * Rate limiter for API endpoints
 */
const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: {
    error: 'Too many API requests',
    retryAfter: '1 minute',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip;
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit exceeded for API:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
  }
});

/**
 * Rate limiter for manual sync endpoints (more restrictive)
 */
const syncRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per 5 minutes
  message: {
    error: 'Too many sync requests',
    retryAfter: '5 minutes',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit exceeded for sync:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
  }
});

/**
 * Rate limiter for status/health endpoints (very permissive)
 */
const statusRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: {
    error: 'Too many status requests',
    retryAfter: '1 minute',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  webhookRateLimit,
  apiRateLimit,
  syncRateLimit,
  statusRateLimit
};
