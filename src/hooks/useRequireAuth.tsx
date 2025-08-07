import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login or show auth prompt
      // Since we're using authentication service, trigger sign in
      const { signIn } = useAuth();
      signIn();
    }
  }, [user, loading, navigate]);

  return { user, loading };
};