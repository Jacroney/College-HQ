/**
 * Environment configuration with type safety and validation
 */

interface EnvironmentConfig {
  // AWS Configuration
  awsRegion: string;
  userPoolId: string;
  userPoolClientId: string;
  oauthDomain: string;
  oauthRedirectSignIn: string;
  oauthRedirectSignOut: string;
  
  // API Configuration
  apiUrl: string;
  
  // Lambda Service URLs (optional, for direct invocation)
  authHandlerUrl?: string;
  profileServiceUrl?: string;
  advisingServiceUrl?: string;
  courseServiceUrl?: string;
  conversationServiceUrl?: string;
  
  // Lambda Function Names (for development)
  authHandlerName: string;
  profileServiceName: string;
  advisingServiceName: string;
  courseServiceName: string;
  conversationServiceName: string;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  enableDebugMode: boolean;
  enableServiceMonitoring: boolean;
  enableApiMocking: boolean;
  
  // Environment
  isProduction: boolean;
  isDevelopment: boolean;
}

/**
 * Validates that a required environment variable exists
 */
function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
function getOptionalEnvVar(key: string, defaultValue: string): string {
  return import.meta.env[key] || defaultValue;
}

/**
 * Gets a boolean environment variable
 */
function getBooleanEnvVar(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true';
}

/**
 * Environment configuration object
 * Access environment variables through this object for type safety
 */
export const env: EnvironmentConfig = {
  // AWS Configuration
  awsRegion: getRequiredEnvVar('VITE_AWS_REGION'),
  userPoolId: getRequiredEnvVar('VITE_USER_POOL_ID'),
  userPoolClientId: getRequiredEnvVar('VITE_USER_POOL_CLIENT_ID'),
  oauthDomain: getRequiredEnvVar('VITE_OAUTH_DOMAIN'),
  oauthRedirectSignIn: getRequiredEnvVar('VITE_OAUTH_REDIRECT_SIGN_IN'),
  oauthRedirectSignOut: getRequiredEnvVar('VITE_OAUTH_REDIRECT_SIGN_OUT'),
  
  // API Configuration
  apiUrl: getOptionalEnvVar(
    'VITE_API_URL',
    'https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev'
  ),
  
  // Lambda Service URLs (optional)
  authHandlerUrl: getOptionalEnvVar('VITE_AUTH_HANDLER_URL', ''),
  profileServiceUrl: getOptionalEnvVar('VITE_PROFILE_SERVICE_URL', ''),
  advisingServiceUrl: getOptionalEnvVar('VITE_ADVISING_SERVICE_URL', ''),
  courseServiceUrl: getOptionalEnvVar('VITE_COURSE_SERVICE_URL', ''),
  conversationServiceUrl: getOptionalEnvVar('VITE_CONVERSATION_SERVICE_URL', ''),
  
  // Lambda Function Names
  authHandlerName: getOptionalEnvVar('VITE_AUTH_HANDLER_NAME', 'auth-handler'),
  profileServiceName: getOptionalEnvVar('VITE_PROFILE_SERVICE_NAME', 'profile-service'),
  advisingServiceName: getOptionalEnvVar('VITE_ADVISING_SERVICE_NAME', 'advising-service'),
  courseServiceName: getOptionalEnvVar('VITE_COURSE_SERVICE_NAME', 'course-service'),
  conversationServiceName: getOptionalEnvVar('VITE_CONVERSATION_SERVICE_NAME', 'conversation-service'),
  
  // Feature Flags
  enableAnalytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', false),
  enableErrorTracking: getBooleanEnvVar('VITE_ENABLE_ERROR_TRACKING', false),
  enableDebugMode: getBooleanEnvVar('VITE_ENABLE_DEBUG_MODE', false),
  enableServiceMonitoring: getBooleanEnvVar('VITE_ENABLE_SERVICE_MONITORING', false),
  enableApiMocking: getBooleanEnvVar('VITE_ENABLE_API_MOCKING', false),
  
  // Environment
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
};

// Validate environment on startup
if (env.isDevelopment && env.enableDebugMode) {
  console.log('Environment configuration loaded:', {
    ...env,
    // Don't log sensitive values in debug mode
    userPoolId: '***',
    userPoolClientId: '***',
  });
}