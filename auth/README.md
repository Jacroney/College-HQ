# College HQ Authentication Service

A secure AWS Cognito authentication service for College HQ application.

## Features

- ✅ AWS Cognito OAuth 2.0 integration
- ✅ CSRF protection with state parameter
- ✅ Rate limiting for authentication endpoints
- ✅ Security headers with Helmet.js
- ✅ CORS configuration
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Session management with secure cookies
- ✅ Token expiration handling
- ✅ Graceful shutdown

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and fill in your AWS Cognito details:
   ```bash
   cp .env.example .env
   ```

3. **Required Environment Variables:**
   - `COGNITO_DOMAIN`: Your Cognito hosted UI domain
   - `CLIENT_ID`: Cognito app client ID
   - `CLIENT_SECRET`: Cognito app client secret
   - `SESSION_SECRET`: Random string for session encryption
   - `REDIRECT_URI`: OAuth callback URL (default: http://localhost:3001/callback)

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

- `GET /` - Home page (login if not authenticated)
- `GET /login` - Redirect to Cognito login
- `GET /callback` - OAuth callback handler
- `GET /profile` - Get user profile (JSON)
- `GET /logout` - Logout and redirect to Cognito logout
- `GET /health` - Health check endpoint

## Security Features

- **Rate Limiting**: 100 requests/15min general, 10 auth requests/15min
- **CSRF Protection**: State parameter validation
- **Secure Sessions**: HTTP-only, secure cookies in production
- **Input Validation**: Request size limits and parameter validation
- **Error Handling**: No sensitive information leaked in errors
- **Security Headers**: Comprehensive security headers via Helmet.js

## AWS Cognito Configuration

Ensure your Cognito User Pool has:
- App client with client secret enabled
- OAuth flows: Authorization code grant
- OAuth scopes: email, openid, profile
- Callback URL: `http://localhost:3001/callback` (or your domain)
- Sign out URL: `http://localhost:3001` (or your domain)

## Environment Variables Reference

```env
# Required
COGNITO_DOMAIN=your-domain.auth.region.amazoncognito.com
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_session_secret

# Optional
PORT=3001
NODE_ENV=development
REDIRECT_URI=http://localhost:3001/callback
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong, random `SESSION_SECRET`
3. Configure proper `ALLOWED_ORIGINS`
4. Use HTTPS for `REDIRECT_URI`
5. Consider using a persistent session store
6. Monitor logs and health endpoint

## Troubleshooting

- **Token exchange failed**: Check CLIENT_SECRET and Cognito configuration
- **State mismatch**: Clear browser cookies/session storage
- **CORS errors**: Verify ALLOWED_ORIGINS includes your frontend domain
- **Rate limit errors**: Wait 15 minutes or adjust rate limits in code