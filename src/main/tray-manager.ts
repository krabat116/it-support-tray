// ============================================================
// src/main/tray-manager.ts
// System tray icon creation and management module.
//
// - Left-click: toggle popup window
// - Right-click: context menu (Open / Quit)
// - Tooltip displays the app name
// ============================================================

import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { togglePopupWindow } from './window-manager';

let tray: Tray | null = null;

/**
 * Creates the system tray icon and registers events.
 * Call this inside main.ts's app.whenReady().
 *
 * @returns The created Tray instance
 */
export function createTray(): Tray {
  const icon = loadTrayIcon();
  tray = new Tray(icon);

  tray.setToolTip('IT Support Tool — Click to open the menu');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open IT Support Tool',
      click: () => { if (tray) togglePopupWindow(tray); },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.quit(); },
    },
  ]);

  // Left-click: toggle popup window
  tray.on('click', () => {
    if (tray) togglePopupWindow(tray);
  });

  // Right-click: show context menu
  // Do NOT use tray.setContextMenu() — on macOS it overrides left-click behavior
  tray.on('right-click', () => {
    if (tray) tray.popUpContextMenu(contextMenu);
  });

  console.log('[Tray] System tray icon created.');
  return tray;
}

/**
 * Loads the tray icon image.
 * Falls back to a runtime-generated icon if the icon file is not found.
 */
function loadTrayIcon(): Electron.NativeImage {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(app.getAppPath(), 'resources', 'icon.png');

  const img = nativeImage.createFromPath(iconPath);

  if (img.isEmpty()) {
    console.warn('[Tray] Icon file not found, using fallback icon:', iconPath);
    return createFallbackIcon();
  }

  // Resize to standard tray icon size of 16×16
  return img.resize({ width: 16, height: 16 });
}

/**
 * Creates a simple blue square fallback icon used when the icon file is missing.
 * Replace resources/icon.png and resources/icon.ico before production deployment.
 */
function createFallbackIcon(): Electron.NativeImage {
  // 16×16 blue PNG (base64)
  const B64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVQ4T2' +
    'NkYGD4z0ABYBw1gIFiMGoAAwMDAwAIAAQAAQAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(`data:image/png;base64,${B64}`);
}

/**
 * Returns the current Tray instance.
 */
export function getTray(): Tray | null {
  return tray;
}

/**
 * Destroys the tray icon.
 * Called from the app 'before-quit' event.
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
