// ============================================================
// src/renderer/App.tsx
// Root React component.
// Loads app config from the main process and renders the accordion UI.
// ============================================================

import React, { useEffect, useState } from 'react';
import type { AppConfig } from '../shared/types';
import Accordion from './components/Accordion';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load config from the main process on component mount
  useEffect(() => {
    window.electronAPI
      .getConfig()
      .then(result => {
        if (result.success && result.data) {
          setConfig(result.data);
        } else {
          setError(result.error ?? 'Failed to load configuration.');
        }
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  // Listen for Supabase Realtime config updates pushed from the main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onConfigUpdated(() => {
      window.electronAPI.getConfig().then(result => {
        if (result.success && result.data) {
          setConfig(result.data);
        }
      });
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    window.electronAPI.hideWindow();
  };

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <div className="app-header">
        <div className="app-title">
          <span className="app-icon">🛠️</span>
          <span>{config?.appName ?? 'IT Support Tool'}</span>
        </div>
        <button className="close-btn" onClick={handleClose} title="Close">
          ✕
        </button>
      </div>

      {/* ── Body ── */}
      <div className="app-body">
        {loading && (
          <div className="status-message">Loading configuration...</div>
        )}
        {!loading && error && (
          <div className="status-message error">⚠️ {error}</div>
        )}
        {!loading && config && (
          <Accordion categories={config.categories} />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="app-footer">
        <span>v{config?.version ?? '1.0.0'}</span>
      </div>
    </div>
  );
};

export default App;
