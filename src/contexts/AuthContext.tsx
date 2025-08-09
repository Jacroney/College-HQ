import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithRedirect, signOut, getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { AuthUser, UserAttributes, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      // Try to get attributes, but don't fail if it doesn't work
      let attributes: UserAttributes = {};
      try {
        attributes = await fetchUserAttributes();
      } catch (attrError) {
        // Silently handle attribute fetch errors - this is expected with some OAuth configurations
        // Use basic info from currentUser if attributes fail
        attributes = {
          sub: currentUser.userId || currentUser.username,
          email: ''
        };
      }
      
      const userData = {
        username: currentUser.username,
        email: attributes.email || '',
        attributes: {
          ...attributes,
          sub: currentUser.userId || currentUser.username
        }
      };
      
      setUser(userData);
    } catch (error) {
      // Auth check failed - user not authenticated
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
        try {
          // Give Amplify time to process the callback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Check auth status
          await checkAuth();
        } catch (error) {
          // Error processing OAuth callback
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
      // Check if user is already authenticated
      const currentUser = await getCurrentUser().catch(() => null);
      if (currentUser) {
        await checkAuth(); // Refresh user data
        return;
      }
      
      await signInWithRedirect();
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      // Error signing out
      throw error;
    }
  };

  const handleUpdateUserProfile = async (attributes: Record<string, string>) => {
    try {
      await updateUserAttributes({ userAttributes: attributes });
      await checkAuth(); // Refresh user data
    } catch (error) {
      // Error updating user attributes
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