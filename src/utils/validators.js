const logger = require('../config/logger');

/**
 * Validation functions for webhook data and API requests
 */

/**
 * Validate AMO CRM webhook payload
 */
function validateWebhookPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { valid: false, errors };
  }

  // Check for leads array
  if (!payload.leads) {
    errors.push('Missing leads data');
  } else if (!Array.isArray(payload.leads)) {
    errors.push('Leads must be an array');
  } else if (payload.leads.length === 0) {
    errors.push('Leads array is empty');
  } else {
    // Validate each lead
    payload.leads.forEach((lead, index) => {
      const leadErrors = validateLead(lead, `leads[${index}]`);
      errors.push(...leadErrors);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate individual lead data
 */
function validateLead(lead, prefix = 'lead') {
  const errors = [];

  if (!lead || typeof lead !== 'object') {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  // Check required fields
  if (!lead.id) {
    errors.push(`${prefix}.id is required`);
  } else if (!Number.isInteger(lead.id) && !Number.isInteger(parseInt(lead.id))) {
    errors.push(`${prefix}.id must be a valid integer`);
  }

  // Optional validations
  if (lead.name && typeof lead.name !== 'string') {
    errors.push(`${prefix}.name must be a string`);
  }

  if (lead.price && !Number.isFinite(lead.price) && !Number.isFinite(parseFloat(lead.price))) {
    errors.push(`${prefix}.price must be a valid number`);
  }

  if (lead.status_id && !Number.isInteger(lead.status_id) && !Number.isInteger(parseInt(lead.status_id))) {
    errors.push(`${prefix}.status_id must be a valid integer`);
  }

  if (lead.pipeline_id && !Number.isInteger(lead.pipeline_id) && !Number.isInteger(parseInt(lead.pipeline_id))) {
    errors.push(`${prefix}.pipeline_id must be a valid integer`);
  }

  return errors;
}

/**
 * Validate deal data before sending to Google Sheets
 */
function validateDealForSheets(dealData) {
  const errors = [];

  if (!dealData || typeof dealData !== 'object') {
    errors.push('Deal data must be an object');
    return { valid: false, errors };
  }

  // Check required fields
  if (!dealData.id) {
    errors.push('Deal ID is required');
  }

  if (!dealData.name || typeof dealData.name !== 'string') {
    errors.push('Deal name is required and must be a string');
  }

  // Validate price
  if (dealData.price !== undefined && dealData.price !== null) {
    if (!Number.isFinite(dealData.price) && !Number.isFinite(parseFloat(dealData.price))) {
      errors.push('Deal price must be a valid number');
    }
  }

  // Validate dates
  if (dealData.created_at && !isValidDate(dealData.created_at)) {
    errors.push('Deal created_at must be a valid date');
  }

  if (dealData.updated_at && !isValidDate(dealData.updated_at)) {
    errors.push('Deal updated_at must be a valid date');
  }

  // Validate email if present
  if (dealData.contact_email && !isValidEmail(dealData.contact_email)) {
    errors.push('Contact email must be a valid email address');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate manual sync request
 */
function validateSyncRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return { valid: false, errors };
  }

  if (!body.dealId) {
    errors.push('dealId is required');
  } else if (!Number.isInteger(body.dealId) && !Number.isInteger(parseInt(body.dealId))) {
    errors.push('dealId must be a valid integer');
  }

  if (body.force !== undefined && typeof body.force !== 'boolean') {
    errors.push('force parameter must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const errors = [];
  const requiredVars = [
    'AMO_DOMAIN',
    'AMO_CLIENT_ID',
    'AMO_CLIENT_SECRET',
    'AMO_REFRESH_TOKEN',
    'GOOGLE_CREDENTIALS',
    'GOOGLE_SHEET_ID'
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate AMO_DOMAIN format
  if (process.env.AMO_DOMAIN && !process.env.AMO_DOMAIN.includes('.amocrm.')) {
    errors.push('AMO_DOMAIN must be a valid AMO CRM domain (*.amocrm.ru or *.amocrm.com)');
  }

  // Validate Google credentials JSON
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      if (!creds.client_email || !creds.private_key) {
        errors.push('GOOGLE_CREDENTIALS must contain client_email and private_key');
      }
    } catch {
      errors.push('GOOGLE_CREDENTIALS must be valid JSON');
    }
  }

  // Validate Google Sheet ID format
  if (process.env.GOOGLE_SHEET_ID && !/^[a-zA-Z0-9-_]{44}$/.test(process.env.GOOGLE_SHEET_ID)) {
    logger.warn('GOOGLE_SHEET_ID format may be incorrect (expected 44 character string)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to validate date
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Helper function to validate email
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Sanitize webhook payload for logging (remove sensitive data)
 */
function sanitizeForLogging(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  
  const sanitized = JSON.parse(JSON.stringify(payload));
  
  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  function removeSensitiveData(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData);
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = removeSensitiveData(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
  
  return removeSensitiveData(sanitized);
}

/**
 * Express middleware for webhook validation
 */
function webhookValidationMiddleware(req, res, next) {
  const validation = validateWebhookPayload(req.body);
  
  if (!validation.valid) {
    logger.warn('Invalid webhook payload received:', {
      errors: validation.errors,
      payload: sanitizeForLogging(req.body),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      error: 'Invalid payload',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Express middleware for sync request validation
 */
function syncValidationMiddleware(req, res, next) {
  const validation = validateSyncRequest(req.body);
  
  if (!validation.valid) {
    logger.warn('Invalid sync request received:', {
      errors: validation.errors,
      body: req.body,
      ip: req.ip
    });
    
    return res.status(400).json({
      error: 'Invalid request',
      details: validation.errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

module.exports = {
  validateWebhookPayload,
  validateLead,
  validateDealForSheets,
  validateSyncRequest,
  validateEnvironment,
  isValidDate,
  isValidEmail,
  sanitizeForLogging,
  webhookValidationMiddleware,
  syncValidationMiddleware
};
