# Profile API Setup Guide

## Problem Identified
The frontend Profile.tsx is trying to call `/profile/{userId}` endpoints, but these don't exist in the API Gateway. Only the `/advising` endpoint is currently configured.

## Solution Implemented
I've modified the existing advising agent Lambda function to handle both profile and advising requests. The function now:

1. **Detects request type** - Profile requests have `httpMethod` and `pathParameters`
2. **Routes accordingly** - Profile requests go to profile handlers, others to advising handlers
3. **Handles profile operations** - GET to retrieve profiles, PUT to update profiles
4. **Creates default profiles** - When a user doesn't exist, creates a default profile

## Files Modified
- `/Users/joe/Desktop/Projects/College HQ/advising-agent/index.js` - Updated to handle profile routes

## Files Created
- `/Users/joe/Desktop/Projects/College HQ/profile-api/index.js` - Standalone profile API (alternative approach)
- `/Users/joe/Desktop/Projects/College HQ/profile-api/package.json` - Package configuration
- `/Users/joe/Desktop/Projects/College HQ/profile-api/deploy.sh` - Deployment script

## Required Actions to Fix the Issue

### Option 1: Update API Gateway (Recommended)
1. Go to AWS API Gateway console
2. Find your API: `lm8ngppg22`
3. Add a new resource: `/profile`
4. Add a sub-resource: `/{userId}`
5. Create GET and PUT methods for `/{userId}`
6. Point both methods to the existing Lambda function: `college-hq-advising-agent`
7. Deploy the API to the 'dev' stage

### Option 2: Deploy Updated Lambda Function
Since I don't have permissions to update the Lambda function directly, you'll need to:

1. Deploy the updated advising agent:
```bash
cd "/Users/joe/Desktop/Projects/College HQ/advising-agent"
zip -r advising-agent.zip . -x "*.git*" "*.md" "node_modules/.bin/*"
aws lambda update-function-code --function-name "college-hq-advising-agent" --zip-file fileb://advising-agent.zip
```

2. Then configure API Gateway as described in Option 1.

## Testing the Fix

Once deployed, test the profile API:

```bash
# Test GET profile
curl -X GET "https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev/profile/test-user-123"

# Test PUT profile
curl -X PUT "https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev/profile/test-user-123" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@calpoly.edu",
    "major": "Computer Science",
    "gpa": 3.5
  }'
```

## Expected Results
- Profile page should load without "failed to fetch profile" error
- User profiles should be saved to DynamoDB
- Default profiles should be created for new users
- Existing advising functionality should continue to work

## Technical Details
- **DynamoDB Table**: `college-hq-users` (already exists)
- **Lambda Function**: `college-hq-advising-agent` (updated to handle profiles)
- **API Gateway**: Needs new `/profile/{userId}` routes
- **Frontend**: No changes needed - already calling correct endpoints

## Code Changes Summary
The modified `index.js` now includes:
- `handleProfileRequest()` - Routes profile requests
- `getProfile()` - Retrieves user profiles
- `updateProfile()` - Updates user profiles  
- `createDefaultProfile()` - Creates default profiles
- `saveProfile()` - Saves profiles to DynamoDB

The function maintains backward compatibility with existing advising functionality while adding profile management capabilities.