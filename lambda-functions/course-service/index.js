// ====================================
// COURSE SERVICE LAMBDA
// Handles course catalog, degree requirements, and flowchart data
// ====================================

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// AWS clients
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// DynamoDB table names
const COURSE_CATALOG_TABLE = process.env.COURSE_CATALOG_TABLE || 'college-hq-course-catalog';
const DEGREE_REQUIREMENTS_TABLE = process.env.DEGREE_REQUIREMENTS_TABLE || 'college-hq-degree-requirements';
const COURSE_FLOWCHART_TABLE = process.env.COURSE_FLOWCHART_TABLE || 'college-hq-course-flowchart';

// ====================================
// MAIN LAMBDA HANDLER
// ====================================

exports.handler = async (event) => {
  try {
    const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
    
    // Route based on path and method
    if (path === '/courses' && httpMethod === 'GET') {
      return await handleGetCourses(queryStringParameters);
    }
    
    if (path === '/courses/search' && httpMethod === 'POST') {
      return await handleSearchCourses(JSON.parse(body || '{}'));
    }
    
    if (path.startsWith('/courses/') && pathParameters?.courseId) {
      return await handleGetCourseById(pathParameters.courseId);
    }
    
    if (path.startsWith('/degree-requirements/') && pathParameters?.majorId) {
      return await handleGetDegreeRequirements(pathParameters.majorId);
    }
    
    if (path.startsWith('/flowchart/') && pathParameters?.majorId) {
      return await handleGetFlowchart(pathParameters.majorId, queryStringParameters);
    }
    
    return createResponse(404, { error: 'Route not found' });
  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { error: error.message });
  }
};

// ====================================
// COURSE CATALOG OPERATIONS
// ====================================

/**
 * Get courses with optional filtering
 */
async function handleGetCourses(queryParams) {
  try {
    const { university, major, department, limit = 20 } = queryParams || {};
    
    if (university && major) {
      // Get courses for specific major
      return await getCoursesByMajor(university, major, limit);
    }
    
    if (university && department) {
      // Get courses by department
      return await getCoursesByDepartment(university, department, limit);
    }
    
    // Return error if no filters provided (avoid full table scan)
    return createResponse(400, { 
      error: 'Please provide university and either major or department parameters' 
    });
  } catch (error) {
    console.error('Error getting courses:', error);
    return createResponse(500, { error: 'Failed to get courses' });
  }
}

/**
 * Search courses based on various criteria
 */
async function handleSearchCourses(searchParams) {
  try {
    const { university, message, studentProfile } = searchParams;
    
    if (!university) {
      return createResponse(400, { error: 'University is required' });
    }
    
    const courses = await getRelevantCourses(university, message, studentProfile);
    return createResponse(200, courses);
  } catch (error) {
    console.error('Error searching courses:', error);
    return createResponse(500, { error: 'Failed to search courses' });
  }
}

/**
 * Get specific course by ID
 */
async function handleGetCourseById(courseId) {
  try {
    const course = await getCourseById(courseId);
    
    if (!course) {
      return createResponse(404, { error: 'Course not found' });
    }
    
    return createResponse(200, course);
  } catch (error) {
    console.error('Error getting course:', error);
    return createResponse(500, { error: 'Failed to get course' });
  }
}

// ====================================
// DEGREE REQUIREMENTS OPERATIONS
// ====================================

/**
 * Get degree requirements for a major
 */
async function handleGetDegreeRequirements(majorId) {
  try {
    const requirements = await getDegreeRequirements(majorId);
    
    if (!requirements) {
      return createResponse(404, { error: 'Degree requirements not found' });
    }
    
    return createResponse(200, requirements);
  } catch (error) {
    console.error('Error getting degree requirements:', error);
    return createResponse(500, { error: 'Failed to get degree requirements' });
  }
}

// ====================================
// FLOWCHART OPERATIONS
// ====================================

/**
 * Get course flowchart for a major
 */
async function handleGetFlowchart(majorId, queryParams) {
  try {
    const { year = '2024_2025' } = queryParams || {};
    const flowchartId = `${majorId}_${year}`;
    
    const flowchart = await getFlowchart(flowchartId);
    
    if (!flowchart) {
      return createResponse(404, { error: 'Flowchart not found' });
    }
    
    return createResponse(200, flowchart);
  } catch (error) {
    console.error('Error getting flowchart:', error);
    return createResponse(500, { error: 'Failed to get flowchart' });
  }
}

// ====================================
// DATABASE OPERATIONS
// ====================================

/**
 * Get course by ID from catalog
 */
async function getCourseById(courseId) {
  try {
    const command = new GetCommand({
      TableName: COURSE_CATALOG_TABLE,
      Key: { university_course_id: courseId }
    });
    const result = await dynamodb.send(command);
    return result.Item;
  } catch (error) {
    console.error(`Error getting course ${courseId}:`, error);
    return null;
  }
}

/**
 * Get courses by major
 */
async function getCoursesByMajor(university, major, limit = 20) {
  try {
    const command = new ScanCommand({
      TableName: COURSE_CATALOG_TABLE,
      FilterExpression: 'university = :university AND contains(required_for_majors, :major)',
      ExpressionAttributeValues: {
        ':university': university,
        ':major': major
      },
      Limit: parseInt(limit)
    });
    
    const result = await dynamodb.send(command);
    return createResponse(200, { courses: result.Items || [] });
  } catch (error) {
    console.error(`Error getting courses for major ${major}:`, error);
    return createResponse(500, { error: 'Failed to get courses' });
  }
}

/**
 * Get courses by department
 */
async function getCoursesByDepartment(university, department, limit = 20) {
  try {
    const command = new ScanCommand({
      TableName: COURSE_CATALOG_TABLE,
      FilterExpression: 'university = :university AND begins_with(course_code, :dept)',
      ExpressionAttributeValues: {
        ':university': university,
        ':dept': department.toUpperCase()
      },
      Limit: parseInt(limit)
    });
    
    const result = await dynamodb.send(command);
    return createResponse(200, { courses: result.Items || [] });
  } catch (error) {
    console.error(`Error getting courses for department ${department}:`, error);
    return createResponse(500, { error: 'Failed to get courses' });
  }
}

/**
 * Get degree requirements from DynamoDB
 */
async function getDegreeRequirements(majorId) {
  try {
    const command = new GetCommand({
      TableName: DEGREE_REQUIREMENTS_TABLE,
      Key: { university_major_id: majorId }
    });
    const result = await dynamodb.send(command);
    return result.Item;
  } catch (error) {
    console.error(`Error getting degree requirements for ${majorId}:`, error);
    return null;
  }
}

/**
 * Get flowchart from DynamoDB
 */
async function getFlowchart(flowchartId) {
  try {
    const command = new GetCommand({
      TableName: COURSE_FLOWCHART_TABLE,
      Key: { university_major_year: flowchartId }
    });
    const result = await dynamodb.send(command);
    return result.Item;
  } catch (error) {
    console.error(`Error getting flowchart for ${flowchartId}:`, error);
    return null;
  }
}

/**
 * Get relevant courses using multiple strategies
 */
async function getRelevantCourses(university, message, studentProfile) {
  try {
    const courses = [];
    
    // Get degree requirements if available
    let degreeRequirements = null;
    if (studentProfile?.major) {
      const universityKey = getUniversityKey(university);
      const majorId = `${universityKey}_${studentProfile.major.toLowerCase().replace(/\s+/g, '')}`;
      degreeRequirements = await getDegreeRequirements(majorId);
    }
    
    // Strategy 1: Get courses mentioned in message
    if (message) {
      const mentionedCourses = extractCourseCodesFromMessage(message);
      for (const courseCode of mentionedCourses) {
        const universityKey = getUniversityKey(university);
        const courseId = `${universityKey}_${courseCode.toLowerCase().replace(/\s+/g, '')}`;
        const courseData = await getCourseById(courseId);
        if (courseData) {
          courses.push(courseData);
        }
      }
    }
    
    // Strategy 2: Get courses from degree requirements
    if (degreeRequirements && degreeRequirements.requirements) {
      const reqCourses = await getCoursesFromDegreeRequirements(
        degreeRequirements, 
        studentProfile, 
        university
      );
      courses.push(...reqCourses);
    }
    
    // Strategy 3: Get flowchart courses for current year
    if (studentProfile?.academicYear && studentProfile?.major) {
      const flowchartCourses = await getFlowchartCourses(
        university, 
        studentProfile.major, 
        studentProfile.academicYear
      );
      courses.push(...flowchartCourses);
    }
    
    // Remove duplicates and limit
    const uniqueCourses = removeDuplicateCourses(courses);
    const limitedCourses = uniqueCourses.slice(0, 15);
    
    return { 
      courses: limitedCourses, 
      degreeRequirements,
      totalFound: uniqueCourses.length 
    };
  } catch (error) {
    console.error('Error getting relevant courses:', error);
    return { courses: [], degreeRequirements: null };
  }
}

/**
 * Get courses from degree requirements
 */
async function getCoursesFromDegreeRequirements(degreeRequirements, studentProfile, university) {
  const courses = [];
  
  try {
    if (degreeRequirements.requirements?.major_courses) {
      const majorCourses = degreeRequirements.requirements.major_courses.courses || [];
      
      for (const reqCourse of majorCourses.slice(0, 8)) {
        const universityKey = getUniversityKey(university);
        const courseId = `${universityKey}_${reqCourse.course_id.toLowerCase().replace(/\s+/g, '')}`;
        const courseData = await getCourseById(courseId);
        if (courseData) {
          courses.push(courseData);
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
 */
async function getFlowchartCourses(university, major, academicYear) {
  const courses = [];
  
  try {
    const universityKey = getUniversityKey(university);
    const flowchartId = `${universityKey}_${major.toLowerCase().replace(/\s+/g, '')}_2024_2025`;
    
    const flowchart = await getFlowchart(flowchartId);
    
    if (flowchart?.flowchart) {
      const yearMap = {
        'Freshman': 'year_1',
        'Sophomore': 'year_2', 
        'Junior': 'year_3',
        'Senior': 'year_4'
      };
      
      const flowchartYear = yearMap[academicYear];
      if (flowchartYear && flowchart.flowchart[flowchartYear]) {
        const yearData = flowchart.flowchart[flowchartYear];
        
        for (const quarter of ['fall', 'winter', 'spring']) {
          if (yearData[quarter]?.courses) {
            for (const course of yearData[quarter].courses.slice(0, 4)) {
              const courseId = `${universityKey}_${course.course_id.toLowerCase().replace(/\s+/g, '')}`;
              const courseData = await getCourseById(courseId);
              if (courseData) {
                courses.push(courseData);
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

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Get university key for database lookups
 */
function getUniversityKey(university) {
  if (typeof university === 'object' && university.name) {
    university = university.name;
  }
  
  const universityLower = university.toLowerCase();
  if (universityLower.includes('cal poly') || universityLower.includes('california polytechnic')) {
    return 'calpoly';
  }
  
  return university.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Extract course codes mentioned in message
 */
function extractCourseCodesFromMessage(message) {
  const coursePattern = /([A-Z]{2,4})\s*(\d{3})/gi;
  const matches = message.match(coursePattern) || [];
  return matches.map(match => match.replace(/\s+/g, ''));
}

/**
 * Remove duplicate courses from array
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
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// ====================================
// LOCAL TESTING
// ====================================

if (require.main === module) {
  (async () => {
    // Test getting course by ID
    const testEvent = {
      httpMethod: 'GET',
      path: '/courses/calpoly_csc101',
      pathParameters: { courseId: 'calpoly_csc101' }
    };
    
    console.log('Testing course service...');
    const result = await exports.handler(testEvent);
    console.log('Result:', JSON.stringify(result, null, 2));
  })();
}