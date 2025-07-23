const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_zahTJOYu6',
      userPoolClientId: '3g2i7e8iq42qtdjqherh0ioni1',
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: 'us-east-1zahtjoyu6.auth.us-east-1.amazoncognito.com',
          scopes: ['openid'],
          redirectSignIn: ['http://localhost:5173/'],
          redirectSignOut: ['http://localhost:5173/'],
          responseType: 'code',
          providers: ['COGNITO']
        }
      }
    }
  }
};

export default awsconfig;