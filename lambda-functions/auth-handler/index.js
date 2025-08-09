// ====================================
// AUTH HANDLER LAMBDA
// JWT validation and authorization for API Gateway
// ====================================

const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

// Environment configuration
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_zahTJOYu6';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_ISSUER = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`;

// Cache for JWKs
let cachedJWKs = null;
let cacheExpiry = 0;

// ====================================
// MAIN LAMBDA HANDLER (API Gateway Authorizer)
// ====================================

/**
 * Lambda authorizer for API Gateway
 * Expected to be used as a REQUEST authorizer
 */
exports.handler = async (event) => {
  try {
    console.log('Auth event:', JSON.stringify(event, null, 2));
    
    // Extract token from Authorization header
    const token = extractToken(event);
    
    if (!token) {
      console.log('No token found');
      return generatePolicy('user', 'Deny', event.methodArn);
    }
    
    // Verify the token
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      console.log('Token verification failed');
      return generatePolicy('user', 'Deny', event.methodArn);
    }
    
    // Generate Allow policy with user context
    const policy = generatePolicy(decoded.sub, 'Allow', event.methodArn);
    
    // Add user context for downstream Lambda functions
    policy.context = {
      userId: decoded.sub,
      email: decoded.email || '',
      username: decoded['cognito:username'] || decoded.sub,
      groups: JSON.stringify(decoded['cognito:groups'] || [])
    };
    
    console.log('Auth successful for user:', decoded.sub);
    return policy;
    
  } catch (error) {
    console.error('Auth handler error:', error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};

// ====================================
// TOKEN VALIDATION
// ====================================

/**
 * Extract token from event
 */
function extractToken(event) {
  // Check Authorization header
  if (event.headers?.Authorization) {
    const parts = event.headers.Authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  
  // Check authorization header (lowercase)
  if (event.headers?.authorization) {
    const parts = event.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  
  // Check authorizationToken (for TOKEN authorizer type)
  if (event.authorizationToken) {
    const parts = event.authorizationToken.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    return event.authorizationToken;
  }
  
  return null;
}

/**
 * Verify JWT token
 */
async function verifyToken(token) {
  try {
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    
    if (!decodedHeader) {
      console.log('Failed to decode token');
      return null;
    }
    
    const kid = decodedHeader.header.kid;
    
    // Get JWKs from Cognito
    const jwks = await getJWKs();
    
    // Find the right key
    const jwk = jwks.keys.find(key => key.kid === kid);
    
    if (!jwk) {
      console.log('JWK not found for kid:', kid);
      return null;
    }
    
    // Convert JWK to PEM
    const pem = jwkToPem(jwk);
    
    // Verify the token
    const decoded = jwt.verify(token, pem, {
      issuer: COGNITO_ISSUER,
      algorithms: ['RS256']
    });
    
    // Additional validations
    if (decoded.token_use !== 'id' && decoded.token_use !== 'access') {
      console.log('Invalid token_use:', decoded.token_use);
      return null;
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.log('Token expired');
      return null;
    }
    
    return decoded;
    
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
}

/**
 * Get JWKs from Cognito (with caching)
 */
async function getJWKs() {
  const now = Date.now();
  
  // Return cached JWKs if still valid (cache for 1 hour)
  if (cachedJWKs && cacheExpiry > now) {
    return cachedJWKs;
  }
  
  try {
    // Fetch JWKs from Cognito
    const jwksUrl = `${COGNITO_ISSUER}/.well-known/jwks.json`;
    const response = await axios.get(jwksUrl);
    
    // Cache the JWKs
    cachedJWKs = response.data;
    cacheExpiry = now + (60 * 60 * 1000); // 1 hour
    
    return cachedJWKs;
    
  } catch (error) {
    console.error('Error fetching JWKs:', error);
    throw error;
  }
}

// ====================================
// POLICY GENERATION
// ====================================

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(principalId, effect, resource) {
  const authResponse = {
    principalId
  };
  
  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    };
    authResponse.policyDocument = policyDocument;
  }
  
  return authResponse;
}

// ====================================
// ADDITIONAL AUTH FUNCTIONS
// ====================================

/**
 * Validate user permissions for specific resources
 * Can be called by other Lambda functions
 */
async function validateUserPermissions(token, requiredPermissions = []) {
  try {
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return { isValid: false, error: 'Invalid token' };
    }
    
    // Check if user has required permissions
    const userGroups = decoded['cognito:groups'] || [];
    const hasPermission = requiredPermissions.every(perm => 
      userGroups.includes(perm)
    );
    
    return {
      isValid: hasPermission,
      userId: decoded.sub,
      email: decoded.email,
      groups: userGroups
    };
    
  } catch (error) {
    console.error('Permission validation error:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Extract user context from token (for other services)
 */
async function getUserContext(token) {
  try {
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return null;
    }
    
    return {
      userId: decoded.sub,
      email: decoded.email || '',
      username: decoded['cognito:username'] || decoded.sub,
      groups: decoded['cognito:groups'] || [],
      attributes: decoded
    };
    
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

// ====================================
// EXPORTS
// ====================================

module.exports.validateUserPermissions = validateUserPermissions;
module.exports.getUserContext = getUserContext;
module.exports.verifyToken = verifyToken;

// ====================================
// LOCAL TESTING
// ====================================

if (require.main === module) {
  (async () => {
    // Test with a sample event
    const testEvent = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef/dev/GET/test',
      headers: {
        Authorization: 'Bearer YOUR_TEST_TOKEN_HERE'
      }
    };
    
    console.log('Testing auth handler...');
    const result = await exports.handler(testEvent);
    console.log('Result:', JSON.stringify(result, null, 2));
  })();
}