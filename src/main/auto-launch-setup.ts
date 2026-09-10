// ============================================================
// src/main/auto-launch-setup.ts
// Windows boot auto-launch configuration module.
// Uses the auto-launch package to register/unregister startup entries
// in the Windows registry.
//
// Registry path: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
// (can be registered with user privileges — no admin rights required)
// ============================================================

import { app } from 'electron';

// auto-launch is a CommonJS module with no @types, so we use require to import it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AutoLaunch = require('auto-launch') as new (opts: {
  name: string;
  path?: string;
  isHidden?: boolean;
}) => {
  enable(): Promise<void>;
  disable(): Promise<void>;
  isEnabled(): Promise<boolean>;
};

// The AutoLaunch instance is lazily created.
// Since new AutoLaunch() calls app.getPath(), instance creation is deferred
// until after app.whenReady() — i.e., until the function is actually called.
let _launcher: InstanceType<typeof AutoLaunch> | null = null;
function getLauncher() {
  if (!_launcher) {
    _launcher = new AutoLaunch({
      name: 'IT Support Tool',
      path: app.getPath('exe'),
      isHidden: false,
    });
  }
  return _launcher;
}

/**
 * Initializes the auto-launch configuration.
 * Call this inside main.ts's app.whenReady().
 *
 * - Registers in the registry only for packaged builds.
 * - Skips registration in development environment (npm run dev).
 */
export async function setupAutoLaunch(): Promise<void> {
  if (!app.isPackaged) {
    console.log('[AutoLaunch] Development environment — skipping auto-launch registration');
    return;
  }

  try {
    const enabled = await getLauncher().isEnabled();
    if (!enabled) {
      await getLauncher().enable();
      console.log('[AutoLaunch] Auto-launch on boot has been enabled.');
    } else {
      console.log('[AutoLaunch] Auto-launch is already enabled.');
    }
  } catch (err) {
    // Auto-launch registration failure is non-fatal — log warning and continue
    console.warn('[AutoLaunch] Failed to configure auto-launch:', err);
  }
}

/**
 * Disables auto-launch.
 * Used when the user turns off the toggle in the settings UI (Phase 2).
 */
export async function disableAutoLaunch(): Promise<void> {
  try {
    await getLauncher().disable();
    console.log('[AutoLaunch] Auto-launch has been disabled.');
  } catch (err) {
    console.error('[AutoLaunch] Failed to disable auto-launch:', err);
  }
}

/**
 * Returns whether auto-launch is currently enabled.
 */
export async function isAutoLaunchEnabled(): Promise<boolean> {
  try {
    return await getLauncher().isEnabled();
  } catch {
    return false;
  }
}
