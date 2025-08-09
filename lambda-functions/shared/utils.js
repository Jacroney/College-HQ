// ====================================
// SHARED UTILITIES
// Common functions used across Lambda services
// ====================================

/**
 * Create standardized HTTP response for API Gateway
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body object
 * @returns {Object} API Gateway response object
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Parse request body safely
 * @param {string} body - Request body string
 * @returns {Object} Parsed object or empty object
 */
function parseRequestBody(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch (error) {
    return {};
  }
}

/**
 * Generate unique conversation ID
 * @returns {string} Unique conversation identifier
 */
function generateConversationId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

/**
 * Get university key for database lookups
 * @param {string|Object} university - University name or object
 * @returns {string} Standardized university key
 */
function getUniversityKey(university) {
  if (typeof university === 'object' && university.name) {
    university = university.name;
  }
  
  const universityLower = university.toLowerCase();
  if (universityLower.includes('cal poly') || universityLower.includes('california polytechnic')) {
    return 'calpoly';
  }
  
  // Default to generic key based on university name
  return university.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Extract course codes mentioned in text
 * @param {string} text - Text to search for course codes
 * @returns {Array} Array of course codes found
 */
function extractCourseCodesFromText(text) {
  const coursePattern = /([A-Z]{2,4})\s*(\d{3})/gi;
  const matches = text.match(coursePattern) || [];
  return matches.map(match => match.replace(/\s+/g, ''));
}

/**
 * Remove duplicates from array based on property
 * @param {Array} array - Array to deduplicate
 * @param {string} property - Property to check for uniqueness
 * @returns {Array} Array with duplicates removed
 */
function removeDuplicatesByProperty(array, property) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[property];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Validate required environment variables
 * @param {Array} requiredVars - Array of required variable names
 * @throws {Error} If any required variables are missing
 */
function validateEnvironment(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function or throws last error
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

module.exports = {
  createResponse,
  parseRequestBody,
  generateConversationId,
  getUniversityKey,
  extractCourseCodesFromText,
  removeDuplicatesByProperty,
  validateEnvironment,
  sleep,
  retryWithBackoff
};