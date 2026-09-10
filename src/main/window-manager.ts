// ============================================================
// src/main/window-manager.ts
// Tray popup BrowserWindow creation and management module.
//
// Features:
//   - Frameless, always-on-top, skip-taskbar popup window (singleton)
//   - Auto-hides on blur (focus lost)
//   - togglePopupWindow() calculates position near tray icon before showing
// ============================================================

import { BrowserWindow, Tray, screen, app } from 'electron';
import path from 'path';

let popupWindow: BrowserWindow | null = null;

/**
 * Returns the popup BrowserWindow.
 * Creates a new one if not yet created or if destroyed (singleton pattern).
 */
export function createPopupWindow(): BrowserWindow {
  if (popupWindow && !popupWindow.isDestroyed()) {
    return popupWindow;
  }

  popupWindow = new BrowserWindow({
    width: 360,
    height: 520,
    show: false,              // Hidden initially — shown via togglePopupWindow()
    frame: false,             // Frameless window (no title bar)
    resizable: false,
    movable: false,           // Position is controlled by code only
    alwaysOnTop: true,        // Always shown above other windows
    skipTaskbar: true,        // Hide taskbar button
    transparent: false,
    backgroundColor: '#1a1a2e',  // Pre-set background color → prevents flash on first load
    webPreferences: {
      // Preload script: exposes safe IPC API to the renderer
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,   // Security: block direct Node.js access from renderer
      contextIsolation: true,   // Security: isolate renderer ↔ preload contexts
      sandbox: false,           // false to allow Node.js API usage in preload
    },
  });

  // Load the renderer HTML
  popupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Auto-hide on blur (when user clicks another window or the desktop)
  popupWindow.on('blur', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.hide();
    }
  });

  // Release reference when window is destroyed
  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  // Dev environment DevTools (uncomment if needed)
  // if (!app.isPackaged) {
  //   popupWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  return popupWindow;
}

/**
 * Toggles the popup window near the tray icon.
 * - Hides it if currently visible.
 * - Calculates position and shows it if hidden.
 *
 * @param tray The Tray instance used as the position reference
 */
export function togglePopupWindow(tray: Tray): void {
  const win = createPopupWindow();

  if (win.isVisible()) {
    win.hide();
    return;
  }

  positionNearTray(win, tray);
  win.show();
  win.focus();
}

/**
 * Hides the popup window.
 * Called from the IPC HIDE_WINDOW handler.
 */
export function hidePopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.hide();
  }
}

/**
 * Returns the current popup window instance.
 */
export function getPopupWindow(): BrowserWindow | null {
  return popupWindow;
}

// ----------------------------------------------------------------
// Internal helper: calculate position near tray icon
// ----------------------------------------------------------------

/**
 * Calculates popup window position taking into account the Windows taskbar location.
 *
 * Logic:
 *   - X: center-align to tray icon, clamped so it doesn't go off-screen
 *   - Y: place above taskbar if taskbar is at the bottom, below if at the top
 */
function positionNearTray(win: BrowserWindow, tray: Tray): void {
  const trayBounds = tray.getBounds();
  const winBounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const { workArea } = display;

  // X coordinate: horizontally centered on tray icon, clamped to screen edges
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winBounds.width));

  // Y coordinate: determine taskbar position
  //   trayBounds.y > workArea midpoint → taskbar is at the bottom → popup goes above
  const taskbarAtBottom = trayBounds.y > workArea.y + workArea.height / 2;
  const y = taskbarAtBottom
    ? workArea.y + workArea.height - winBounds.height - 8
    : workArea.y + 8;

  win.setPosition(x, y, false);
}
