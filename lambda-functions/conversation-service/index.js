// ====================================
// CONVERSATION SERVICE LAMBDA
// Manages chat history and conversation threading
// ====================================

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// AWS clients
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// DynamoDB table name
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'college-hq-conversations';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

exports.handler = async (event) => {
  try {
    const { httpMethod, path, pathParameters, body } = event;
    
    // Route based on path and method
    if (path === '/conversations' && httpMethod === 'POST') {
      return await handleCreateConversation(JSON.parse(body || '{}'));
    }
    
    if (path === '/conversations/message' && httpMethod === 'POST') {
      return await handleStoreMessage(JSON.parse(body || '{}'));
    }
    
    if (pathParameters?.userId && pathParameters?.conversationId) {
      if (httpMethod === 'GET') {
        return await handleGetConversation(
          pathParameters.userId, 
          pathParameters.conversationId
        );
      }
      if (httpMethod === 'DELETE') {
        return await handleDeleteConversation(
          pathParameters.userId,
          pathParameters.conversationId
        );
      }
    }
    
    if (pathParameters?.userId && httpMethod === 'GET') {
      return await handleListConversations(pathParameters.userId);
    }
    
    return createResponse(404, { error: 'Route not found' });
  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// CONVERSATION OPERATIONS
// ====================================

/**
 * Create a new conversation
 */
async function handleCreateConversation(data) {
  try {
    const { userId, title, agentType = 'advising' } = data;
    
    if (!userId) {
      return createResponse(400, { error: 'userId is required' });
    }
    
    const conversationId = generateConversationId();
    const timestamp = new Date().toISOString();
    
    const conversation = {
      user_id: userId,
      conversation_id: conversationId,
      title: title || `Conversation ${timestamp}`,
      agent_type: agentType,
      messages: [],
      created_at: timestamp,
      updated_at: timestamp
    };
    
    await saveConversation(conversation);
    
    return createResponse(201, {
      message: 'Conversation created',
      conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return createResponse(500, { error: 'Failed to create conversation' });
  }
}

/**
 * Store a message in an existing conversation
 */
async function handleStoreMessage(data) {
  try {
    const { userId, conversationId, userMessage, assistantResponse } = data;
    
    if (!userId || !conversationId) {
      return createResponse(400, { 
        error: 'userId and conversationId are required' 
      });
    }
    
    // Get existing conversation
    const conversation = await getConversation(userId, conversationId);
    
    if (!conversation) {
      // Create new conversation if it doesn't exist
      const newConversation = {
        user_id: userId,
        conversation_id: conversationId,
        title: `Conversation ${new Date().toISOString()}`,
        agent_type: 'advising',
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await saveConversation(newConversation);
    }
    
    // Store the messages
    await storeConversationMessages(userId, conversationId, userMessage, assistantResponse);
    
    return createResponse(200, {
      message: 'Messages stored successfully',
      conversationId
    });
  } catch (error) {
    console.error('Error storing message:', error);
    return createResponse(500, { error: 'Failed to store message' });
  }
}

/**
 * Get a specific conversation
 */
async function handleGetConversation(userId, conversationId) {
  try {
    const conversation = await getConversation(userId, conversationId);
    
    if (!conversation) {
      return createResponse(404, { error: 'Conversation not found' });
    }
    
    return createResponse(200, conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    return createResponse(500, { error: 'Failed to get conversation' });
  }
}

/**
 * List all conversations for a user
 */
async function handleListConversations(userId) {
  try {
    const conversations = await listUserConversations(userId);
    
    return createResponse(200, {
      conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return createResponse(500, { error: 'Failed to list conversations' });
  }
}

/**
 * Delete a conversation
 */
async function handleDeleteConversation(userId, conversationId) {
  try {
    await deleteConversation(userId, conversationId);
    
    return createResponse(200, {
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return createResponse(500, { error: 'Failed to delete conversation' });
  }
}

// ====================================
// DATABASE OPERATIONS
// ====================================

/**
 * Get conversation from DynamoDB
 */
async function getConversation(userId, conversationId) {
  try {
    const command = new GetCommand({
      TableName: CONVERSATIONS_TABLE,
      Key: { 
        user_id: userId, 
        conversation_id: conversationId 
      }
    });
    const result = await dynamodb.send(command);
    return result.Item;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * Save conversation to DynamoDB
 */
async function saveConversation(conversation) {
  const command = new PutCommand({
    TableName: CONVERSATIONS_TABLE,
    Item: conversation
  });
  
  await dynamodb.send(command);
}

/**
 * Store conversation messages
 */
async function storeConversationMessages(userId, conversationId, userMessage, assistantResponse) {
  try {
    const timestamp = new Date().toISOString();
    
    // Create message objects
    const newMessages = [];
    
    if (userMessage) {
      newMessages.push({
        role: 'user',
        content: userMessage,
        timestamp
      });
    }
    
    if (assistantResponse) {
      newMessages.push({
        role: 'assistant',
        content: assistantResponse,
        timestamp
      });
    }
    
    // Get existing conversation
    const existingConversation = await getConversation(userId, conversationId);
    const existingMessages = existingConversation?.messages || [];
    
    // Append new messages
    const allMessages = [...existingMessages, ...newMessages];
    
    // Update conversation in DynamoDB
    const command = new UpdateCommand({
      TableName: CONVERSATIONS_TABLE,
      Key: { 
        user_id: userId, 
        conversation_id: conversationId 
      },
      UpdateExpression: 'SET messages = :messages, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':messages': allMessages,
        ':updated_at': timestamp
      }
    });
    
    await dynamodb.send(command);
  } catch (error) {
    console.error('Error storing conversation messages:', error);
    throw error;
  }
}

/**
 * List all conversations for a user
 */
async function listUserConversations(userId) {
  try {
    const command = new QueryCommand({
      TableName: CONVERSATIONS_TABLE,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Sort by newest first
    });
    
    const result = await dynamodb.send(command);
    
    // Return conversations with summary info (without full message history)
    return (result.Items || []).map(conv => ({
      conversation_id: conv.conversation_id,
      title: conv.title,
      agent_type: conv.agent_type,
      message_count: conv.messages?.length || 0,
      created_at: conv.created_at,
      updated_at: conv.updated_at
    }));
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [];
  }
}

/**
 * Delete a conversation
 */
async function deleteConversation(userId, conversationId) {
  const command = new DeleteCommand({
    TableName: CONVERSATIONS_TABLE,
    Key: { 
      user_id: userId, 
      conversation_id: conversationId 
    }
  });
  
  await dynamodb.send(command);
}

/**
 * Get conversation history (messages only)
 */
async function getConversationHistory(userId, conversationId) {
  try {
    const conversation = await getConversation(userId, conversationId);
    return conversation?.messages || [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Generate unique conversation ID
 */
function generateConversationId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

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
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// ====================================
// EXPORTS FOR OTHER SERVICES
// ====================================

// Export functions that other services might need
module.exports.getConversationHistory = getConversationHistory;
module.exports.storeConversationMessages = storeConversationMessages;

// ====================================
// LOCAL TESTING
// ====================================

if (require.main === module) {
  (async () => {
    // Test creating a conversation
    const testEvent = {
      httpMethod: 'POST',
      path: '/conversations',
      body: JSON.stringify({
        userId: 'test-user-123',
        title: 'Test Conversation'
      })
    };
    
    console.log('Testing conversation service...');
    const result = await exports.handler(testEvent);
    console.log('Result:', JSON.stringify(result, null, 2));
  })();
}