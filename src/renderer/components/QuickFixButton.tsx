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
  const [detail, setDetail] = useState('');

  const handleClick = async () => {
    if (status === 'running') return;  // Prevent duplicate execution

    setStatus('running');
    setMessage('');
    setDetail('');

    try {
      const result = await window.electronAPI.executeQuickFix({
        actionId: action.id,
        categoryId,
      });

      const succeeded = result.success;
      setStatus(succeeded ? 'success' : 'error');
      setMessage(result.message);
      // Show command output detail on error so user can diagnose the issue
      if (!succeeded) {
        setDetail(result.stdout || result.stderr || '');
      }
      // Success: reset after 4s. Error: reset after 8s (give time to read the detail)
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        setDetail('');
      }, succeeded ? 4000 : 8000);
    } catch {
      setStatus('error');
      setMessage('An unexpected error occurred.');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        setDetail('');
      }, 8000);
    }
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
        <div className={`status-feedback ${status}`}>
          {message}
          {detail && <div className="status-detail">{detail}</div>}
        </div>
      )}
    </div>
  );
};

export default QuickFixButton;
