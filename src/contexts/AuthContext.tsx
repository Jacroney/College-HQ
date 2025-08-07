import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithRedirect, signOut, getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';

interface User {
  username: string;
  email?: string;
  attributes?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserProfile: (attributes: Record<string, string>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      // Try to get attributes, but don't fail if it doesn't work
      let attributes = {};
      try {
        attributes = await fetchUserAttributes();
      } catch (attrError) {
        console.warn('Could not fetch user attributes:', attrError);
        // Use basic info from currentUser if attributes fail
        attributes = {
          sub: currentUser.userId || currentUser.username,
          email: currentUser.attributes?.email || ''
        };
      }
      
      const userData = {
        username: currentUser.username,
        email: attributes.email || currentUser.attributes?.email || '',
        attributes: {
          ...attributes,
          sub: currentUser.userId || currentUser.username
        }
      };
      
      console.log('✅ User authenticated:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // Check if we're handling an OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const urlHash = new URLSearchParams(window.location.hash.substring(1));
      
      if (urlParams.has('code') || urlHash.has('access_token')) {
        console.log('🔄 Detected OAuth callback, processing...');
        
        try {
          // Give Amplify time to process the callback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Check auth status
          await checkAuth();
        } catch (error) {
          console.error('❌ Error processing OAuth callback:', error);
        }
      } else {
        // Normal auth check
        await checkAuth();
      }
    };
    
    initAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      console.log('🔄 Sign-in button clicked - checking auth state...');
      
      // Check if user is already authenticated
      const currentUser = await getCurrentUser().catch(() => null);
      if (currentUser) {
        console.log('✅ User already authenticated:', currentUser.username);
        await checkAuth(); // Refresh user data
        return;
      }
      
      console.log('🚀 No user found, redirecting to Cognito...');
      await signInWithRedirect();
      console.log('✅ Redirect initiated');
    } catch (error) {
      console.error('❌ Error signing in:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const handleUpdateUserProfile = async (attributes: Record<string, string>) => {
    try {
      await updateUserAttributes({ userAttributes: attributes });
      await checkAuth(); // Refresh user data
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
    checkAuth,
    updateUserProfile: handleUpdateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};