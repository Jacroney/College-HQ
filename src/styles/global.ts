import { css } from '@emotion/react';
import { alpha } from '@mui/material/styles';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

// Color tokens
const colors = {
  primary: {
    light: '#4cc9f0',
    main: '#4361ee',
    dark: '#3a0ca3',
  },
  secondary: {
    light: '#b5179e',
    main: '#7209b7',
    dark: '#560bad',
  },
  grey: {
    0: '#FFFFFF',
    50: '#F8F9FF',
    100: '#F1F3F9',
    200: '#E2E6F3',
    300: '#D1D5E0',
    400: '#9EA4B1',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: {
    light: '#80ffb3',
    main: '#2ecc71',
    dark: '#27ae60',
  },
  warning: {
    light: '#ffd54f',
    main: '#ffbe0b',
    dark: '#fb8500',
  },
  error: {
    light: '#ff70a6',
    main: '#f72585',
    dark: '#d00069',
  },
  info: {
    light: '#80e3ff',
    main: '#4cc9f0',
    dark: '#3a86ff',
  },
};

// Animation timings
const transitions = {
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard curve
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)', // Deceleration curve
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)', // Acceleration curve
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)', // Sharp curve
  },
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
};


export const globalStyles = css`
  :root {
    // Animation
    --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --ease-in-out: ${transitions.easing.easeInOut};
    --ease-out: ${transitions.easing.easeOut};
    
    // Shadows
    --shadow-sm: 0 1px 2px 0 ${alpha(colors.grey[900], 0.05)};
    --shadow: 0 4px 6px -1px ${alpha(colors.grey[900], 0.1)}, 0 2px 4px -1px ${alpha(colors.grey[900], 0.06)};
    --shadow-md: 0 10px 15px -3px ${alpha(colors.grey[900], 0.1)}, 0 4px 6px -2px ${alpha(colors.grey[900], 0.05)};
    --shadow-lg: 0 20px 25px -5px ${alpha(colors.grey[900], 0.1)}, 0 10px 10px -5px ${alpha(colors.grey[900], 0.04)};
    --shadow-xl: 0 25px 50px -12px ${alpha(colors.grey[900], 0.25)};
    
    // Z-index
    --z-index-app-bar: 1100;
    --z-index-drawer: 1200;
    --z-index-modal: 1300;
    --z-index-snackbar: 1400;
    --z-index-tooltip: 1500;
    
    // Border radius
    --border-radius-xs: 4px;
    --border-radius-sm: 8px;
    --border-radius-md: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 24px;
    --border-radius-pill: 9999px;
    
    // Spacing
    --spacing-xxs: 4px;
    --spacing-xs: 8px;
    --spacing-sm: 12px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-xxl: 48px;
    --spacing-xxxl: 64px;
  }

  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: 'kern' 1;
    scroll-behavior: smooth;
    height: 100%;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background-color: ${colors.grey[50]};
    color: ${colors.grey[900]};
    line-height: 1.5;
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  #root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-weight: 700;
  }

  a {
    color: ${colors.primary.main};
    text-decoration: none;
    transition: color ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
    
    &:hover {
      color: ${colors.primary.dark};
      text-decoration: underline;
    }
    
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px ${alpha(colors.primary.main, 0.3)};
      border-radius: 4px;
    }
  }

  button {
    cursor: pointer;
    font-family: inherit;
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    transition: all ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
    
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px ${alpha(colors.primary.main, 0.3)};
      border-radius: 8px;
    }
    
    &[disabled] {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  ul, ol {
    list-style: none;
  }

  img, svg, video, canvas, audio, iframe, embed, object {
    display: block;
    max-width: 100%;
    height: auto;
    vertical-align: middle;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0 0 0.5em;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-weight: 700;
    line-height: 1.2;
    color: ${colors.grey[900]};
  }

  h1 { 
    font-size: 3rem; 
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  h2 { 
    font-size: 2.25rem;
    letter-spacing: -0.01em;
  }
  h3 { font-size: 1.75rem; }
  h4 { font-size: 1.5rem; }
  h5 { font-size: 1.25rem; }
  h6 { font-size: 1.125rem; }

  p {
    margin: 0 0 1em;
    color: ${colors.grey[800]};
    line-height: 1.7;
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  /* Selection Styling */
  ::selection {
    background: rgba(67, 97, 238, 0.2);
    color: #4361ee;
  }

  /* Smooth transitions */
  * {
    transition: 
      background-color 0.2s var(--ease-out-quad),
      color 0.2s var(--ease-out-quad),
      transform 0.2s var(--ease-out-quad),
      box-shadow 0.2s var(--ease-out-quad),
      border-color 0.2s var(--ease-out-quad);
  }

  /* Utility Classes */
  .container {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`; 