// ============================================================
// src/main/main.ts
// Electron main process entry point.
//
// Initialization order:
//   1. Single instance lock (prevent duplicate instances)
//   2. Register IPC handlers
//   3. Pre-create popup window (improves first-click response time)
//   4. Create tray icon
//   5. Set up auto-launch
// ============================================================

import { app } from 'electron';
import { createTray, destroyTray, getTray } from './tray-manager';
import { createPopupWindow, togglePopupWindow, getPopupWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { setupAutoLaunch } from './auto-launch-setup';
import { startRealtimeSync } from './config-loader';
import { IpcChannel } from '../shared/types';

// ─── macOS: Hide app icon from Dock (tray-only app) ───────────────
if (process.platform === 'darwin') {
  app.dock?.hide();
}

// ─── Single instance lock ────────────────────────────────────────────
// If an instance is already running, the second instance is immediately quit.
// Instead, a 'second-instance' event is sent to the existing instance to activate the popup.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Second instance launched → respond by showing existing window popup
  app.on('second-instance', () => {
    const tray = getTray();
    if (tray) togglePopupWindow(tray);
  });

  // ─── App initialization ──────────────────────────────────────────────────
  app.whenReady().then(async () => {
    // 1. Register IPC handlers first (must be ready before renderer loads)
    registerIpcHandlers();

    // 2. Pre-create popup window (loads in background → shown instantly on first click)
    createPopupWindow();

    // 3. Create tray icon and register events
    createTray();

    // 4. Register auto-launch in Windows registry
    await setupAutoLaunch();

    // 5. Start Supabase Realtime sync — notify renderer when config changes
    startRealtimeSync(() => {
      const win = getPopupWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(IpcChannel.CONFIG_UPDATED);
      }
    });

    console.log('[Main] IT Support Tool started.');
  });

  // ─── App quit handling ───────────────────────────────────────────────

  // Do not quit the app when all windows are closed (tray app stays in background).
  app.on('window-all-closed', () => {
    // Intentionally not calling app.quit() → stays in tray
  });

  // Clean up tray icon just before the app actually quits
  app.on('before-quit', () => {
    destroyTray();
  });
}
