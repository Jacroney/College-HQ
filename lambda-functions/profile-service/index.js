// ====================================
// PROFILE SERVICE LAMBDA
// User profile CRUD operations
// ====================================

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Configure DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// DynamoDB table name
const USERS_TABLE = process.env.USERS_TABLE || 'college-hq-users';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

exports.handler = async (event) => {
  try {
    const { httpMethod, pathParameters, body, requestContext } = event;
    
    // Get userId from path parameters or from authorizer context
    const userId = pathParameters?.userId || requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createResponse(400, { error: 'Missing userId' });
    }

    // Route based on HTTP method
    switch (httpMethod) {
      case 'GET':
        return await getProfile(userId);
        
      case 'PUT':
        return await updateProfile(userId, body);
        
      case 'POST':
        return await createProfile(userId, body);
        
      case 'DELETE':
        return await deleteProfile(userId);
        
      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile service error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// PROFILE OPERATIONS
// ====================================

/**
 * Get user profile
 */
async function getProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    
    const result = await dynamodb.send(new GetCommand(params));
    
    // Create default profile if user doesn't exist
    if (!result.Item) {
      const defaultProfile = createDefaultProfile(userId);
      await saveProfile(defaultProfile);
      return createResponse(200, { profile: defaultProfile });
    }
    
    return createResponse(200, { profile: result.Item });
  } catch (error) {
    console.error('Error getting profile:', error);
    return createResponse(500, { error: 'Failed to get profile' });
  }
}

/**
 * Update user profile
 */
async function updateProfile(userId, body) {
  try {
    const profileData = JSON.parse(body || '{}');
    
    // Don't allow updating user_id
    delete profileData.user_id;
    
    const updatedProfile = {
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    };
    
    await saveProfile(updatedProfile);
    
    return createResponse(200, { 
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return createResponse(500, { error: 'Failed to update profile' });
  }
}

/**
 * Create new user profile
 */
async function createProfile(userId, body) {
  try {
    const profileData = JSON.parse(body || '{}');
    
    // Check if profile already exists
    const existing = await getProfileData(userId);
    if (existing) {
      return createResponse(409, { error: 'Profile already exists' });
    }
    
    const newProfile = {
      user_id: userId,
      ...profileData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await saveProfile(newProfile);
    
    return createResponse(201, {
      message: 'Profile created successfully',
      profile: newProfile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return createResponse(500, { error: 'Failed to create profile' });
  }
}

/**
 * Delete user profile
 */
async function deleteProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    
    await dynamodb.send(new DeleteCommand(params));
    
    return createResponse(200, {
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return createResponse(500, { error: 'Failed to delete profile' });
  }
}

// ====================================
// DATABASE OPERATIONS
// ====================================

/**
 * Get profile data from DynamoDB
 */
async function getProfileData(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    const result = await dynamodb.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error('Error getting profile data:', error);
    return null;
  }
}

/**
 * Save profile to DynamoDB
 */
async function saveProfile(profileData) {
  const params = {
    TableName: USERS_TABLE,
    Item: {
      ...profileData,
      updated_at: new Date().toISOString()
    }
  };
  
  await dynamodb.send(new PutCommand(params));
}

/**
 * Create default profile structure
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
// BATCH OPERATIONS (for other services)
// ====================================

/**
 * Get multiple profiles (for admin or batch operations)
 */
async function getProfiles(userIds) {
  try {
    const keys = userIds.map(userId => ({ user_id: userId }));
    
    const params = {
      RequestItems: {
        [USERS_TABLE]: {
          Keys: keys
        }
      }
    };
    
    const result = await dynamodb.batchGet(params).promise();
    return result.Responses[USERS_TABLE] || [];
  } catch (error) {
    console.error('Error getting profiles:', error);
    return [];
  }
}

/**
 * Search profiles by criteria
 */
async function searchProfiles(criteria) {
  try {
    const { university, major, academicYear } = criteria;
    
    let filterExpression = [];
    let expressionAttributeValues = {};
    
    if (university) {
      filterExpression.push('university = :university');
      expressionAttributeValues[':university'] = university;
    }
    
    if (major) {
      filterExpression.push('major = :major');
      expressionAttributeValues[':major'] = major;
    }
    
    if (academicYear) {
      filterExpression.push('academicYear = :academicYear');
      expressionAttributeValues[':academicYear'] = academicYear;
    }
    
    const params = {
      TableName: USERS_TABLE,
      FilterExpression: filterExpression.join(' AND '),
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error searching profiles:', error);
    return [];
  }
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Create standardized HTTP response
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
}

// ====================================
// EXPORTS FOR OTHER SERVICES
// ====================================

module.exports.getProfileData = getProfileData;
module.exports.getProfiles = getProfiles;
module.exports.searchProfiles = searchProfiles;

// ====================================
// LOCAL TESTING
// ====================================

if (require.main === module) {
  (async () => {
    // Enable mock mode for local testing
    process.env.MOCK_MODE = 'true';
    
    // Test GET profile
    const getEvent = {
      httpMethod: 'GET',
      pathParameters: { userId: 'test-user-123' }
    };
    
    console.log('Testing GET profile...');
    const getResult = await exports.handler(getEvent);
    console.log('GET result:', JSON.stringify(getResult, null, 2));
    
    // Test PUT profile
    const putEvent = {
      httpMethod: 'PUT',
      pathParameters: { userId: 'test-user-123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@calpoly.edu',
        major: 'Computer Science',
        academicYear: 'Junior'
      })
    };
    
    console.log('\nTesting PUT profile...');
    const putResult = await exports.handler(putEvent);
    console.log('PUT result:', JSON.stringify(putResult, null, 2));
  })();
}