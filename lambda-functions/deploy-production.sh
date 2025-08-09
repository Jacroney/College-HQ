#!/bin/bash

# Deploy all Lambda functions to production (your created functions)
# Usage: ./deploy-production.sh

set -e

echo "🚀 Deploying College HQ Lambda Functions..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration - Your actual function names
AUTH_HANDLER="college-hq-auth-handler"
PROFILE_SERVICE="college-hq-profile-service"
COURSE_SERVICE="college-hq-course-service"
CONVERSATION_SERVICE="college-hq-conversation-service"
ADVISING_SERVICE="college-hq-advising-service"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured or insufficient permissions."
    print_status "Make sure your user has lambda:UpdateFunctionCode permission."
    exit 1
fi

print_status "AWS Account: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'Unknown')"
print_status "AWS Region: ${AWS_REGION:-us-east-1}"

# Deploy functions one by one
deploy_function() {
    local_name=$1
    aws_name=$2
    
    if [ -d "$local_name" ] && [ -f "$local_name/package.json" ]; then
        print_status "Deploying $local_name -> $aws_name..."
        
        cd "$local_name"
        
        # Install production dependencies if needed
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
            print_status "Installing dependencies for $local_name..."
            npm install --production --silent
        fi
        
        # Create deployment package
        print_status "Creating deployment package..."
        zip -rq "../${local_name}-deploy.zip" . -x "*.zip" "*.git*" "*.DS_Store" "npm-debug.log*" "yarn-debug.log*" "yarn-error.log*"
        
        # Try to update the function
        print_status "Uploading to AWS Lambda..."
        if aws lambda update-function-code \
            --function-name "$aws_name" \
            --zip-file "fileb://../${local_name}-deploy.zip" \
            --region "${AWS_REGION:-us-east-1}" \
            --output text &>/dev/null; then
            
            print_success "✅ Deployed $local_name"
        else
            print_error "❌ Failed to deploy $local_name"
            print_warning "Check if function $aws_name exists and you have permissions"
        fi
        
        # Clean up
        rm -f "../${local_name}-deploy.zip"
        cd ..
        
    else
        print_warning "⚠️  Skipping $local_name (directory not found or no package.json)"
    fi
    
    echo ""
}

# Deploy all functions
deploy_function "auth-handler" "$AUTH_HANDLER"
deploy_function "profile-service" "$PROFILE_SERVICE" 
deploy_function "course-service" "$COURSE_SERVICE"
deploy_function "conversation-service" "$CONVERSATION_SERVICE"
deploy_function "advising-service" "$ADVISING_SERVICE"

print_success "🎉 Deployment process complete!"
print_status "Check AWS Lambda console to verify deployments"