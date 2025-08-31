import { env } from '../config/env';
import { ResourcesConfig } from 'aws-amplify';

const awsconfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      region: env.awsRegion,
      userPoolId: env.userPoolId,
      userPoolClientId: env.userPoolClientId,
      loginWith: {
        oauth: {
          domain: env.oauthDomain,
          scopes: ['phone', 'email', 'openid', 'profile'],
          redirectSignIn: [env.oauthRedirectSignIn],
          redirectSignOut: [env.oauthRedirectSignOut],
          responseType: 'code' as const
        }
      }
    }
  },
  API: {
    REST: {
      CollegeHQAPI: {
        endpoint: env.apiUrl,
        region: env.awsRegion
      }
    }
  }
};

export default awsconfig;