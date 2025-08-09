import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the component tree
 * and display a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service
    // In production, you would send this to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service like Sentry
      // Example: Sentry.captureException(error, { extra: errorInfo });
    } else {
      // In development, log to console
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'background.default',
            padding: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            <ErrorIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                marginBottom: 2,
              }}
            />
            <Typography variant="h4" gutterBottom>
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We're sorry for the inconvenience. An unexpected error has occurred.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  marginTop: 2,
                  padding: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                }}
              >
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ marginTop: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => window.location.href = '/'}
              >
                Go to Home
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;