// ============================================================
// src/shared/types.ts
// Type definitions shared between the main process and renderer process.
// Manages IPC channel names, config structures, message formats, etc.
// Contains only type definitions with no runtime code, so it can be
// safely imported by both sides.
// ============================================================

// ----------------------------------------------------------------
// App configuration data structure (format returned by config-loader.ts)
// ----------------------------------------------------------------

/** A single Quick Fix action */
export interface QuickFixAction {
  id: string;
  label: string;           // Text displayed on the UI button
  description?: string;    // Button description (tooltip, etc.)
  requiresAdmin: boolean;  // true = UAC prompt required for privilege elevation
  command: string;         // Shell command to execute, or a special command ID
                           // Special IDs: 'clean-temp', 'empty-recycle-bin'
}

/** A Windows Settings shortcut entry */
export interface SettingsShortcut {
  id: string;
  label: string;           // Text displayed on the UI button
  uri: string;             // URI in ms-settings:xxx format
}

/** A PDF troubleshooting guide entry */
export interface PdfGuide {
  id: string;
  label: string;           // Text displayed on the UI button
  filename: string;        // Filename inside the resources/guides/ folder
}

/** A single accordion category section */
export interface Category {
  id: string;
  title: string;           // Category header text
  icon?: string;           // Emoji or icon identifier
  quickFixes: QuickFixAction[];
  settingsShortcuts: SettingsShortcut[];
  pdfGuide?: PdfGuide;
}

/**
 * The full app configuration returned by loadConfig() in config-loader.ts.
 * Renderer code depends only on this type — it receives the same structure
 * regardless of whether the config comes from a local file or an API.
 */
export interface AppConfig {
  appName: string;
  version: string;
  categories: Category[];
}

// ----------------------------------------------------------------
// IPC channel name constants
// Channel names used for renderer ↔ main communication, managed in one place.
// ----------------------------------------------------------------
export const IpcChannel = {
  /** renderer → main: Quick Fix execution request */
  EXECUTE_QUICK_FIX: 'execute-quick-fix',
  /** main → renderer: Quick Fix execution result */
  QUICK_FIX_RESULT: 'quick-fix-result',
  /** renderer → main: Open Windows Settings URI */
  OPEN_SETTINGS: 'open-settings',
  /** renderer → main: Open PDF file */
  OPEN_PDF: 'open-pdf',
  /** renderer → main: Request app config (category list, etc.) */
  GET_CONFIG: 'get-config',
  /** renderer → main: Hide popup window */
  HIDE_WINDOW: 'hide-window',
  /** main → renderer: Config updated via Supabase Realtime */
  CONFIG_UPDATED: 'config-updated',
} as const;

// ----------------------------------------------------------------
// IPC message payload types
// ----------------------------------------------------------------

/** Request payload for the EXECUTE_QUICK_FIX channel */
export interface QuickFixRequest {
  actionId: string;
  categoryId: string;
}

/** Response payload for the EXECUTE_QUICK_FIX channel */
export interface QuickFixResult {
  actionId: string;
  success: boolean;
  message: string;     // Result message shown to the user
  stdout?: string;     // Command standard output (debug only, not shown in UI)
  stderr?: string;     // Command standard error (debug only)
}

// ----------------------------------------------------------------
// Phase 2: Usage Tracking structures
// Currently only type definitions. Implementation planned in usage-tracker.ts.
// ----------------------------------------------------------------

/** A single Quick Fix usage event */
export interface UsageEvent {
  timestamp: string;    // ISO 8601 format (new Date().toISOString())
  categoryId: string;
  actionId: string;
  success: boolean;
  hostname?: string;    // Computer name (for multi-device tracking)
  appVersion?: string;  // App version at time of event
}

/** Full usage log structure saved to local JSON file (offline fallback) */
export interface UsageLog {
  appVersion: string;
  events: UsageEvent[];
}
