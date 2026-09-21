// ============================================================
// src/renderer/global.d.ts
// Renderer global type declarations.
// Informs TypeScript of the type of window.electronAPI
// exposed by preload.ts via contextBridge.
// ============================================================

import type { AppConfig, QuickFixRequest, QuickFixResult } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<{ success: boolean; data?: AppConfig; error?: string }>;
      executeQuickFix: (req: QuickFixRequest) => Promise<QuickFixResult>;
      openSettings: (uri: string) => Promise<{ success: boolean; error?: string }>;
      openPdf: (filename: string) => Promise<{ success: boolean; error?: string }>;
      hideWindow: () => void;
      onConfigUpdated: (callback: () => void) => () => void;
    };
  }
}

export {};
