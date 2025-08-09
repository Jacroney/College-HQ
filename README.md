# College HQ

A modern, AI-powered academic dashboard for college students, featuring a simple frontend and a scalable AWS backend. The platform currently includes an Advising Agent powered by Amazon Bedrock (Claude 3 Sonnet) for personalized academic guidance.

---

## Features

- **Dashboard**: Clean, modern dashboard UI (React + MUI)
- **Advising Agent**: Chat with an AI academic advisor (Claude 3 Sonnet via AWS Bedrock)
- **Navigation**: Simple sidebar for easy access to Dashboard and Advising

---

## Architecture Overview

### Frontend

- React 18 + TypeScript
- Material-UI (MUI) for UI components
- Framer Motion for animation
- Advising chat page with real-time API integration
- Minimalist: Only Dashboard, Advising, and Navigation components/pages remain

### Backend (AWS Microservices)

**5 Separate Lambda Functions:**
- **auth-handler**: JWT validation and authorization (128 MB)
- **profile-service**: User profile CRUD operations (256 MB)
- **advising-service**: AI advisor using Amazon Bedrock Claude 3 Sonnet (512 MB)
- **course-service**: Course catalog, degree requirements, flowcharts (256 MB)
- **conversation-service**: Chat history and conversation management (256 MB)

**Infrastructure:**
- AWS API Gateway for routing requests to appropriate services
- Amazon Bedrock (Claude 3 Sonnet) for AI responses
- AWS DynamoDB for data persistence (users, conversations, courses)
- AWS Cognito for authentication
- Service-to-service communication via Lambda invoke

---

## Getting Started

### Prerequisites

- Node.js 18+
- AWS account (free tier)
- AWS CLI configured with credentials

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Access the app at `http://localhost:5173` (default Vite port)

#### Frontend Structure

```
src/
  components/
    Dashboard/
    Navigation/
  pages/
    Advising.tsx
    Profile.tsx
    NotFound.tsx
```

- **Dashboard**: Main landing page
- **Advising**: Chat interface for the advising agent
- **Navigation**: Sidebar with links to Dashboard and Advising

### Backend Setup (AWS Lambda Functions)

1. **Deploy Lambda Functions:**
   ```bash
   cd lambda-functions
   
   # Option 1: Deploy all functions at once
   ./deploy-all.sh
   
   # Option 2: Deploy individually
   cd profile-service
   npm install
   npm run deploy
   ```

2. **Create Functions (first time only):**
   ```bash
   cd lambda-functions
   
   # Set up execution role first
   export LAMBDA_EXECUTION_ROLE_ARN="arn:aws:iam::ACCOUNT_ID:role/college-hq-lambda-role"
   
   # Create all functions
   ./create-functions.sh
   ```

3. **Set up API Gateway:**
   - Follow the guide in `API_GATEWAY_SETUP.md`
   - Configure routes to map to each Lambda function
   - Set up JWT authorization with `auth-handler`

4. **Configure Environment Variables:**
   - Each Lambda function has specific environment variables
   - See `API_GATEWAY_SETUP.md` for details

#### API Endpoints

**Profile Service:**
- `GET /profile/{userId}` - Get user profile
- `PUT /profile/{userId}` - Update user profile
- `POST /profile/{userId}` - Create user profile

**Advising Service:**
- `POST /advising` - Send message to AI advisor
  ```json
  {
    "userId": "string",
    "message": "string",
    "conversationId": "string (optional)"
  }
  ```

**Course Service:**
- `GET /courses` - Get courses with filters
- `GET /courses/{courseId}` - Get specific course
- `POST /courses/search` - Search courses with context
- `GET /degree-requirements/{majorId}` - Get degree requirements

**Conversation Service:**
- `GET /conversations/{userId}` - List user conversations
- `POST /conversations` - Create new conversation
- `POST /conversations/message` - Store conversation message

#### Local Testing

Each Lambda function can be tested individually:
```bash
cd lambda-functions/[service-name]
npm test
```

---

## AWS Stack

- **Amazon Bedrock**: Claude 3 Sonnet for LLM responses
- **AWS Lambda**: Serverless compute for the advising agent
- **Amazon API Gateway**: (Recommended) to expose Lambda as REST endpoint
- **Amazon DynamoDB**: Stores user profiles and conversation history
- **IAM Roles/Policies**: Grant Lambda access to Bedrock and DynamoDB

### Example Environment Variables

```
AWS_REGION=us-east-1
USERS_TABLE=college-hq-users
CONVERSATIONS_TABLE=college-hq-conversations
```

---

## Usage

- Log in to the frontend and navigate to the Advising page
- Start a conversation with the AI advisor
- All messages and context are stored in DynamoDB for continuity

---

## License

MIT License - see LICENSE file for details
