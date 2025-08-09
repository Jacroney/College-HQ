#!/bin/bash

# Deploy all Lambda functions to development environment
# Usage: ./deploy-dev.sh

set -e

echo "🚀 Deploying College HQ Lambda Functions to Development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="dev"
STACK_NAME="college-hq-lambda-stack"

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

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

print_status "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
print_status "AWS Region: $AWS_REGION"

# Array of Lambda functions to deploy
functions=(
    "auth-handler"
    "profile-service"
    "course-service"
    "conversation-service"
    "advising-service"
)

# Deploy each function
for func in "${functions[@]}"; do
    if [ -d "$func" ] && [ -f "$func/package.json" ]; then
        print_status "Deploying $func..."
        
        cd "$func"
        
        # Install dependencies if node_modules doesn't exist
        if [ ! -d "node_modules" ]; then
            print_status "Installing dependencies for $func..."
            npm install --production --silent
        fi
        
        # Create deployment package
        print_status "Creating deployment package for $func..."
        zip -rq "${func}.zip" . -x "*.zip" "node_modules/aws-sdk/*" "*.git*" "*.DS_Store"
        
        # Check if Lambda function exists
        if aws lambda get-function --function-name "$func" --region "$AWS_REGION" &> /dev/null; then
            print_status "Updating existing function: $func"
            
            # Update function code
            aws lambda update-function-code \
                --function-name "$func" \
                --zip-file "fileb://${func}.zip" \
                --region "$AWS_REGION" \
                --output text &> /dev/null
                
            print_success "Updated $func"
        else
            print_warning "Function $func does not exist. Please create it first using the AWS Console or CloudFormation."
            print_status "You can create it with these settings:"
            print_status "  - Runtime: Node.js 18.x"
            print_status "  - Handler: index.handler"
            print_status "  - Architecture: x86_64"
            print_status "  - Memory: 256 MB (512 MB for advising-service)"
            print_status "  - Timeout: 30 seconds (60 seconds for advising-service)"
        fi
        
        # Clean up
        rm -f "${func}.zip"
        
        cd ..
        echo ""
        
    else
        print_warning "Skipping $func (directory not found or no package.json)"
    fi
done

print_success "Deployment complete!"
print_status "Next steps:"
echo "  1. Configure API Gateway routes (see API_GATEWAY_SETUP.md)"
echo "  2. Set up environment variables for each function"
echo "  3. Configure IAM roles and policies"
echo "  4. Test the endpoints"
echo ""
print_status "Monitor logs with:"
echo "  aws logs tail /aws/lambda/FUNCTION_NAME --follow"