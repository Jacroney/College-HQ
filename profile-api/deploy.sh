#!/bin/bash

# Profile API Deployment Script for College HQ

echo "🚀 Starting deployment of College HQ Profile API..."

# Set environment variables
export AWS_REGION=${AWS_REGION:-us-east-1}
export USERS_TABLE=${USERS_TABLE:-college-hq-users}

# Function name
FUNCTION_NAME="college-hq-profile-api"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Test the function locally first
echo "🧪 Testing function locally..."
node index.js

# Create deployment package
echo "📦 Creating deployment package..."
zip -r profile-api.zip . -x "node_modules/.bin/*" "*.sh" "*.md" "*.git*"

# Check if Lambda function exists
echo "🔍 Checking if Lambda function exists..."
aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "📝 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://profile-api.zip \
        --region $AWS_REGION
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/service-role/college-hq-profile-role-x86r4fou \
        --handler index.handler \
        --zip-file fileb://profile-api.zip \
        --timeout 30 \
        --environment Variables="{USERS_TABLE=$USERS_TABLE,AWS_REGION=$AWS_REGION}" \
        --region $AWS_REGION
fi

# Update environment variables
echo "🔧 Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{USERS_TABLE=$USERS_TABLE,AWS_REGION=$AWS_REGION}" \
    --region $AWS_REGION

# Clean up
rm profile-api.zip

echo "✅ Deployment completed successfully!"
echo "🌐 You now need to configure API Gateway to route /profile/{userId} requests to this function"
echo "📋 Function ARN: $(aws lambda get-function --function-name $FUNCTION_NAME --query Configuration.FunctionArn --output text --region $AWS_REGION)"

# Instructions for API Gateway configuration
echo ""
echo "📋 Next steps:"
echo "1. Go to API Gateway console"
echo "2. Find your existing API (lm8ngppg22)"
echo "3. Create a new resource: /profile"
echo "4. Create a sub-resource: /{userId}"
echo "5. Create GET and PUT methods for the /{userId} resource"
echo "6. Point both methods to the Lambda function: $FUNCTION_NAME"
echo "7. Deploy the API to the 'dev' stage"