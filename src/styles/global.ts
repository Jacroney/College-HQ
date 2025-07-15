import { css } from '@emotion/react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

export const globalStyles = css`
  :root {
    --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  *,
  *::before,
  *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    height: 100%;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    -webkit-font-feature-settings: 'kern' 1;
    font-feature-settings: 'kern' 1;
    background-color: #f8f9ff;
    color: #2b2d42;
    line-height: 1.5;
    min-height: 100vh;
    overflow-x: hidden;
  }

  #root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 1rem;
    color: #1a1a2e;
  }

  p {
    margin-bottom: 1.25rem;
    line-height: 1.7;
  }

  a {
    color: #4361ee;
    text-decoration: none;
    transition: color 0.2s var(--ease-out-quad);
    
    &:hover {
      color: #3a0ca3;
      text-decoration: underline;
    }
  }

  img, svg {
    max-width: 100%;
    height: auto;
    vertical-align: middle;
  }

  button, input, optgroup, select, textarea {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin: 0;
  }

  button, input {
    overflow: visible;
  }

  button, select {
    text-transform: none;
  }

  button, [type="button"], [type="reset"], [type="submit"] {
    -webkit-appearance: button;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.03);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(67, 97, 238, 0.5);
    border-radius: 10px;
    border: 3px solid transparent;
    background-clip: content-box;
    transition: background-color 0.2s var(--ease-out-quad);
    
    &:hover {
      background: rgba(67, 97, 238, 0.7);
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