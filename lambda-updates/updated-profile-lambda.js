const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

// AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

// Table names
const USERS_TABLE = process.env.USERS_TABLE || 'college-hq-users';
const DEGREE_REQUIREMENTS_TABLE = process.env.DEGREE_REQUIREMENTS_TABLE || 'college-hq-degree-requirements';

// Cognito configuration - ADD THESE TO YOUR LAMBDA ENVIRONMENT VARIABLES
const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// Cache for Cognito public keys
let cognitoKeys = null;

exports.handler = async (event) => {
  console.log('Profile Lambda Event:', JSON.stringify(event, null, 2));

  try {
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    // NEW: Extract and validate Cognito JWT token
    const userInfo = await extractUserFromToken(event);
    if (!userInfo) {
      return createResponse(401, { error: 'Unauthorized - Invalid or missing token' });
    }
    
    // Use Cognito sub as userId
    const userId = userInfo.sub;
    console.log(`Authenticated user: ${userId} (${userInfo.email})`);

    // Parse request body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }
    }

    // NEW: Check if this is a course lookup request
    if (httpMethod === 'POST' && body.action === 'getCourses') {
      return await getCourses(body);
    }

    // Profile endpoints using Cognito sub as userId
    switch (httpMethod) {
      case 'GET':
        return await getProfile(userId, userInfo);
      case 'POST':
      case 'PUT':
        return await saveProfile(userId, body, userInfo);
      default:
        return createResponse(405, { error: `Method ${httpMethod} not allowed` });
    }

  } catch (error) {
    console.error('Profile Lambda Error:', error);
    return createResponse(500, { error: 'Internal server error', details: error.message });
  }
};

// NEW: Extract user information from Cognito JWT token
async function extractUserFromToken(event) {
  try {
    // Get Authorization header
    const headers = event.headers || {};
    const authHeader = headers.Authorization || headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid Authorization header found');
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get Cognito public keys
    if (!cognitoKeys) {
      const https = require('https');
      const jwksUrl = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
      
      cognitoKeys = await new Promise((resolve, reject) => {
        https.get(jwksUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    }
    
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) {
      console.log('Failed to decode token header');
      return null;
    }
    
    const kid = decodedHeader.header.kid;
    
    // Find the correct key
    const key = cognitoKeys.keys.find(k => k.kid === kid);
    if (!key) {
      console.log(`No matching key found for kid: ${kid}`);
      return null;
    }
    
    // Convert JWK to PEM
    const pem = jwkToPem(key);
    
    // Verify and decode token
    const payload = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      audience: COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
    });
    
    console.log(`Successfully validated token for user: ${payload.sub}`);
    return payload;
    
  } catch (error) {
    console.error('JWT validation error:', error.message);
    return null;
  }
}

// Get courses for a specific university and major (unchanged)
async function getCourses(requestBody) {
  try {
    const { university, major } = requestBody;
    
    if (!university || !major) {
      return createResponse(400, { error: 'University and major are required' });
    }
    
    console.log(`Looking up courses for ${university} - ${major}`);
    
    // Create the lookup key (same format as your scraper)
    let universityKey = university.toLowerCase();
    if (universityKey.includes('cal poly') || universityKey.includes('california polytechnic')) {
      universityKey = 'calpoly';
    } else {
      universityKey = universityKey.replace(/\s+/g, '');
    }
    
    const majorKey = major.toLowerCase().replace(/\s+/g, '_');
    const universityMajorId = `${universityKey}_${majorKey}`;
    
    console.log(`Lookup key: ${universityMajorId}`);
    
    const command = new GetCommand({
      TableName: DEGREE_REQUIREMENTS_TABLE,
      Key: { university_major_id: universityMajorId }
    });
    
    const result = await dynamodb.send(command);
    
    if (!result.Item) {
      return createResponse(404, { 
        error: 'Degree requirements not found',
        requestedId: universityMajorId,
        message: `No course data found for ${major} at ${university}`,
        availablePrograms: ['calpoly_computer_science', 'calpoly_software_engineering'] 
      });
    }
    
    // Extract courses and format for frontend
    const majorCourses = result.Item.requirements?.major_courses?.courses || [];
    const supportCourses = result.Item.requirements?.support_courses?.courses || [];
    
    console.log(`Found ${majorCourses.length} major courses and ${supportCourses.length} support courses`);
    
    // Combine and format for dropdown
    const allCourses = [
      ...majorCourses.map(course => ({
        id: course.course_id,
        name: course.course_name,
        units: course.units,
        type: 'major',
        required: course.required || true
      })),
      ...supportCourses.map(course => ({
        id: course.course_id,
        name: course.course_name,
        units: course.units,
        type: 'support',
        required: course.required || true
      }))
    ];
    
    // Sort courses by type and then by course code
    allCourses.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'major' ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });
    
    return createResponse(200, {
      success: true,
      university: result.Item.university,
      major: result.Item.major,
      totalUnits: result.Item.total_units,
      majorCoursesCount: majorCourses.length,
      supportCoursesCount: supportCourses.length,
      totalCoursesCount: allCourses.length,
      courses: allCourses
    });
    
  } catch (error) {
    console.error('Error fetching courses:', error);
    return createResponse(500, { error: 'Failed to fetch courses', details: error.message });
  }
}

// UPDATED: Get student profile with auto-creation
async function getProfile(userId, userInfo) {
  try {
    console.log(`Getting profile for user: ${userId}`);
    
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    });

    const result = await dynamodb.send(command);
    
    if (!result.Item) {
      // NEW: Auto-create profile for first-time users
      console.log('Profile not found, creating new profile from Cognito data');
      const newProfile = await createProfileFromCognito(userId, userInfo);
      
      // Save the new profile
      const putCommand = new PutCommand({
        TableName: USERS_TABLE,
        Item: transformFrontendToDynamo(userId, newProfile)
      });
      
      await dynamodb.send(putCommand);
      console.log('New profile created successfully');
      
      return createResponse(201, { profile: newProfile, isNew: true });
    }

    // Transform DynamoDB item to frontend format
    const profile = transformDynamoToFrontend(result.Item);
    
    return createResponse(200, { profile, isNew: false });
    
  } catch (error) {
    console.error('Error getting profile:', error);
    return createResponse(500, { error: 'Failed to retrieve profile' });
  }
}

// UPDATED: Save student profile (same logic, just using Cognito sub as userId)
async function saveProfile(userId, profileData, userInfo) {
  try {
    console.log(`Saving profile for user: ${userId}`, JSON.stringify(profileData, null, 2));
    
    // Transform frontend data to DynamoDB format
    const dynamoData = transformFrontendToDynamo(userId, profileData);
    
    // Ensure email stays synced with Cognito
    if (userInfo.email) {
      dynamoData.email = userInfo.email;
    }
    
    // Use PutCommand to create or completely replace the profile
    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: dynamoData
    });

    await dynamodb.send(command);
    
    console.log('Profile saved successfully');
    
    return createResponse(200, { 
      message: 'Profile saved successfully',
      userId: userId,
      completedCoursesCount: profileData.completedCourses?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error saving profile:', error);
    return createResponse(500, { error: 'Failed to save profile', details: error.message });
  }
}

// NEW: Create profile from Cognito user information
function createProfileFromCognito(userId, userInfo) {
  return {
    firstName: userInfo.given_name || '',
    lastName: userInfo.family_name || '',
    email: userInfo.email || '',
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
    plannedCourses: []
  };
}

// Transform DynamoDB data to frontend format (unchanged)
function transformDynamoToFrontend(dynamoItem) {
  return {
    firstName: dynamoItem.firstName || dynamoItem.first_name || '',
    lastName: dynamoItem.lastName || dynamoItem.last_name || '',
    email: dynamoItem.email || '',
    studentId: dynamoItem.studentId || dynamoItem.student_id || '',
    university: dynamoItem.university ? {
      name: dynamoItem.university,
      domain: dynamoItem.university_domain || '',
      country: dynamoItem.university_country || 'USA'
    } : null,
    college: dynamoItem.college || '',
    major: dynamoItem.major || '',
    concentration: dynamoItem.concentration || '',
    minor: dynamoItem.minor || '',
    academicYear: dynamoItem.academicYear || dynamoItem.academic_year || '',
    expectedGraduation: dynamoItem.expectedGraduation || dynamoItem.expected_graduation || '',
    gpa: dynamoItem.gpa || dynamoItem.currentGPA || 0,
    totalCredits: dynamoItem.totalCredits || dynamoItem.total_credits || 0,
    currentSemesterCredits: dynamoItem.currentSemesterCredits || dynamoItem.current_semester_credits || 0,
    careerGoals: dynamoItem.careerGoals || dynamoItem.career_goals || [],
    learningStyle: dynamoItem.learningStyle || dynamoItem.learning_style || '',
    academicInterests: dynamoItem.academicInterests || dynamoItem.academic_interests || [],
    advisorName: dynamoItem.advisorName || dynamoItem.advisor_name || '',
    advisorEmail: dynamoItem.advisorEmail || dynamoItem.advisor_email || '',
    advisorNotes: dynamoItem.advisorNotes || dynamoItem.advisor_notes || '',
    completedCourses: dynamoItem.completedCourses || dynamoItem.completed_courses || [],
    currentCourses: dynamoItem.currentCourses || dynamoItem.current_courses || [],
    plannedCourses: dynamoItem.plannedCourses || dynamoItem.planned_courses || []
  };
}

// Transform frontend data to DynamoDB format (unchanged)
function transformFrontendToDynamo(userId, frontendData) {
  return {
    user_id: userId, // Now this will be the Cognito sub
    email: frontendData.email || '',
    firstName: frontendData.firstName || '',
    lastName: frontendData.lastName || '',
    studentId: frontendData.studentId || '',
    
    // University information
    university: frontendData.university?.name || frontendData.university || '',
    university_domain: frontendData.university?.domain || '',
    university_country: frontendData.university?.country || 'USA',
    
    // Academic information
    college: frontendData.college || '',
    major: frontendData.major || '',
    concentration: frontendData.concentration || '',
    minor: frontendData.minor || '',
    academicYear: frontendData.academicYear || '',
    expectedGraduation: frontendData.expectedGraduation || '',
    
    // Academic progress
    gpa: frontendData.gpa || 0,
    currentGPA: frontendData.gpa || 0,
    totalCredits: frontendData.totalCredits || 0,
    total_credits: frontendData.totalCredits || 0,
    currentSemesterCredits: frontendData.currentSemesterCredits || 0,
    
    // Interests and goals
    careerGoals: frontendData.careerGoals || [],
    learningStyle: frontendData.learningStyle || '',
    academicInterests: frontendData.academicInterests || [],
    
    // Advisor information
    advisorName: frontendData.advisorName || '',
    advisorEmail: frontendData.advisorEmail || '',
    advisorNotes: frontendData.advisorNotes || '',
    
    // Course tracking
    completedCourses: frontendData.completedCourses || [],
    completed_courses: frontendData.completedCourses || [],
    currentCourses: frontendData.currentCourses || [],
    current_courses: frontendData.currentCourses || [],
    plannedCourses: frontendData.plannedCourses || [],
    planned_courses: frontendData.plannedCourses || [],
    
    // Metadata
    created_at: frontendData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Create default profile for new users (keep for compatibility)
function createDefaultProfile(userId) {
  return {
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
    plannedCourses: []
  };
}

// Create standardized response (unchanged)
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}