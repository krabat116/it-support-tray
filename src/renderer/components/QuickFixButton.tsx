// ============================================================
// src/renderer/components/QuickFixButton.tsx
// Quick Fix action button component.
//
// State machine:
//   idle → running → success | error → (after 4s) idle
//
// Actions requiring admin rights show a 🔒 badge to inform
// the user that a UAC prompt will appear.
// ============================================================

import React, { useState } from 'react';
import type { QuickFixAction } from '../../shared/types';

type FixStatus = 'idle' | 'running' | 'success' | 'error';

interface QuickFixButtonProps {
  action: QuickFixAction;
  categoryId: string;
}

const QuickFixButton: React.FC<QuickFixButtonProps> = ({ action, categoryId }) => {
  const [status, setStatus] = useState<FixStatus>('idle');
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    if (status === 'running') return;  // Prevent duplicate execution

    setStatus('running');
    setMessage('');

    try {
      const result = await window.electronAPI.executeQuickFix({
        actionId: action.id,
        categoryId,
      });

      setStatus(result.success ? 'success' : 'error');
      setMessage(result.message);
    } catch {
      setStatus('error');
      setMessage('An unexpected error occurred.');
    }

    // Reset to idle after 4 seconds
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
    }, 4000);
  };

  // Button label by state
  const label = (() => {
    switch (status) {
      case 'running': return 'Running...';
      case 'success': return '✓ Done';
      case 'error':   return '✗ Failed';
      default:        return action.label;
    }
  })();

  return (
    <div className="quick-fix-wrapper">
      <button
        className={`action-btn quick-fix-btn ${status !== 'idle' ? status : ''}`}
        onClick={handleClick}
        disabled={status === 'running'}
        title={action.description}
      >
        {/* Show lock badge when admin rights are required */}
        {action.requiresAdmin && (
          <span className="admin-badge" title="Requires admin rights — a UAC prompt will appear">
            🔒
          </span>
        )}
        {label}
      </button>

      {/* Execution result feedback message */}
      {message && status !== 'idle' && (
        <div className={`status-feedback ${status}`}>{message}</div>
      )}
    </div>
  );
};

export default QuickFixButton;
