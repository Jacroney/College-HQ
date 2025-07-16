// ====================================
// DEPENDENCIES AND CONFIGURATION
// ====================================

// AWS SDK and environment configuration
const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS region
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

// AWS service clients
const dynamodb = new AWS.DynamoDB.DocumentClient();

// DynamoDB table names
const USERS_TABLE = process.env.USERS_TABLE || 'college-hq-users';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

/**
 * Main Lambda function handler for profile operations
 * Handles GET and PUT requests for user profiles
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response object
 */
exports.handler = async (event) => {
  try {
    const { httpMethod, pathParameters } = event;
    const userId = pathParameters?.userId;
    
    // Validate required userId parameter
    if (!userId) {
      return createResponse(400, { error: 'Missing userId in path parameters' });
    }

    // Route to appropriate handler based on HTTP method
    switch (httpMethod) {
      case 'GET':
        return await getProfile(userId);
      case 'PUT':
        return await updateProfile(userId, event);
      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// PROFILE OPERATIONS
// ====================================

/**
 * Get user profile from DynamoDB
 * Creates default profile if user doesn't exist
 * @param {string} userId - User identifier
 * @returns {Object} HTTP response with profile data
 */
async function getProfile(userId) {
  try {
    // Mock mode for local testing
    if (process.env.MOCK_MODE === 'true') {
      const defaultProfile = createDefaultProfile(userId);
      return createResponse(200, { profile: defaultProfile });
    }
    
    // Query DynamoDB for user profile
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    
    const result = await dynamodb.get(params).promise();
    
    // Create default profile if user doesn't exist
    if (!result.Item) {
      const defaultProfile = createDefaultProfile(userId);
      await saveProfile(userId, defaultProfile);
      return createResponse(200, { profile: defaultProfile });
    }
    
    return createResponse(200, { profile: result.Item });
  } catch (error) {
    console.error('Error getting profile:', error);
    return createResponse(500, { error: 'Failed to get profile' });
  }
}

/**
 * Update user profile in DynamoDB
 * @param {string} userId - User identifier
 * @param {Object} event - Lambda event object containing profile data
 * @returns {Object} HTTP response with updated profile
 */
async function updateProfile(userId, event) {
  try {
    const body = JSON.parse(event.body);
    const profileData = {
      user_id: userId,
      ...body,
      updated_at: new Date().toISOString()
    };
    
    // Mock mode for local testing
    if (process.env.MOCK_MODE === 'true') {
      console.log('Mock mode: Profile would be saved:', profileData);
      return createResponse(200, { 
        message: 'Profile updated successfully (mock mode)',
        profile: profileData
      });
    }
    
    // Save profile to DynamoDB
    await saveProfile(userId, profileData);
    
    return createResponse(200, { 
      message: 'Profile updated successfully',
      profile: profileData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return createResponse(500, { error: 'Failed to update profile' });
  }
}

/**
 * Save profile data to DynamoDB
 * @param {string} userId - User identifier
 * @param {Object} profileData - Profile data to save
 */
async function saveProfile(userId, profileData) {
  const params = {
    TableName: USERS_TABLE,
    Item: {
      user_id: userId,
      ...profileData,
      created_at: profileData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
  
  await dynamodb.put(params).promise();
}

/**
 * Create default profile structure for new users
 * @param {string} userId - User identifier
 * @returns {Object} Default profile object
 */
function createDefaultProfile(userId) {
  return {
    user_id: userId,
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    university: null,
    college: '',
    major: '',
    concentration: '',
    minor: '',
    academicYear: '',
    expectedGraduation: '',
    gpa: 0,
    totalCredits: 0,
    currentSemesterCredits: 0,
    careerGoals: [],
    learningStyle: '',
    academicInterests: [],
    advisorName: '',
    advisorEmail: '',
    advisorNotes: '',
    completedCourses: [],
    currentCourses: [],
    plannedCourses: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Create standardized HTTP response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body object
 * @returns {Object} HTTP response object
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
};

// ====================================
// LOCAL TESTING
// ====================================

/**
 * Local testing functionality
 * Only runs when this file is executed directly
 * Tests both GET and PUT profile operations
 */
if (require.main === module) {
  (async () => {
    // Enable mock mode for local testing
    process.env.MOCK_MODE = 'true';
    
    // Test GET profile operation
    const getEvent = {
      httpMethod: 'GET',
      pathParameters: { userId: 'test-user-123' }
    };
    
    console.log('Testing GET profile...');
    const getResult = await exports.handler(getEvent);
    console.log('GET result:', JSON.stringify(getResult, null, 2));
    
    // Test PUT profile operation
    const putEvent = {
      httpMethod: 'PUT',
      pathParameters: { userId: 'test-user-123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@calpoly.edu',
        studentId: '12345',
        university: {
          name: 'Cal Poly San Luis Obispo',
          domain: 'calpoly.edu',
          country: 'USA'
        },
        major: 'Computer Science',
        academicYear: 'Junior',
        gpa: 3.5,
        totalCredits: 90,
        currentSemesterCredits: 16,
        completedCourses: ['CSC 101', 'CSC 202'],
        currentCourses: ['CSC 203', 'CSC 225'],
        plannedCourses: ['CSC 348']
      })
    };
    
    console.log('\nTesting PUT profile...');
    const putResult = await exports.handler(putEvent);
    console.log('PUT result:', JSON.stringify(putResult, null, 2));
  })();
}