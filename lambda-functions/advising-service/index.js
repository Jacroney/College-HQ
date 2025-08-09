// ====================================
// ADVISING SERVICE LAMBDA
// AI academic advisor using Amazon Bedrock
// ====================================

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// AWS clients
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Service endpoints (will be replaced with actual Lambda invocations)
const PROFILE_SERVICE = process.env.PROFILE_SERVICE || 'college-hq-profile-service';
const COURSE_SERVICE = process.env.COURSE_SERVICE || 'college-hq-course-service';
const CONVERSATION_SERVICE = process.env.CONVERSATION_SERVICE || 'college-hq-conversation-service';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

exports.handler = async (event) => {
  try {
    // Parse request body
    let body;
    try {
      if (event.body) {
        body = JSON.parse(event.body);
      } else if (event.userId || event.message) {
        body = event;
      } else {
        throw new Error('Invalid event format');
      }
    } catch (e) {
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { userId, message, conversationId } = body;
    
    // Validate required parameters
    if (!userId || !message) {
      return createResponse(400, { error: 'Missing userId or message' });
    }

    // Get student profile from profile service
    const studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return createResponse(404, { 
        error: 'Student profile not found. Please complete your profile first.' 
      });
    }

    // Get relevant course data from course service
    const courseData = await getRelevantCourses(
      studentProfile.university,
      message,
      studentProfile
    );

    // Get or create conversation
    const currentConversationId = conversationId || generateConversationId();
    
    // Get conversation history from conversation service
    const conversationHistory = await getConversationHistory(userId, currentConversationId);

    // Build AI prompt with context
    const systemPrompt = buildAdvisingSystemPrompt(
      studentProfile,
      courseData.courses,
      courseData.degreeRequirements
    );
    const messages = buildMessageHistory(conversationHistory, message);

    // Generate AI response using Bedrock
    const response = await callBedrock(systemPrompt, messages);

    // Store conversation in conversation service
    await storeConversation(userId, currentConversationId, message, response.text);

    // Return response
    return createResponse(200, {
      agent: 'advising',
      userId,
      conversationId: currentConversationId,
      response: response.text,
      timestamp: new Date().toISOString(),
      profileUsed: true,
      coursesReferenced: courseData.courses.length,
      degreeRequirementsUsed: !!courseData.degreeRequirements,
      studentMajor: studentProfile.major,
      studentYear: studentProfile.academicYear,
      university: studentProfile.university?.name || studentProfile.university
    });

  } catch (error) {
    console.error('Advising service error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// SERVICE INTEGRATIONS
// ====================================

/**
 * Get student profile from profile service
 */
async function getStudentProfile(userId) {
  try {
    const command = new InvokeCommand({
      FunctionName: PROFILE_SERVICE,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        pathParameters: { userId }
      })
    });

    const result = await lambda.send(command);
    const response = JSON.parse(new TextDecoder().decode(result.Payload));
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      return body.profile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting student profile:', error);
    return null;
  }
}

/**
 * Get relevant courses from course service
 */
async function getRelevantCourses(university, message, studentProfile) {
  try {
    const command = new InvokeCommand({
      FunctionName: COURSE_SERVICE,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/courses/search',
        body: JSON.stringify({
          university,
          message,
          studentProfile
        })
      })
    });

    const result = await lambda.send(command);
    const response = JSON.parse(new TextDecoder().decode(result.Payload));
    
    if (response.statusCode === 200) {
      return JSON.parse(response.body);
    }
    
    return { courses: [], degreeRequirements: null };
  } catch (error) {
    console.error('Error getting relevant courses:', error);
    return { courses: [], degreeRequirements: null };
  }
}

/**
 * Get conversation history from conversation service
 */
async function getConversationHistory(userId, conversationId) {
  try {
    const command = new InvokeCommand({
      FunctionName: CONVERSATION_SERVICE,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        pathParameters: { userId, conversationId }
      })
    });

    const result = await lambda.send(command);
    const response = JSON.parse(new TextDecoder().decode(result.Payload));
    
    if (response.statusCode === 200) {
      const conversation = JSON.parse(response.body);
      return conversation.messages || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Store conversation in conversation service
 */
async function storeConversation(userId, conversationId, userMessage, assistantResponse) {
  try {
    const command = new InvokeCommand({
      FunctionName: CONVERSATION_SERVICE,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        httpMethod: 'POST',
        path: '/conversations/message',
        body: JSON.stringify({
          userId,
          conversationId,
          userMessage,
          assistantResponse
        })
      })
    });

    await lambda.send(command);
  } catch (error) {
    console.error('Error storing conversation:', error);
    // Don't fail the request if we can't store the conversation
  }
}

// ====================================
// AI PROMPT BUILDING
// ====================================

/**
 * Build system prompt for AI advisor
 */
function buildAdvisingSystemPrompt(userProfile, courses, degreeRequirements) {
  // Extract profile information
  const studentName = userProfile.firstName || userProfile.first_name || 'Student';
  const major = userProfile.major || 'Undeclared';
  const academicYear = userProfile.academicYear || userProfile.academic_year || 'Unknown';
  const university = userProfile.university?.name || userProfile.university || 'University';
  const completedCourses = userProfile.completedCourses || userProfile.completed_courses || [];
  const gpa = userProfile.gpa || userProfile.currentGPA || null;
  
  // Build student info section
  let studentInfo = 'STUDENT INFORMATION:\n';
  studentInfo += `- Name: ${studentName}\n`;
  studentInfo += `- University: ${university}\n`;
  studentInfo += `- Major: ${major}\n`;
  studentInfo += `- Academic Level: ${academicYear}\n`;
  if (gpa) studentInfo += `- Current GPA: ${gpa}\n`;
  if (completedCourses.length > 0) {
    studentInfo += `- Completed Courses: ${completedCourses.join(', ')}\n`;
  }
  
  // Build degree requirements section
  let requirementsInfo = '';
  if (degreeRequirements) {
    requirementsInfo = `\nDEGREE REQUIREMENTS FOR ${major}:\n`;
    requirementsInfo += `- Total Units Required: ${degreeRequirements.total_units || 'Not specified'}\n`;
    
    if (degreeRequirements.requirements) {
      if (degreeRequirements.requirements.major_courses) {
        requirementsInfo += `- Major Courses: ${degreeRequirements.requirements.major_courses.total_units || '?'} units\n`;
      }
      if (degreeRequirements.requirements.support_courses) {
        requirementsInfo += `- Support Courses: ${degreeRequirements.requirements.support_courses.total_units || '?'} units\n`;
      }
      if (degreeRequirements.requirements.general_education) {
        requirementsInfo += `- General Education: ${degreeRequirements.requirements.general_education.total_units || '?'} units\n`;
      }
    }
  }
  
  // Build course catalog section
  let courseInfo = '';
  if (courses && courses.length > 0) {
    courseInfo = `\nRELEVANT COURSES:\n`;
    
    courses.forEach(course => {
      courseInfo += `\n${course.course_code} - ${course.course_name}\n`;
      courseInfo += `  Description: ${course.description}\n`;
      courseInfo += `  Units: ${course.units}\n`;
      courseInfo += `  Difficulty: ${course.difficulty_level || 'Not specified'}\n`;
      
      if (course.prerequisites && course.prerequisites.length > 0) {
        const prereqs = Array.isArray(course.prerequisites) 
          ? course.prerequisites 
          : [course.prerequisites];
        courseInfo += `  Prerequisites: ${prereqs.join(', ')}\n`;
      }
      
      if (course.typical_quarters && course.typical_quarters.length > 0) {
        const quarters = Array.isArray(course.typical_quarters) 
          ? course.typical_quarters 
          : [course.typical_quarters];
        courseInfo += `  Offered: ${quarters.join(', ')}\n`;
      }
    });
  }
  
  return `You are an expert academic advisor at ${university} helping ${studentName} with course planning and degree requirements.

${studentInfo}${requirementsInfo}${courseInfo}

ADVISOR GUIDELINES:
- Use the specific degree requirements and course information above
- Always check prerequisites before suggesting courses
- Reference specific course codes, units, and descriptions
- Consider the student's academic level and completed courses
- Help with degree planning and graduation requirements
- Explain course sequences and prerequisite chains
- Suggest appropriate course loads per quarter/semester
- Consider course difficulty and student's current GPA when applicable
- Help track progress toward degree completion

RECOMMENDATIONS:
- Check degree requirements against completed courses
- Suggest missing prerequisites first
- Balance course difficulty in quarter planning
- Consider course availability by quarter
- Help plan optimal graduation timeline
- Flag any degree requirement gaps

Be specific, reference actual course data, and always explain your reasoning.`;
}

/**
 * Build message history for AI
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

// ====================================
// BEDROCK AI INTEGRATION
// ====================================

/**
 * Call AWS Bedrock Claude model
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
    throw new Error('Failed to generate AI response');
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
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// ====================================
// LOCAL TESTING
// ====================================

if (require.main === module) {
  (async () => {
    // Test event
    const event = {
      userId: 'test-user-123',
      message: 'What courses should I take next quarter for my CS major?'
    };

    console.log('Testing advising service...');
    const result = await exports.handler(event);
    console.log('Result:', JSON.stringify(result, null, 2));
  })();
}