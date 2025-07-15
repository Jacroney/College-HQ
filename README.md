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

### Backend (AWS Lambda)

- Node.js Lambda function (`advising-agent`)
- Amazon Bedrock (Claude 3 Sonnet) for LLM responses
- AWS DynamoDB for user profiles and conversation history
- REST API (POST /advising) for agent interaction
- Environment variables for configuration

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

### Backend Setup (AWS Lambda Advising Agent)

1. Go to `advising-agent/` directory:
   ```bash
   cd advising-agent
   npm install
   ```
2. Configure AWS credentials (via environment, `.env`, or `~/.aws/credentials`)
3. Deploy as a Lambda function (Node.js 18.x runtime recommended)
4. Set environment variables:
   - `AWS_REGION` (default: `us-east-1`)
   - `USERS_TABLE` (DynamoDB table for user profiles)
   - `CONVERSATIONS_TABLE` (DynamoDB table for conversations)

#### Lambda API

- **Endpoint:** `POST /advising`
- **Request Body:**
  ```json
  {
    "userId": "string",
    "message": "string",
    "conversationId": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "agent": "advising",
    "userId": "string",
    "conversationId": "string",
    "response": "string (AI response)",
    "timestamp": "ISO string"
  }
  ```

#### Local Testing

- Run the Lambda locally:
  ```bash
  node index.js
  ```
- Edit the test block in `index.js` to simulate requests

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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

---

## License

MIT License - see LICENSE file for details
