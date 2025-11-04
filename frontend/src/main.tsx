import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Entrypoint for the React application.  We use React 18's
// createRoot API to mount the App component into the DOM.  See
// src/App.tsx for the UI skeleton.

const rootElement = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);