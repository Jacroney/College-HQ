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
const COURSE_CATALOG_TABLE = process.env.COURSE_CATALOG_TABLE || 'college-hq-course-catalog';
const DEGREE_REQUIREMENTS_TABLE = process.env.DEGREE_REQUIREMENTS_TABLE || 'college-hq-degree-requirements';
const COURSE_FLOWCHART_TABLE = process.env.COURSE_FLOWCHART_TABLE || 'college-hq-course-flowchart';

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
// ENHANCED ADVISING REQUEST HANDLER
// ====================================

/**
 * Handle advising-related requests using enhanced AI agent with Cal Poly data
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response object
 */
async function handleAdvisingRequest(event) {
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

  // Get complete student profile
  const studentProfile = await getUserProfile(userId);
  if (!studentProfile) {
    return createResponse(404, { error: 'Student profile not found. Please complete your profile first.' });
  }

  // Get relevant course catalog data with Cal Poly integration
  const { courses: courseCatalogData, degreeRequirements } = await getRelevantCourses(
    studentProfile.university?.name || studentProfile.university, 
    message, 
    studentProfile
  );

  // Get or create conversation thread
  const currentConversationId = conversationId || generateConversationId();
  const conversationHistory = await getConversationHistory(userId, currentConversationId);

  // Build enhanced AI prompt with user context and Cal Poly course data
  const systemPrompt = buildEnhancedAdvisingSystemPrompt(studentProfile, courseCatalogData, degreeRequirements);
  const messages = buildMessageHistory(conversationHistory, message);

  // Generate AI response using Bedrock
  const response = await callBedrock(systemPrompt, messages);

  // Store conversation for future context
  await storeConversation(userId, currentConversationId, message, response.text);

  // Return enhanced response with metadata
  return createResponse(200, {
    agent: 'advising',
    userId,
    conversationId: currentConversationId,
    response: response.text,
    timestamp: new Date().toISOString(),
    profileUsed: true,
    coursesReferenced: courseCatalogData.length,
    degreeRequirementsUsed: !!degreeRequirements,
    studentMajor: studentProfile.major,
    studentYear: studentProfile.academicYear,
    university: studentProfile.university?.name || studentProfile.university
  });
}

// ====================================
// ENHANCED COURSE DATA FUNCTIONS
// ====================================

/**
 * Get relevant course data using multiple strategies with Cal Poly integration
 * @param {string} university - University name
 * @param {string} userMessage - User's message
 * @param {Object} studentProfile - Student profile data
 * @returns {Object} Object with courses array and degree requirements
 */
async function getRelevantCourses(university, userMessage, studentProfile) {
  try {
    console.log(`Getting courses for university: ${university}`);
    
    const courses = [];
    
    // Get degree requirements if available
    let degreeRequirements = null;
    if (studentProfile.major) {
      const universityKey = getUniversityKey(university);
      const majorId = `${universityKey}_${studentProfile.major.toLowerCase().replace(/\s+/g, '')}`;
      degreeRequirements = await getDegreeRequirements(majorId);
    }
    
    // Strategy 1: Get courses mentioned in user message
    const mentionedCourses = extractCourseCodesFromMessage(userMessage);
    for (const courseCode of mentionedCourses) {
      const universityKey = getUniversityKey(university);
      const courseId = `${universityKey}_${courseCode.toLowerCase().replace(/\s+/g, '')}`;
      try {
        const courseData = await getCourseById(courseId);
        if (courseData) {
          courses.push(courseData);
        }
      } catch (error) {
        console.error(`Error getting mentioned course ${courseId}:`, error);
      }
    }
    
    // Strategy 2: Get courses from degree requirements
    if (degreeRequirements && degreeRequirements.requirements) {
      const reqCourses = await getCoursesFromDegreeRequirements(degreeRequirements, studentProfile, university);
      courses.push(...reqCourses);
    }
    
    // Strategy 3: Get flowchart courses for their current year
    if (studentProfile.academicYear) {
      const flowchartCourses = await getFlowchartCourses(university, studentProfile.major, studentProfile.academicYear);
      courses.push(...flowchartCourses);
    }
    
    // Strategy 4: Fallback to major-based search
    if (courses.length < 5 && studentProfile.major) {
      const majorCourses = await getCoursesByMajor(university, studentProfile.major);
      courses.push(...majorCourses);
    }
    
    // Remove duplicates and limit
    const uniqueCourses = removeDuplicateCourses(courses);
    const limitedCourses = uniqueCourses.slice(0, 15);
    
    console.log(`Found ${limitedCourses.length} relevant courses`);
    return { courses: limitedCourses, degreeRequirements };
  } catch (error) {
    console.error('Error getting relevant courses:', error);
    return { courses: [], degreeRequirements: null };
  }
}

/**
 * Get degree requirements from DynamoDB
 * @param {string} majorId - Major identifier
 * @returns {Object|null} Degree requirements or null
 */
async function getDegreeRequirements(majorId) {
  try {
    const params = {
      TableName: DEGREE_REQUIREMENTS_TABLE,
      Key: { university_major_id: majorId }
    };
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error(`Error getting degree requirements for ${majorId}:`, error);
    return null;
  }
}

/**
 * Get courses from degree requirements
 * @param {Object} degreeRequirements - Degree requirements object
 * @param {Object} studentProfile - Student profile
 * @param {string} university - University name
 * @returns {Array} Array of course objects
 */
async function getCoursesFromDegreeRequirements(degreeRequirements, studentProfile, university) {
  const courses = [];
  
  try {
    // Look through major courses in requirements
    if (degreeRequirements.requirements && degreeRequirements.requirements.major_courses) {
      const majorCourses = degreeRequirements.requirements.major_courses.courses || [];
      
      for (const reqCourse of majorCourses.slice(0, 8)) { // Limit to first 8
        const universityKey = getUniversityKey(university);
        const courseId = `${universityKey}_${reqCourse.course_id.toLowerCase().replace(/\s+/g, '')}`;
        try {
          const courseData = await getCourseById(courseId);
          if (courseData) {
            courses.push(courseData);
          }
        } catch (error) {
          console.error(`Error getting requirement course ${courseId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error processing degree requirements:', error);
  }
  
  return courses;
}

/**
 * Get flowchart courses for student's year
 * @param {string} university - University name
 * @param {string} major - Student's major
 * @param {string} academicYear - Student's academic year
 * @returns {Array} Array of course objects
 */
async function getFlowchartCourses(university, major, academicYear) {
  const courses = [];
  
  try {
    const universityKey = getUniversityKey(university);
    const flowchartId = `${universityKey}_${major.toLowerCase().replace(/\s+/g, '')}_2024_2025`;
    
    const params = {
      TableName: COURSE_FLOWCHART_TABLE,
      Key: { university_major_year: flowchartId }
    };
    const result = await dynamodb.get(params).promise();
    
    if (result.Item && result.Item.flowchart) {
      // Map academic year to flowchart year
      const yearMap = {
        'Freshman': 'year_1',
        'Sophomore': 'year_2', 
        'Junior': 'year_3',
        'Senior': 'year_4'
      };
      
      const flowchartYear = yearMap[academicYear];
      if (flowchartYear && result.Item.flowchart[flowchartYear]) {
        const yearData = result.Item.flowchart[flowchartYear];
        
        // Get courses from all quarters of that year
        for (const quarter of ['fall', 'winter', 'spring']) {
          if (yearData[quarter] && yearData[quarter].courses) {
            for (const course of yearData[quarter].courses.slice(0, 4)) { // Limit per quarter
              const universityKey = getUniversityKey(university);
              const courseId = `${universityKey}_${course.course_id.toLowerCase().replace(/\s+/g, '')}`;
              try {
                const courseData = await getCourseById(courseId);
                if (courseData) {
                  courses.push(courseData);
                }
              } catch (error) {
                console.error(`Error getting flowchart course ${courseId}:`, error);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting flowchart courses:', error);
  }
  
  return courses;
}

/**
 * Get course by ID from catalog
 * @param {string} courseId - Course identifier
 * @returns {Object|null} Course object or null
 */
async function getCourseById(courseId) {
  try {
    const params = {
      TableName: COURSE_CATALOG_TABLE,
      Key: { university_course_id: courseId }
    };
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error(`Error getting course ${courseId}:`, error);
    return null;
  }
}

/**
 * Get courses by major using scan
 * @param {string} university - University name
 * @param {string} major - Student's major
 * @returns {Array} Array of course objects
 */
async function getCoursesByMajor(university, major) {
  try {
    const params = {
      TableName: COURSE_CATALOG_TABLE,
      FilterExpression: 'university = :university AND contains(required_for_majors, :major)',
      ExpressionAttributeValues: {
        ':university': university,
        ':major': major
      }
    };
    
    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error(`Error getting courses for major ${major}:`, error);
    return [];
  }
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Get university key for database lookups
 * @param {string} university - University name
 * @returns {string} University key
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
 * Extract course codes mentioned in user message
 * @param {string} message - User's message
 * @returns {Array} Array of course codes
 */
function extractCourseCodesFromMessage(message) {
  const coursePattern = /([A-Z]{2,4})\s*(\d{3})/gi;
  const matches = message.match(coursePattern) || [];
  return matches.map(match => match.replace(/\s+/g, ''));
}

/**
 * Remove duplicate courses from array
 * @param {Array} courses - Array of course objects
 * @returns {Array} Array with duplicates removed
 */
function removeDuplicateCourses(courses) {
  const seen = new Set();
  return courses.filter(course => {
    if (seen.has(course.university_course_id)) {
      return false;
    }
    seen.add(course.university_course_id);
    return true;
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

/**
 * Get user profile data for AI context
 * Creates default profile if user doesn't exist
 * @param {string} userId - User identifier
 * @returns {Object|null} User profile or null if error
 */
async function getUserProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { user_id: userId }
    };
    const result = await dynamodb.get(params).promise();
    
    // Create default profile if user doesn't exist
    if (!result.Item) {
      console.log(`No profile found for user: ${userId}, creating default profile`);
      const defaultProfile = createDefaultProfile(userId);
      await saveProfile(userId, defaultProfile);
      return defaultProfile;
    }
    
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
 * Build enhanced system prompt for AI advisor with Cal Poly course data
 * @param {Object} userProfile - User profile data
 * @param {Array} courses - Array of relevant courses
 * @param {Object} degreeRequirements - Degree requirements object
 * @returns {string} System prompt for AI
 */
function buildEnhancedAdvisingSystemPrompt(userProfile, courses, degreeRequirements) {
  // Extract basic profile info
  const studentName = userProfile.firstName || userProfile.first_name || null;
  const major = userProfile.major || null;
  const academicYear = userProfile.academicYear || userProfile.academic_year || null;
  const university = userProfile.university?.name || userProfile.university || null;
  const completedCourses = userProfile.completedCourses || userProfile.completed_courses || [];
  const gpa = userProfile.gpa || userProfile.currentGPA || null;
  
  // Build student info section
  let studentInfo = 'STUDENT INFORMATION:\n';
  if (studentName) studentInfo += `- Name: ${studentName}\n`;
  if (university) studentInfo += `- University: ${university}\n`;
  if (major) studentInfo += `- Major: ${major}\n`;
  if (academicYear) studentInfo += `- Academic Level: ${academicYear}\n`;
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
      courseInfo += `  Difficulty: ${course.difficulty_level}\n`;
      
      // Handle prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        const prereqs = Array.isArray(course.prerequisites) 
          ? course.prerequisites 
          : [course.prerequisites];
        courseInfo += `  Prerequisites: ${prereqs.join(', ')}\n`;
      }
      
      // Handle quarters offered
      if (course.typical_quarters && course.typical_quarters.length > 0) {
        const quarters = Array.isArray(course.typical_quarters) 
          ? course.typical_quarters 
          : [course.typical_quarters];
        courseInfo += `  Offered: ${quarters.join(', ')}\n`;
      }
      
      // Show which majors require this course
      if (course.required_for_majors && course.required_for_majors.length > 0) {
        const majors = Array.isArray(course.required_for_majors) 
          ? course.required_for_majors 
          : [course.required_for_majors];
        courseInfo += `  Required for: ${majors.join(', ')}\n`;
      }
    });
  }
  
  return `You are an expert academic advisor at ${university || 'the university'} helping ${studentName || 'this student'} with course planning and degree requirements.

${studentInfo}${requirementsInfo}${courseInfo}

ENHANCED ADVISOR GUIDELINES:
- Use the specific degree requirements and course information above
- Always check prerequisites before suggesting courses
- Reference specific course codes, units, and descriptions
- Consider the student's academic level and completed courses
- Help with degree planning and graduation requirements
- Explain course sequences and prerequisite chains
- Suggest appropriate course loads per quarter/semester
- Consider course difficulty and student's current GPA
- Help track progress toward degree completion

SMART RECOMMENDATIONS:
- Check degree requirements against completed courses
- Suggest missing prerequisites first
- Balance course difficulty in quarter planning
- Consider course availability by quarter
- Help plan optimal graduation timeline
- Flag any degree requirement gaps

Be specific, reference actual course data, and always explain your reasoning.`;
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
      user_id: 'user_ufkkwtqhrzg',
      firstName: 'Joseph',
      lastName: 'Croney',
      email: 'jacroney@icloud.com',
      university: 'Cal Poly San Luis Obispo',
      major: 'Computer Science',
      academicYear: 'Freshman',
      completedCourses: ['CSC 101', 'CSC 203']
    };

    // Test event
    const event = {
      userId: 'user_ufkkwtqhrzg',
      message: 'What courses should I take next quarter for my CS major?'
    };

    // Run test
    const result = await exports.handler(event);
    console.log('Test result:', JSON.stringify(result, null, 2));
  })();
}