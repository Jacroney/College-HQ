#!/bin/bash

# Create all Lambda functions in AWS
# Usage: ./create-functions.sh

set -e

echo "🚀 Creating College HQ Lambda Functions..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
if [ -z "$LAMBDA_EXECUTION_ROLE_ARN" ]; then
    print_error "LAMBDA_EXECUTION_ROLE_ARN environment variable is required"
    echo "Create an execution role first:"
    echo "  aws iam create-role --role-name college-hq-lambda-role --assume-role-policy-document file://lambda-trust-policy.json"
    exit 1
fi

print_status "Using execution role: $LAMBDA_EXECUTION_ROLE_ARN"

# Create auth-handler
create_auth_handler() {
    print_status "Creating auth-handler function..."
    
    cd auth-handler
    npm install --production --silent
    zip -rq auth-handler.zip . -x "*.zip" "*.git*" "*.DS_Store"
    
    aws lambda create-function \
        --function-name "auth-handler" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://auth-handler.zip" \
        --description "JWT validation and authorization service" \
        --timeout 10 \
        --memory-size 128 \
        --environment Variables="{AWS_REGION=$AWS_REGION,USER_POOL_ID=${USER_POOL_ID:-}}" \
        --region "$AWS_REGION"
    
    rm -f auth-handler.zip
    cd ..
    print_success "Created auth-handler"
}

# Create profile-service
create_profile_service() {
    print_status "Creating profile-service function..."
    
    cd profile-service
    npm install --production --silent
    zip -rq profile-service.zip . -x "*.zip" "*.git*" "*.DS_Store"
    
    aws lambda create-function \
        --function-name "profile-service" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://profile-service.zip" \
        --description "User profile CRUD operations" \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{AWS_REGION=$AWS_REGION,USERS_TABLE=college-hq-users}" \
        --region "$AWS_REGION"
    
    rm -f profile-service.zip
    cd ..
    print_success "Created profile-service"
}

# Create course-service
create_course_service() {
    print_status "Creating course-service function..."
    
    cd course-service
    npm install --production --silent
    zip -rq course-service.zip . -x "*.zip" "*.git*" "*.DS_Store"
    
    aws lambda create-function \
        --function-name "course-service" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://course-service.zip" \
        --description "Course catalog and degree requirements service" \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{AWS_REGION=$AWS_REGION,COURSE_CATALOG_TABLE=college-hq-course-catalog,DEGREE_REQUIREMENTS_TABLE=college-hq-degree-requirements,COURSE_FLOWCHART_TABLE=college-hq-course-flowchart}" \
        --region "$AWS_REGION"
    
    rm -f course-service.zip
    cd ..
    print_success "Created course-service"
}

# Create conversation-service
create_conversation_service() {
    print_status "Creating conversation-service function..."
    
    cd conversation-service
    npm install --production --silent
    zip -rq conversation-service.zip . -x "*.zip" "*.git*" "*.DS_Store"
    
    aws lambda create-function \
        --function-name "conversation-service" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://conversation-service.zip" \
        --description "Conversation history management service" \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{AWS_REGION=$AWS_REGION,CONVERSATIONS_TABLE=college-hq-conversations}" \
        --region "$AWS_REGION"
    
    rm -f conversation-service.zip
    cd ..
    print_success "Created conversation-service"
}

# Create advising-service
create_advising_service() {
    print_status "Creating advising-service function..."
    
    cd advising-service
    npm install --production --silent
    zip -rq advising-service.zip . -x "*.zip" "*.git*" "*.DS_Store"
    
    aws lambda create-function \
        --function-name "advising-service" \
        --runtime "nodejs18.x" \
        --role "$LAMBDA_EXECUTION_ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://advising-service.zip" \
        --description "AI academic advising service using Amazon Bedrock" \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{AWS_REGION=$AWS_REGION,PROFILE_SERVICE=profile-service,COURSE_SERVICE=course-service,CONVERSATION_SERVICE=conversation-service}" \
        --region "$AWS_REGION"
    
    rm -f advising-service.zip
    cd ..
    print_success "Created advising-service"
}

# Create all functions
print_status "Creating all Lambda functions in region: $AWS_REGION"

create_auth_handler
create_profile_service
create_course_service
create_conversation_service
create_advising_service

print_success "All Lambda functions created successfully!"
print_status "Next steps:"
echo "  1. Set up API Gateway (see API_GATEWAY_SETUP.md)"
echo "  2. Configure IAM policies for DynamoDB access"
echo "  3. Test each function"
echo ""
print_status "List your functions:"
echo "  aws lambda list-functions --region $AWS_REGION"