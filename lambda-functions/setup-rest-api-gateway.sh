#!/bin/bash

# REST API Gateway configuration script
# This script configures the existing REST API Gateway to route to Lambda functions

API_ID="lm8ngppg22"
REGION="us-east-1"
ACCOUNT_ID="307122262080"

echo "🔧 Configuring REST API Gateway routes for College HQ..."

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id | [0]" --output text)
echo "Root resource ID: $ROOT_RESOURCE_ID"

# Function to create resource if it doesn't exist
create_resource() {
    local parent_id=$1
    local path_part=$2
    
    # Check if resource already exists
    RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --query "items[?pathPart=='$path_part' && parentId=='$parent_id'].id | [0]" \
        --output text 2>/dev/null)
    
    if [ "$RESOURCE_ID" = "None" ] || [ -z "$RESOURCE_ID" ]; then
        echo "  Creating resource: $path_part"
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $parent_id \
            --path-part $path_part \
            --query 'id' \
            --output text)
    else
        echo "  Resource exists: $path_part ($RESOURCE_ID)"
    fi
    
    echo $RESOURCE_ID
}

# Function to create method and integration
create_method_integration() {
    local resource_id=$1
    local method=$2
    local function_name=$3
    
    echo "    Setting up $method method for $function_name"
    
    # Create method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $method \
        --authorization-type NONE \
        --no-api-key-required 2>/dev/null || echo "    Method $method already exists"
    
    # Create integration
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $method \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$function_name/invocations" 2>/dev/null || echo "    Integration already exists"
    
    # Set up CORS
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $method \
        --status-code 200 \
        --response-models application/json=Empty \
        --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false 2>/dev/null
    
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $method \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers="'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",method.response.header.Access-Control-Allow-Methods="'*'",method.response.header.Access-Control-Allow-Origin="'*'" 2>/dev/null
}

echo "📍 Setting up resources and methods..."

# Create /advising resource and method
echo "Setting up /advising"
ADVISING_ID=$(create_resource $ROOT_RESOURCE_ID "advising")
create_method_integration $ADVISING_ID "POST" "college-hq-advising-service"
create_method_integration $ADVISING_ID "OPTIONS" "college-hq-advising-service"

# Create /profile resource
echo "Setting up /profile"
PROFILE_ID=$(create_resource $ROOT_RESOURCE_ID "profile")

# Create /profile/{userId} resource
echo "Setting up /profile/{userId}"
PROFILE_USERID_ID=$(create_resource $PROFILE_ID "{userId}")
create_method_integration $PROFILE_USERID_ID "GET" "college-hq-profile-service"
create_method_integration $PROFILE_USERID_ID "PUT" "college-hq-profile-service"
create_method_integration $PROFILE_USERID_ID "POST" "college-hq-profile-service"
create_method_integration $PROFILE_USERID_ID "DELETE" "college-hq-profile-service"
create_method_integration $PROFILE_USERID_ID "OPTIONS" "college-hq-profile-service"

# Create /courses resource
echo "Setting up /courses"
COURSES_ID=$(create_resource $ROOT_RESOURCE_ID "courses")
create_method_integration $COURSES_ID "GET" "college-hq-course-service"

# Create /courses/{courseId} resource
echo "Setting up /courses/{courseId}"
COURSES_COURSEID_ID=$(create_resource $COURSES_ID "{courseId}")
create_method_integration $COURSES_COURSEID_ID "GET" "college-hq-course-service"

# Create /courses/search resource
echo "Setting up /courses/search"
COURSES_SEARCH_ID=$(create_resource $COURSES_ID "search")
create_method_integration $COURSES_SEARCH_ID "POST" "college-hq-course-service"

# Deploy the API
echo "🚀 Deploying API..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name dev \
    --description "Updated routes for Lambda functions" 2>/dev/null

echo "✅ REST API Gateway configuration complete!"
echo ""
echo "Your API is available at:"
echo "https://$API_ID.execute-api.$REGION.amazonaws.com/dev"
echo ""
echo "Test the advising endpoint:"
echo "curl -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/dev/advising \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"userId\":\"test123\",\"message\":\"What courses should I take?\"}'"