#!/bin/bash

# API Gateway configuration script
# This script configures the existing API Gateway to route to Lambda functions

API_ID="lm8ngppg22"
REGION="us-east-1"
ACCOUNT_ID="307122262080"

echo "🔧 Configuring API Gateway routes for College HQ..."

# Test if we have access to API Gateway
echo "Testing API Gateway access..."
aws apigatewayv2 get-api --api-id $API_ID 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Cannot access API Gateway. You need to:"
    echo "   1. Add API Gateway permissions to your IAM user"
    echo "   2. Or use the AWS Console to configure routes manually"
    echo ""
    echo "Routes needed:"
    echo "   POST /auth/validate → college-hq-auth-handler"
    echo "   GET /profile/{userId} → college-hq-profile-service"
    echo "   PUT /profile/{userId} → college-hq-profile-service"
    echo "   POST /profile/{userId} → college-hq-profile-service"
    echo "   DELETE /profile/{userId} → college-hq-profile-service"
    echo "   POST /advising → college-hq-advising-service"
    echo "   GET /courses → college-hq-course-service"
    echo "   GET /courses/{courseId} → college-hq-course-service"
    echo "   POST /courses/search → college-hq-course-service"
    echo "   GET /degree-requirements/{majorId} → college-hq-course-service"
    echo "   GET /flowchart/{majorId} → college-hq-course-service"
    echo "   POST /conversations → college-hq-conversation-service"
    echo "   GET /conversations/{userId} → college-hq-conversation-service"
    echo "   GET /conversations/{userId}/{conversationId} → college-hq-conversation-service"
    echo "   DELETE /conversations/{userId}/{conversationId} → college-hq-conversation-service"
    echo "   POST /conversations/message → college-hq-conversation-service"
    exit 1
fi

echo "✅ API Gateway access confirmed"

# Function to create or update a route
create_route() {
    local method=$1
    local path=$2
    local function=$3
    
    echo "  Configuring $method $path → $function"
    
    # Create integration if it doesn't exist
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id $API_ID \
        --integration-type AWS_PROXY \
        --integration-method POST \
        --integration-uri "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$function" \
        --payload-format-version 2.0 \
        --query 'IntegrationId' \
        --output text 2>/dev/null)
    
    if [ -z "$INTEGRATION_ID" ]; then
        # Get existing integration
        INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
            --api-id $API_ID \
            --query "Items[?IntegrationUri=='arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$function'].IntegrationId | [0]" \
            --output text)
    fi
    
    # Create or update route
    ROUTE_KEY="$method $path"
    aws apigatewayv2 create-route \
        --api-id $API_ID \
        --route-key "$ROUTE_KEY" \
        --target "integrations/$INTEGRATION_ID" \
        --output text 2>/dev/null || \
    aws apigatewayv2 update-route \
        --api-id $API_ID \
        --route-key "$ROUTE_KEY" \
        --target "integrations/$INTEGRATION_ID" \
        --output text 2>/dev/null
}

echo "📍 Setting up routes..."

# Auth routes
create_route "POST" "/auth/validate" "college-hq-auth-handler"

# Profile routes  
create_route "GET" "/profile/{userId}" "college-hq-profile-service"
create_route "PUT" "/profile/{userId}" "college-hq-profile-service"
create_route "POST" "/profile/{userId}" "college-hq-profile-service"
create_route "DELETE" "/profile/{userId}" "college-hq-profile-service"

# Advising routes
create_route "POST" "/advising" "college-hq-advising-service"
create_route "OPTIONS" "/advising" "college-hq-advising-service"

# Course routes
create_route "GET" "/courses" "college-hq-course-service"
create_route "GET" "/courses/{courseId}" "college-hq-course-service"
create_route "POST" "/courses/search" "college-hq-course-service"
create_route "GET" "/degree-requirements/{majorId}" "college-hq-course-service"
create_route "GET" "/flowchart/{majorId}" "college-hq-course-service"

# Conversation routes
create_route "POST" "/conversations" "college-hq-conversation-service"
create_route "GET" "/conversations/{userId}" "college-hq-conversation-service"
create_route "GET" "/conversations/{userId}/{conversationId}" "college-hq-conversation-service"
create_route "DELETE" "/conversations/{userId}/{conversationId}" "college-hq-conversation-service"
create_route "POST" "/conversations/message" "college-hq-conversation-service"

echo "✨ API Gateway configuration complete!"
echo ""
echo "Your API is available at:"
echo "https://$API_ID.execute-api.$REGION.amazonaws.com/dev"