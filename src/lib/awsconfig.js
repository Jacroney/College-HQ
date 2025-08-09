// Use environment variables for configuration
const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_zahTJOYu6',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '3g2i7e8iq42qtdjqherh0ioni1',
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_OAUTH_DOMAIN || 'us-east-1zahtjoyu6.auth.us-east-1.amazoncognito.com',
          scopes: ['openid'],
          redirectSignIn: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_IN || 'http://localhost:5173/'],
          redirectSignOut: [import.meta.env.VITE_OAUTH_REDIRECT_SIGN_OUT || 'http://localhost:5173/'],
          responseType: 'code',
          providers: ['COGNITO']
        }
      }
    }
  }
};

export default awsconfig;