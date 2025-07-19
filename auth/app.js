import express from 'express';
import fetch from 'node-fetch';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Environment validation
const requiredEnvVars = ['COGNITO_DOMAIN', 'CLIENT_ID', 'CLIENT_SECRET', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Configuration from environment
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${port}/callback`;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
const API_GATEWAY_URL = process.env.API_GATEWAY_URL; // Add this for Lambda integration

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth-specific rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to check authentication for API routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if token is expired
  if (req.session.tokens && req.session.tokens.expires_at < Date.now()) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session expired, please login again' });
  }
  
  next();
};

// Login route — redirect to Cognito Hosted UI
app.get('/login', authLimiter, asyncHandler(async (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2, 15);
    req.session.state = state;
    
    const loginUrl = `https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    res.redirect(loginUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication service temporarily unavailable' });
  }
}));

// Callback route — handle token exchange and session
app.get('/callback', authLimiter, asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, req.query.error_description);
    return res.status(400).json({ 
      error: 'Authentication failed', 
      details: req.query.error_description || 'Unknown error' 
    });
  }
  
  // Validate required parameters
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  
  // Validate state parameter (CSRF protection)
  if (!state || state !== req.session.state) {
    console.error('State mismatch:', { received: state, expected: req.session.state });
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  // Clear state from session
  delete req.session.state;

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return res.status(401).json({ error: 'Token exchange failed' });
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Fetch user info
    const userResponse = await fetch(`https://${COGNITO_DOMAIN}/oauth2/userInfo`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userResponse.status);
      return res.status(401).json({ error: 'Failed to fetch user information' });
    }

    const userInfo = await userResponse.json();
    
    // Store user session
    req.session.user = {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      email_verified: userInfo.email_verified,
      loginTime: new Date().toISOString()
    };

    // Store tokens securely (consider encryption for production)
    req.session.tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      id_token: tokenData.id_token, // Added ID token for Lambda calls
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    };

    console.log('Successful login for user:', userInfo.email);

    // Redirect to frontend after successful login
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?login=success`);
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}));

// API Routes for frontend integration
app.get('/api/auth/status', (req, res) => {
  if (!req.session.user) {
    return res.json({ authenticated: false });
  }
  
  // Check if token is expired
  if (req.session.tokens && req.session.tokens.expires_at < Date.now()) {
    req.session.destroy();
    return res.json({ authenticated: false });
  }
  
  res.json({ 
    authenticated: true,
    user: req.session.user 
  });
});

// Profile route
app.get('/api/profile', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    user: req.session.user,
    sessionInfo: {
      loginTime: req.session.user.loginTime,
      expiresAt: new Date(req.session.tokens?.expires_at || 0).toISOString()
    }
  });
}));

// Proxy routes to Lambda agents
app.post('/api/agents/:agentType', requireAuth, asyncHandler(async (req, res) => {
  const { agentType } = req.params;
  const allowedAgents = ['advising', 'tutoring', 'registration'];
  
  if (!allowedAgents.includes(agentType)) {
    return res.status(400).json({ error: 'Invalid agent type' });
  }
  
  if (!API_GATEWAY_URL) {
    return res.status(500).json({ error: 'API Gateway not configured' });
  }
  
  try {
    const response = await fetch(`${API_GATEWAY_URL}/${agentType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.tokens.id_token}`
      },
      body: JSON.stringify({
        ...req.body,
        user: req.session.user
      })
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Error calling ${agentType} agent:`, error);
    res.status(500).json({ error: 'Agent service temporarily unavailable' });
  }
}));

// Logout route
app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  const user = req.session.user;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    console.log('User logged out:', user?.email || 'unknown');
    res.json({ success: true });
  });
}));

// Logout route with Cognito redirect
app.get('/logout', asyncHandler(async (req, res) => {
  const user = req.session.user;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    console.log('User logged out:', user?.email || 'unknown');
    
    const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(`http://localhost:${port}`)}`;
    res.redirect(logoutUrl);
  });
}));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Home route
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>College HQ Authentication</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .login-button { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; }
          .login-button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>Welcome to College HQ</h1>
        <p>Please sign in to continue</p>
        <a href="/login" class="login-button">Login with AWS Cognito</a>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to React App</a></p>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>College HQ - Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .welcome { color: #28a745; }
        .user-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
        .logout { background: #dc3545; }
      </style>
    </head>
    <body>
      <h1 class="welcome">Welcome Back, ${req.session.user.name || req.session.user.email}!</h1>
      <div class="user-info">
        <strong>Your Information:</strong><br>
        Email: ${req.session.user.email}<br>
        Name: ${req.session.user.name || 'Not provided'}<br>
        Email Verified: ${req.session.user.email_verified ? 'Yes' : 'No'}<br>
        Login Time: ${new Date(req.session.user.loginTime).toLocaleString()}
      </div>
      <a href="/api/profile" class="button">View Profile (JSON)</a>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Go to React App</a>
      <a href="/logout" class="button logout">Logout</a>
    </body>
    </html>
  `);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 College HQ Auth server listening at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Cognito Domain: ${COGNITO_DOMAIN}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});