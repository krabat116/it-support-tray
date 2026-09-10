// ============================================================
// src/main/usage-tracker.ts
// Usage log tracking module for Phase 2 (currently only structure/stubs).
//
// What will be implemented in Phase 2:
//   1. Append events to a local JSON file (userData/usage-log.json)
//   2. Batch-send events to a backend API (keep locally if send fails)
//   3. Provide aggregated data to a dashboard via getUsageLog()
//
// Currently, calling trackUsage() only outputs to the console —
// no actual file I/O or network calls are made.
// ============================================================

import { app } from 'electron';
import type { UsageEvent, UsageLog } from '../shared/types';

/**
 * Records a Quick Fix usage event.
 * Called after command execution in the EXECUTE_QUICK_FIX handler in ipc-handlers.ts.
 *
 * Phase 2 implementation points:
 * ───────────────────────────────────────────────────
 * const logPath = path.join(app.getPath('userData'), 'usage-log.json');
 *
 * // 1. Save to local file
 * const log = readOrCreateLog(logPath);
 * log.events.push(event);
 * fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
 *
 * // 2. Send to backend (async, non-blocking)
 * sendToBackend(event).catch(err =>
 *   console.warn('[UsageTracker] Backend send failed (saved locally):', err)
 * );
 * ───────────────────────────────────────────────────
 */
export async function trackUsage(event: UsageEvent): Promise<void> {
  // To be implemented in Phase 2
  console.log('[UsageTracker] Event:', JSON.stringify(event));
}

/**
 * Returns the full usage log.
 * Used for dashboard integration in Phase 2.
 */
export async function getUsageLog(): Promise<UsageLog> {
  // To be implemented in Phase 2
  return {
    appVersion: app.getVersion(),
    events: [],
  };
}
