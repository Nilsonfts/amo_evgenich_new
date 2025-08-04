/**
 * Helper functions for data processing and validation
 */

/**
 * Safely get nested object property
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Format timestamp to ISO string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  try {
    // Handle Unix timestamp (seconds)
    if (typeof timestamp === 'number' && timestamp < 1e12) {
      return new Date(timestamp * 1000).toISOString();
    }
    // Handle Unix timestamp (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    // Handle string
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Format money amount
 */
function formatMoney(amount, currency = 'RUB') {
  if (!amount || isNaN(amount)) return 0;
  
  try {
    return parseFloat(amount);
  } catch {
    return 0;
  }
}

/**
 * Clean phone number
 */
function cleanPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with 8, replace with +7
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    return '+7' + cleaned.slice(1);
  }
  
  // If starts with 7 and has 11 digits, add +
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  // If doesn't start with +, add it
  if (cleaned.length > 0 && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 255) {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize string for Google Sheets (remove newlines, etc.)
 */
function sanitizeForSheets(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[\r\n\t]/g, ' ')  // Replace line breaks and tabs with spaces
    .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
    .trim();                    // Remove leading/trailing whitespace
}

/**
 * Extract custom field value from AMO CRM custom fields array
 */
function extractCustomFieldValue(customFields, fieldCode, fieldName = null) {
  if (!customFields || !Array.isArray(customFields)) return '';
  
  const field = customFields.find(f => 
    f.field_code === fieldCode || 
    (fieldName && f.field_name === fieldName)
  );
  
  if (!field || !field.values || !Array.isArray(field.values) || field.values.length === 0) {
    return '';
  }
  
  return field.values[0].value || '';
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Wait for specified milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if running in production
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if debug mode is enabled
 */
function isDebugMode() {
  return process.env.DEBUG_SKIP_FILTER === 'true' || process.env.NODE_ENV === 'development';
}

module.exports = {
  safeGet,
  formatTimestamp,
  formatMoney,
  cleanPhoneNumber,
  isValidEmail,
  truncateText,
  sanitizeForSheets,
  extractCustomFieldValue,
  retryWithBackoff,
  isEmpty,
  deepClone,
  generateId,
  delay,
  formatFileSize,
  isProduction,
  isDebugMode
};
