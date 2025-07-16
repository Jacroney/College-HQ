// ====================================
// DEPENDENCIES AND CONFIGURATION
// ====================================

// AWS SDK imports
const AWS = require('aws-sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Environment configuration
require('dotenv').config();

// AWS service clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// DynamoDB table names
const USERS_TABLE = process.env.USERS_TABLE || 'college-hq-users';
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'college-hq-conversations';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

/**
 * Main Lambda function handler
 * Routes requests to appropriate handlers based on request type
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response object
 */
exports.handler = async (event) => {
  try {
    // Route profile requests (GET/PUT with path parameters)
    if (event.httpMethod && event.pathParameters) {
      return await handleProfileRequest(event);
    }
    
    // Route advising requests (POST with message body)
    return await handleAdvisingRequest(event);
  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// PROFILE REQUEST HANDLER
// ====================================

/**
 * Handle profile-related HTTP requests
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response object
 */
async function handleProfileRequest(event) {
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
}

// ====================================
// ADVISING REQUEST HANDLER
// ====================================

/**
 * Handle advising-related requests using AI agent
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response object
 */
async function handleAdvisingRequest(event) {
  // Parse request body
  let body = event.body ? JSON.parse(event.body) : event;
  const { userId, message, conversationId } = body;
  
  // Validate required parameters
  if (!userId || !message) {
    return createResponse(400, { error: 'Missing userId or message' });
  }

  // Get user profile for context
  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    return createResponse(404, { error: 'User not found' });
  }

  // Get or create conversation thread
  const currentConversationId = conversationId || generateConversationId();
  const conversationHistory = await getConversationHistory(userId, currentConversationId);

  // Build AI prompt with user context
  const systemPrompt = buildAdvisingSystemPrompt(userProfile);
  const messages = buildMessageHistory(conversationHistory, message);

  // Generate AI response using Bedrock
  const response = await callBedrock(systemPrompt, messages);

  // Store conversation for future context
  await storeConversation(userId, currentConversationId, message, response.text);

  // Return formatted response
  return createResponse(200, {
    agent: 'advising',
    userId,
    conversationId: currentConversationId,
    response: response.text,
    timestamp: new Date().toISOString()
  });
}

// ====================================
// PROFILE MANAGEMENT FUNCTIONS
// ====================================

/**
 * Get user profile from DynamoDB
 * @param {string} userId - User identifier
 * @returns {Object} HTTP response with profile data
 */
async function getProfile(userId) {
  try {
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
// HELPER FUNCTIONS
// ====================================

/**
 * Get user profile data for AI context
 * @param {string} userId - User identifier
 * @returns {Object|null} User profile or null if not found
 */
async function getUserProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Get conversation history for AI context
 * @param {string} userId - User identifier
 * @param {string} conversationId - Conversation identifier
 * @returns {Array} Array of previous messages
 */
async function getConversationHistory(userId, conversationId) {
  try {
    const params = {
      TableName: CONVERSATIONS_TABLE,
      Key: { user_id: userId, conversation_id: conversationId }
    };
    const result = await dynamodb.get(params).promise();
    return result.Item ? result.Item.messages : [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Store conversation messages for future context
 * @param {string} userId - User identifier
 * @param {string} conversationId - Conversation identifier
 * @param {string} userMessage - User's message
 * @param {string} assistantResponse - AI assistant's response
 */
async function storeConversation(userId, conversationId, userMessage, assistantResponse) {
  try {
    const timestamp = new Date().toISOString();
    
    // Create message objects
    const newMessages = [
      {
        role: 'user',
        content: userMessage,
        timestamp
      },
      {
        role: 'assistant',
        content: assistantResponse,
        timestamp
      }
    ];

    // Append to existing conversation history
    const existingConversation = await getConversationHistory(userId, conversationId);
    const allMessages = [...existingConversation, ...newMessages];

    // Update conversation in DynamoDB
    const params = {
      TableName: CONVERSATIONS_TABLE,
      Key: { user_id: userId, conversation_id: conversationId },
      UpdateExpression: 'SET messages = :messages, agent_type = :agent_type, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':messages': allMessages,
        ':agent_type': 'advising',
        ':updated_at': timestamp
      }
    };

    await dynamodb.update(params).promise();
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

/**
 * Build system prompt for AI advisor with user context
 * @param {Object} userProfile - User profile data
 * @returns {string} System prompt for AI
 */
function buildAdvisingSystemPrompt(userProfile) {
  return `You are an expert academic advisor for college students. You provide personalized course recommendations and academic guidance.

Student Profile:
- Name: ${userProfile.email}
- University: ${userProfile.university}
- Major: ${userProfile.major}
- Concentration: ${userProfile.concentration || 'Not specified'}
- Year: ${userProfile.year}

Your Role:
- Provide specific, actionable course recommendations
- Consider prerequisite requirements and course sequences
- Help with degree planning and graduation timelines
- Suggest extracurricular activities and opportunities
- Be encouraging and supportive

Guidelines:
- Always consider the student's specific major and year
- Ask clarifying questions when needed
- Provide reasoning for your recommendations
- Mention prerequisites and course difficulty when relevant
- Keep responses concise but comprehensive
- If you need specific course catalog information, acknowledge this limitation

Respond in a friendly, professional tone as an academic advisor would.`;
}

/**
 * Build message history for AI context
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {string} newMessage - Current user message
 * @returns {Array} Formatted message history
 */
function buildMessageHistory(conversationHistory, newMessage) {
  // Convert conversation history to Messages API format
  const messages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Add new user message
  messages.push({
    role: 'user',
    content: newMessage
  });

  return messages;
}

/**
 * Call AWS Bedrock Claude model for AI response
 * @param {string} systemPrompt - System prompt with context
 * @param {Array} messages - Message history
 * @returns {Object} AI response object
 */
async function callBedrock(systemPrompt, messages) {
  try {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    // Build request body for Bedrock API
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      system: systemPrompt,
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    };

    // Create and send command
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      text: responseBody.content[0].text,
      usage: responseBody.usage
    };
  } catch (error) {
    console.error('Bedrock error:', error);
    throw new Error('Failed to generate response');
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
 * Create standardized HTTP response
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
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// ====================================
// LOCAL TESTING
// ====================================

/**
 * Local testing functionality
 * Only runs when this file is executed directly
 */
if (require.main === module) {
  (async () => {
    // Mock user profile for testing
    const mockUserProfile = {
      user_id: 'test-user',
      email: 'test@university.edu',
      university: 'State University',
      major: 'Computer Science',
      concentration: 'Software Engineering',
      year: 'Junior'
    };

    // Mock getUserProfile function for testing
    const originalGetUserProfile = getUserProfile;
    getUserProfile = async (userId) => mockUserProfile;

    // Test event
    const event = {
      userId: 'test-user',
      message: 'What classes should I take next semester for my CS major?'
    };

    // Run test
    const result = await exports.handler(event);
    console.log('Test result:', JSON.stringify(result, null, 2));
  })();
}