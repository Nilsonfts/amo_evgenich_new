const winston = require('winston');
const path = require('path');

// Создаем папку для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: { 
    service: 'amo-evgenich-webhook',
    environment: process.env.NODE_ENV || 'production'
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Webhook-specific logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'webhook.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    )
  }));
}

// Function to log webhook events specifically
logger.webhook = (event, data) => {
  logger.info(`WEBHOOK_${event.toUpperCase()}`, {
    event,
    timestamp: new Date().toISOString(),
    data: typeof data === 'object' ? JSON.stringify(data) : data
  });
};

// Function to log AMO CRM API calls
logger.amoApi = (method, url, status, data) => {
  logger.info('AMO_API_CALL', {
    method,
    url,
    status,
    timestamp: new Date().toISOString(),
    data: data ? JSON.stringify(data) : null
  });
};

// Function to log Google Sheets operations
logger.googleSheets = (operation, sheetId, range, data) => {
  logger.info('GOOGLE_SHEETS_OPERATION', {
    operation,
    sheetId,
    range,
    timestamp: new Date().toISOString(),
    data: data ? JSON.stringify(data) : null
  });
};

// Function to log token refresh operations
logger.tokenRefresh = (success, details) => {
  logger.info('TOKEN_REFRESH', {
    success,
    timestamp: new Date().toISOString(),
    details
  });
};

module.exports = logger;
