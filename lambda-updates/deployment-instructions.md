# Lambda Function Update - Cognito JWT Integration

## 🚀 What Changed

Your Lambda function now:
- ✅ **Validates Cognito JWT tokens** from Authorization headers
- ✅ **Uses Cognito sub as user_id** (the DynamoDB primary key)
- ✅ **Auto-creates profiles** for first-time users using Cognito data
- ✅ **Maintains existing functionality** for course lookup and profile management

## 📋 Deployment Steps

### 1. Add New Dependencies
```bash
cd your-lambda-function-directory
npm install jsonwebtoken@^9.0.2 jwk-to-pem@^2.0.5
```

### 2. Update Environment Variables
Add these to your Lambda function's environment variables:

```
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_yourPoolId  # Replace with your actual pool ID
COGNITO_CLIENT_ID=your-client-id           # Replace with your actual client ID
```

### 3. Replace Your Lambda Function Code
Replace your existing Lambda function code with the updated version in `updated-profile-lambda.js`.

### 4. Update API Gateway (if needed)
Ensure your API Gateway passes through the `Authorization` header:
- Go to your API Gateway console
- Select your API → Resources → Methods
- Click "Method Request"
- Under "HTTP Request Headers", add `Authorization` if not present

### 5. Test the Integration

#### Test with Postman or curl:
```bash
curl -X GET \
  'https://your-api-gateway-url/profile/dev' \
  -H 'Authorization: Bearer your-cognito-id-token'
```

#### Test with your frontend:
Your existing frontend code should work automatically since it already sends the Authorization header.

## 🔄 Migration Path for Existing Users

### Option A: Gradual Migration (Recommended)
1. Deploy the updated Lambda
2. Existing users will be gradually migrated as they log in
3. New Cognito sub-based records will be created automatically

### Option B: Full Migration
If you want to migrate all existing users at once, run the migration script:
```bash
python user-migration-script.py
```

## 🔍 How It Works Now

### Before (Old Flow):
```
User → API → Lambda → DynamoDB (user_id: generated)
```

### After (New Flow):
```
User Login → Cognito → JWT Token → API → Lambda validates JWT → Extract Cognito sub → DynamoDB (user_id: cognito-sub)
```

## 🛠 Key Changes in the Code

1. **JWT Validation**: Added `extractUserFromToken()` function
2. **Auto Profile Creation**: New users get profiles created from Cognito data
3. **User ID Source**: Now uses `userInfo.sub` instead of path parameters
4. **Email Sync**: Keeps email in sync with Cognito

## 📊 DynamoDB Changes

Your DynamoDB table structure stays the same, but:
- `user_id` will now contain Cognito sub UUIDs (like `12345678-1234-1234-1234-123456789012`)
- New profiles are automatically created on first access
- Existing profiles with old user IDs will coexist until migrated

## ✅ Testing Checklist

- [ ] Lambda function deploys successfully
- [ ] Environment variables are set
- [ ] API Gateway passes Authorization header
- [ ] New users get profiles created automatically
- [ ] Existing authenticated users can access their profiles
- [ ] Profile updates work correctly
- [ ] Course lookup still functions

## 🚨 Important Notes

- **Backup First**: Always backup your DynamoDB table before making changes
- **Test Environment**: Deploy to a test environment first
- **Monitor Logs**: Watch CloudWatch logs during initial deployment
- **Gradual Rollout**: Consider blue/green deployment for production

## 🐛 Troubleshooting

### Common Issues:

**401 Unauthorized**: 
- Check that `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are correct
- Verify the JWT token is valid and not expired

**500 Internal Server Error**:
- Check CloudWatch logs for specific error messages
- Ensure all dependencies are installed

**Profile Not Found**:
- The system should auto-create profiles for new users
- Check that the user has a valid Cognito session

### Debug Mode:
The Lambda function logs detailed information. Check CloudWatch logs for:
- JWT validation steps
- User ID extraction
- DynamoDB operations

## 🎯 Next Steps After Deployment

1. **Monitor**: Watch for any errors in the first few days
2. **Migrate**: Run the migration script for existing users if needed
3. **Clean Up**: Remove old user records after successful migration
4. **Optimize**: Consider caching Cognito public keys for better performance