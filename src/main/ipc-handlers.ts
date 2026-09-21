// ============================================================
// src/main/ipc-handlers.ts
// IPC communication handler registration module for renderer (React) ↔ main process.
// Call registerIpcHandlers() in main.ts after app.whenReady().
// ============================================================

import { ipcMain, shell, app, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { IpcChannel } from '../shared/types';
import type { QuickFixRequest } from '../shared/types';
import { loadConfig } from './config-loader';
import { runQuickFix } from './command-runner';
import { trackUsage } from './usage-tracker';
import { hidePopupWindow } from './window-manager';

/**
 * Registers all IPC handlers.
 * ipcMain.handle() responds to invoke() (bidirectional channel).
 * ipcMain.on() responds to send() (unidirectional channel).
 */
export function registerIpcHandlers(): void {
  // ────────────────────────────────────────────────────────
  // GET_CONFIG: Request app configuration (category list)
  // Called once on renderer startup.
  // ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannel.GET_CONFIG, async () => {
    try {
      const data = await loadConfig();
      return { success: true, data };
    } catch (err) {
      console.error('[IPC:GET_CONFIG] Failed to load config:', err);
      return { success: false, error: String(err) };
    }
  });

  // ────────────────────────────────────────────────────────
  // EXECUTE_QUICK_FIX: Quick Fix execution request
  // ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannel.EXECUTE_QUICK_FIX, async (_event: IpcMainInvokeEvent, req: QuickFixRequest) => {
    console.log(`[IPC:EXECUTE_QUICK_FIX] ${req.categoryId}/${req.actionId}`);

    // Find the matching action in config
    const config = await loadConfig();
    const category = config.categories.find(c => c.id === req.categoryId);
    const action = category?.quickFixes.find(a => a.id === req.actionId);

    if (!action) {
      return {
        actionId: req.actionId,
        success: false,
        message: `Unknown action ID: ${req.actionId}`,
      };
    }

    // Execute the command
    const result = await runQuickFix(action.id, action.command, action.requiresAdmin);

    // Phase 2: Record usage event (currently console output only)
    await trackUsage({
      timestamp: new Date().toISOString(),
      categoryId: req.categoryId,
      actionId: req.actionId,
      success: result.success,
    });

    return result;
  });

  // ────────────────────────────────────────────────────────
  // OPEN_SETTINGS: Open Windows Settings URI
  // Passes ms-settings: URI to the system via shell.openExternal().
  // ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannel.OPEN_SETTINGS, async (_event: IpcMainInvokeEvent, uri: string) => {
    // Only allow permitted URI schemes (security: prevent opening arbitrary URLs)
    // Windows: ms-settings: / macOS: x-apple.systempreferences: / dev: all allowed
    const isAllowed =
      uri.startsWith('ms-settings:') ||
      uri.startsWith('x-apple.systempreferences:') ||
      !app.isPackaged;
    if (!isAllowed) {
      return { success: false, error: 'URI scheme not allowed.' };
    }
    try {
      await shell.openExternal(uri);
      return { success: true };
    } catch (err) {
      console.error('[IPC:OPEN_SETTINGS] Failed:', err);
      return { success: false, error: String(err) };
    }
  });

  // ────────────────────────────────────────────────────────
  // OPEN_PDF: Open PDF troubleshooting guide
  // If filename is a remote URL (Supabase Storage), opens in browser.
  // Otherwise, opens the bundled local PDF with the default viewer.
  // ────────────────────────────────────────────────────────
  ipcMain.handle(IpcChannel.OPEN_PDF, async (_event: IpcMainInvokeEvent, filename: string) => {
    // Remote URL (from Supabase) → open in browser (supports download too)
    if (filename.startsWith('https://')) {
      try {
        await shell.openExternal(filename);
        return { success: true };
      } catch (err) {
        console.error('[IPC:OPEN_PDF] Failed to open URL:', err);
        return { success: false, error: String(err) };
      }
    }

    // Local file → prevent path traversal and open with default PDF viewer
    const safeName = path.basename(filename);

    const pdfPath = app.isPackaged
      ? path.join(process.resourcesPath, 'guides', safeName)
      : path.join(app.getAppPath(), 'resources', 'guides', safeName);

    const errorMsg = await shell.openPath(pdfPath);
    if (errorMsg) {
      console.error('[IPC:OPEN_PDF] Failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
    return { success: true };
  });

  // ────────────────────────────────────────────────────────
  // HIDE_WINDOW: Hide popup window (unidirectional, no response)
  // ────────────────────────────────────────────────────────
  ipcMain.on(IpcChannel.HIDE_WINDOW, () => {
    hidePopupWindow();
  });
}
