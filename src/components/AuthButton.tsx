import React from 'react';
import { Button, CircularProgress, Box, Typography } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const AuthButton: React.FC = () => {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading...</Typography>
      </Box>
    );
  }

  return (
    <>
      {user ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            Welcome, {user.email || user.username}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={signOut}
            size="small"
          >
            Sign Out
          </Button>
        </Box>
      ) : (
        <Button
          variant="contained"
          startIcon={<LoginIcon />}
          onClick={() => {
            console.log('🔴 AuthButton Sign In clicked');
            signIn();
          }}
          size="small"
        >
          Sign In
        </Button>
      )}
    </>
  );
};

export default AuthButton;