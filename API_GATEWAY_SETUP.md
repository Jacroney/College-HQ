# API Gateway Setup Guide

This guide explains how to configure AWS API Gateway to route requests to your separated Lambda functions.

## Overview

Your College HQ application now uses 5 separate Lambda functions instead of 1 monolithic function. API Gateway will route requests to the appropriate service based on the URL path.

## API Gateway Configuration

### Base URL Structure
```
https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/dev
```

### Route Mapping

| HTTP Method | Path | Lambda Function | Description |
|-------------|------|-----------------|-------------|
| POST | `/auth/validate` | `auth-handler` | Validate JWT tokens |
| GET | `/profile/{userId}` | `profile-service` | Get user profile |
| PUT | `/profile/{userId}` | `profile-service` | Update user profile |
| POST | `/profile/{userId}` | `profile-service` | Create user profile |
| DELETE | `/profile/{userId}` | `profile-service` | Delete user profile |
| POST | `/advising` | `advising-service` | Send message to AI advisor |
| GET | `/courses` | `course-service` | Get courses with filters |
| GET | `/courses/{courseId}` | `course-service` | Get specific course |
| POST | `/courses/search` | `course-service` | Search courses with context |
| GET | `/degree-requirements/{majorId}` | `course-service` | Get degree requirements |
| GET | `/flowchart/{majorId}` | `course-service` | Get course flowchart |
| POST | `/conversations` | `conversation-service` | Create new conversation |
| GET | `/conversations/{userId}` | `conversation-service` | List user conversations |
| GET | `/conversations/{userId}/{conversationId}` | `conversation-service` | Get specific conversation |
| DELETE | `/conversations/{userId}/{conversationId}` | `conversation-service` | Delete conversation |
| POST | `/conversations/message` | `conversation-service` | Store conversation message |

### Step-by-Step Setup

#### 1. Create API Gateway

```bash
aws apigateway create-rest-api \
  --name "college-hq-api" \
  --description "College HQ microservices API" \
  --endpoint-configuration types=REGIONAL
```

#### 2. Create Resources and Methods

For each route, create the resource and method, then integrate with Lambda:

**Example for Profile Service:**

```bash
# Create /profile resource
aws apigateway create-resource \
  --rest-api-id YOUR_API_ID \
  --parent-id ROOT_RESOURCE_ID \
  --path-part "profile"

# Create /{userId} resource under /profile
aws apigateway create-resource \
  --rest-api-id YOUR_API_ID \
  --parent-id PROFILE_RESOURCE_ID \
  --path-part "{userId}"

# Create GET method
aws apigateway put-method \
  --rest-api-id YOUR_API_ID \
  --resource-id USERID_RESOURCE_ID \
  --http-method GET \
  --authorization-type AWS_IAM

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id YOUR_API_ID \
  --resource-id USERID_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:profile-service/invocations"
```

#### 3. Set Up Authorization (Optional)

For routes that need authentication, configure the `auth-handler` as an authorizer:

```bash
# Create Lambda authorizer
aws apigateway create-authorizer \
  --rest-api-id YOUR_API_ID \
  --name "jwt-authorizer" \
  --type REQUEST \
  --authorizer-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:auth-handler/invocations" \
  --identity-source "method.request.header.Authorization"
```

#### 4. Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name dev \
  --description "Initial deployment with separated Lambda functions"
```

## Lambda Function Permissions

Each Lambda function needs permission to be invoked by API Gateway:

```bash
# Example for profile-service
aws lambda add-permission \
  --function-name profile-service \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:ACCOUNT_ID:YOUR_API_ID/*/*"
```

Repeat for each Lambda function:
- `auth-handler`
- `profile-service` 
- `advising-service`
- `course-service`
- `conversation-service`

## Environment Variables for Lambda Functions

Each Lambda function should have these environment variables:

### Common Variables (all functions)
```bash
AWS_REGION=us-east-1
```

### auth-handler
```bash
USER_POOL_ID=your_cognito_user_pool_id
```

### profile-service
```bash
USERS_TABLE=college-hq-users
```

### advising-service
```bash
USERS_TABLE=college-hq-users
CONVERSATIONS_TABLE=college-hq-conversations
PROFILE_SERVICE=profile-service
COURSE_SERVICE=course-service
CONVERSATION_SERVICE=conversation-service
```

### course-service
```bash
COURSE_CATALOG_TABLE=college-hq-course-catalog
DEGREE_REQUIREMENTS_TABLE=college-hq-degree-requirements
COURSE_FLOWCHART_TABLE=college-hq-course-flowchart
```

### conversation-service
```bash
CONVERSATIONS_TABLE=college-hq-conversations
```

## IAM Roles and Policies

### Lambda Execution Role

Each Lambda function needs specific DynamoDB permissions:

**profile-service policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/college-hq-users"
    }
  ]
}
```

**advising-service policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:profile-service",
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:course-service",
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:conversation-service"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/college-hq-users",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/college-hq-conversations"
      ]
    }
  ]
}
```

## Testing the API

After setup, test each endpoint:

```bash
# Test profile service
curl -X GET \
  "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/profile/user123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test advising service  
curl -X POST \
  "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/advising" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","message":"What courses should I take?"}'

# Test course service
curl -X GET \
  "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/courses?university=Cal%20Poly&major=Computer%20Science"
```

## Frontend Configuration

Update your `.env.local` file with the new API Gateway URL:

```bash
VITE_API_URL=https://your-new-api-id.execute-api.us-east-1.amazonaws.com/dev
```

## Monitoring and Logging

Enable CloudWatch logging for API Gateway and all Lambda functions to monitor performance and debug issues.

## CORS Configuration

Ensure CORS is configured for all routes to allow your frontend domain:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
}
```

All Lambda functions already include CORS headers in their responses.