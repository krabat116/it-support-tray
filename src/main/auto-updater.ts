// ============================================================
// src/main/auto-updater.ts
// Auto-update setup using electron-updater + GitHub Releases.
//
// Flow:
//   1. App starts → silently check GitHub Releases for newer version
//   2. Update found → download in background (no interruption)
//   3. Download complete → show system notification
//   4. App quits → electron-updater installs the update automatically
//
// Requires: electron-builder publish config pointing to GitHub
// Only active in packaged (production) builds.
// ============================================================

import { autoUpdater } from 'electron-updater';
import { Notification, app } from 'electron';

export function setupAutoUpdater(): void {
  // Dev mode: skip (update server won't have dev builds)
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Skipping in dev mode.');
    return;
  }

  // Download update silently in background, install on next quit
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err: Error) => {
    console.warn('[AutoUpdater] Error:', err.message);
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info: { version: string }) => {
    console.log('[AutoUpdater] Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Already up to date.');
  });

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    new Notification({
      title: 'IT Support Tool',
      body: `v${info.version} 업데이트 준비 완료. 앱을 재시작하면 설치됩니다.`,
    }).show();
  });

  // Kick off the check — failures are non-fatal
  autoUpdater.checkForUpdates().catch((err: Error) => {
    console.warn('[AutoUpdater] Update check failed (offline?):', err.message);
  });
}
