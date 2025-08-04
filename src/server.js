const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./config/logger');
const webhookController = require('./controllers/webhookController');
const syncController = require('./controllers/syncController');
const tokenService = require('./services/tokenService');
const validators = require('./utils/validators');
const rateLimiters = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment variables on startup
const envValidation = validators.validateEnvironment();
if (!envValidation.valid) {
  logger.error('Environment validation failed:', envValidation.errors);
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors());

// Trust proxy (for Railway/Heroku/etc)
app.set('trust proxy', 1);

// Logging
app.use(morgan('combined', { 
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check with status rate limiting
app.get('/health', rateLimiters.statusRateLimit, (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Status endpoint
app.get('/status', rateLimiters.statusRateLimit, syncController.getStatus);

// Webhook endpoints with validation and rate limiting
app.post('/webhook/amocrm', 
  rateLimiters.webhookRateLimit,
  validators.webhookValidationMiddleware,
  webhookController.handleAmoCrmWebhook
);

// Manual sync endpoints with rate limiting
app.post('/sync/manual', 
  rateLimiters.syncRateLimit,
  syncController.manualSync
);

app.post('/sync/deal/:dealId', 
  rateLimiters.syncRateLimit,
  syncController.syncSpecificDeal
);

// Token management endpoints
app.post('/token/refresh', 
  rateLimiters.apiRateLimit,
  syncController.refreshToken
);

// Test endpoints
app.get('/test/google-sheets', 
  rateLimiters.apiRateLimit,
  syncController.testGoogleSheets
);

app.get('/test/amocrm', 
  rateLimiters.apiRateLimit,
  syncController.testAmoCrm
);

// Webhook health check
app.get('/webhook/health', 
  rateLimiters.statusRateLimit,
  webhookController.healthCheck
);

// Initialize token refresh cron job
tokenService.initTokenRefresh();

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 AMO-Evgenich webhook server started on port ${PORT}`);
  logger.info('🔗 Webhook URL: /webhook/amocrm');
  logger.info('📊 Health check: /health');
  logger.info('📈 Status: /status');
});

module.exports = app;
