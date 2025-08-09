# Lambda Functions

This directory contains all AWS Lambda functions for the College HQ application.

## Structure

```
lambda-functions/
├── auth-handler/        # JWT validation and authorization
├── profile-service/     # User profile CRUD operations  
├── advising-service/    # AI advising agent (Bedrock)
├── course-service/      # Course catalog and requirements
├── conversation-service/# Chat history management
└── shared/             # Shared utilities and helpers
```

## Deployment

Each function can be deployed independently:

```bash
cd lambda-functions/[function-name]
npm run deploy
```

Or deploy all functions:

```bash
cd lambda-functions
./deploy-all.sh
```

## Local Testing

Each function has a test script:

```bash
cd lambda-functions/[function-name]
npm test
```

## Environment Variables

Each function uses these environment variables:
- `AWS_REGION` - AWS region (default: us-east-1)
- `USERS_TABLE` - DynamoDB users table
- `CONVERSATIONS_TABLE` - DynamoDB conversations table
- `COURSE_CATALOG_TABLE` - DynamoDB course catalog table
- `DEGREE_REQUIREMENTS_TABLE` - DynamoDB degree requirements table

## Function Details

### auth-handler
- Validates JWT tokens from Cognito
- Provides authorization for API Gateway
- Returns user context for other services

### profile-service
- GET /profile/{userId} - Get user profile
- PUT /profile/{userId} - Update user profile
- POST /profile - Create new profile

### advising-service
- POST /advising - Send message to AI advisor
- Uses Amazon Bedrock (Claude 3 Sonnet)
- Maintains conversation context

### course-service
- GET /courses - List all courses
- GET /courses/{courseId} - Get specific course
- GET /degree-requirements/{majorId} - Get requirements
- GET /flowchart/{majorId}/{year} - Get course flowchart

### conversation-service
- GET /conversations/{userId} - List user conversations
- GET /conversations/{userId}/{conversationId} - Get conversation
- POST /conversations - Store new message