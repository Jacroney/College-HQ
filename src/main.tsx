import React from 'react';
import ReactDOM from 'react-dom/client';
import { Global } from '@emotion/react';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import App from './App';
import { globalStyles } from './styles/global';
import awsconfig from './lib/awsconfig';

Amplify.configure(awsconfig);

// Listen to auth events
Hub.listen('auth', (data) => {
  console.log('🔄 Auth Hub Event:', data.payload.event);
  
  if (data.payload.event === 'signInWithRedirect') {
    console.log('✅ Sign in with redirect successful');
  }
  
  if (data.payload.event === 'signInWithRedirect_failure') {
    console.error('❌ Sign in with redirect failed');
  }
  
  if (data.payload.event === 'signedIn') {
    console.log('✅ User signed in successfully');
    window.location.reload(); // Refresh to update auth state
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Global styles={globalStyles} />
    <App />
  </React.StrictMode>
);
