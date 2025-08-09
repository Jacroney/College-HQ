/**
 * Authentication related type definitions
 */

export interface UserAttributes {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: string | undefined;
}

export interface AuthUser {
  username: string;
  email?: string;
  attributes?: UserAttributes;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserProfile: (attributes: Record<string, string>) => Promise<void>;
}