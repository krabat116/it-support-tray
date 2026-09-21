// ============================================================
// src/main/preload.ts
// Preload script: exposes a safe IPC API to the renderer (React).
//
// Uses contextBridge to create the window.electronAPI object,
// exposing only the minimum required IPC calls (principle of least privilege).
//
// The renderer cannot directly access Electron or Node.js APIs —
// it can only use the API exposed here.
// ============================================================

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IpcChannel } from '../shared/types';
import type { AppConfig, QuickFixRequest, QuickFixResult } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Loads app configuration (category list, etc.).
   * Internally fetches from local JSON or API via config-loader.ts.
   */
  getConfig: (): Promise<{ success: boolean; data?: AppConfig; error?: string }> =>
    ipcRenderer.invoke(IpcChannel.GET_CONFIG),

  /**
   * Executes a Quick Fix command.
   * A UAC dialog will appear if admin rights are required.
   */
  executeQuickFix: (req: QuickFixRequest): Promise<QuickFixResult> =>
    ipcRenderer.invoke(IpcChannel.EXECUTE_QUICK_FIX, req),

  /**
   * Opens a Windows Settings URI (ms-settings:xxx).
   */
  openSettings: (uri: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannel.OPEN_SETTINGS, uri),

  /**
   * Opens a PDF troubleshooting file with the default viewer.
   * filename is the name of the file inside the resources/guides/ folder.
   */
  openPdf: (filename: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannel.OPEN_PDF, filename),

  /**
   * Hides the popup window (close button).
   */
  hideWindow: (): void =>
    ipcRenderer.send(IpcChannel.HIDE_WINDOW),

  /**
   * Registers a callback for when the main process detects a config change
   * via Supabase Realtime. Returns an unsubscribe function for cleanup.
   */
  onConfigUpdated: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on(IpcChannel.CONFIG_UPDATED, handler);
    return () => ipcRenderer.removeListener(IpcChannel.CONFIG_UPDATED, handler);
  },
});

// TypeScript: this file must be treated as a module.
export {};
