const AWS = require('aws-sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config();

// AWS clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Table names
const USERS_TABLE = process.env.USERS_TABLE || 'college-hq-users';
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'college-hq-conversations';

// Lambda handler
exports.handler = async (event) => {
  try {
    // Parse input
    let body = event.body ? JSON.parse(event.body) : event;
    const { userId, message, conversationId } = body;
    
    if (!userId || !message) {
      return createResponse(400, { error: 'Missing userId or message' });
    }

    // Get user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return createResponse(404, { error: 'User not found' });
    }

    // Get or create conversation
    const currentConversationId = conversationId || generateConversationId();
    const conversationHistory = await getConversationHistory(userId, currentConversationId);

    // Build context-aware prompt
    const systemPrompt = buildAdvisingSystemPrompt(userProfile);
    const messages = buildMessageHistory(conversationHistory, message);

    // Call Bedrock with proper Messages API
    const response = await callBedrock(systemPrompt, messages);

    // Store conversation
    await storeConversation(userId, currentConversationId, message, response.text);

    // Return response
    return createResponse(200, {
      agent: 'advising',
      userId,
      conversationId: currentConversationId,
      response: response.text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { error: error.message });
  }
};

// Helper Functions

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

async function storeConversation(userId, conversationId, userMessage, assistantResponse) {
  try {
    const timestamp = new Date().toISOString();
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

    // Get existing conversation
    const existingConversation = await getConversationHistory(userId, conversationId);
    const allMessages = [...existingConversation, ...newMessages];

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

async function callBedrock(systemPrompt, messages) {
  try {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      system: systemPrompt,
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    };

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

function generateConversationId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

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

// Local testing
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

    // Mock getUserProfile for testing
    const originalGetUserProfile = getUserProfile;
    getUserProfile = async (userId) => mockUserProfile;

    const event = {
      userId: 'test-user',
      message: 'What classes should I take next semester for my CS major?'
    };

    const result = await exports.handler(event);
    console.log('Test result:', JSON.stringify(result, null, 2));
  })();
}