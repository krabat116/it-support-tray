// ============================================================
// src/renderer/index.tsx
// Renderer process entry point.
// Mounts the React app to the #root DOM element.
// ============================================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root element not found. Please check index.html.');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
