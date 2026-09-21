// ============================================================
// src/main/usage-tracker.ts
// Usage event tracking — records Quick Fix executions to Supabase.
//
// Flow:
//   1. Insert event to Supabase usage_logs table (primary)
//   2. On network failure → append to local usage-log.json (fallback)
//   3. On next successful insert, flush pending local events to Supabase
//
// Supabase table required:
//   See SQL in it-support-admin/schema.sql (usage_logs section)
// ============================================================

import os from 'os';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { createClient } from '@supabase/supabase-js';
import type { UsageEvent, UsageLog } from '../shared/types';

// ─── Helpers ────────────────────────────────────────────────────

function getConfigFilePath(filename: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', filename);
  }
  return path.join(app.getAppPath(), 'config', filename);
}

function getLocalLogPath(): string {
  return path.join(app.getPath('userData'), 'usage-log.json');
}

function getSupabaseClient() {
  const credPath = getConfigFilePath('supabase.json');
  if (!fs.existsSync(credPath)) throw new Error('supabase.json not found');
  const { url, anonKey } = JSON.parse(fs.readFileSync(credPath, 'utf-8')) as {
    url: string;
    anonKey: string;
  };
  return createClient(url, anonKey);
}

function readLocalLog(): UsageLog {
  const logPath = getLocalLogPath();
  if (!fs.existsSync(logPath)) {
    return { appVersion: app.getVersion(), events: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8')) as UsageLog;
  } catch {
    return { appVersion: app.getVersion(), events: [] };
  }
}

function writeLocalLog(log: UsageLog): void {
  fs.writeFileSync(getLocalLogPath(), JSON.stringify(log, null, 2));
}

function saveToLocalFallback(event: UsageEvent): void {
  const log = readLocalLog();
  log.events.push(event);
  writeLocalLog(log);
  console.log('[UsageTracker] Saved to local fallback. Pending:', log.events.length);
}

async function flushLocalEvents(supabase: ReturnType<typeof createClient>): Promise<void> {
  const log = readLocalLog();
  if (log.events.length === 0) return;

  const rows = log.events.map(e => ({
    timestamp: e.timestamp,
    category_id: e.categoryId,
    action_id: e.actionId,
    success: e.success,
    hostname: e.hostname ?? null,
    app_version: e.appVersion ?? null,
  }));

  const { error } = await supabase.from('usage_logs').insert(rows);
  if (!error) {
    // Clear local log after successful flush
    writeLocalLog({ appVersion: app.getVersion(), events: [] });
    console.log(`[UsageTracker] Flushed ${rows.length} pending event(s) to Supabase.`);
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Records a Quick Fix usage event.
 * Inserts to Supabase usage_logs. Falls back to local file on failure.
 * Also attempts to flush any previously cached local events.
 */
export async function trackUsage(event: UsageEvent): Promise<void> {
  const enrichedEvent: UsageEvent = {
    ...event,
    hostname: event.hostname ?? os.hostname(),
    appVersion: event.appVersion ?? app.getVersion(),
  };

  console.log('[UsageTracker] Event:', JSON.stringify(enrichedEvent));

  try {
    const supabase = getSupabaseClient();

    // Flush any events that were stored locally while offline
    await flushLocalEvents(supabase);

    // Insert the current event
    const { error } = await supabase.from('usage_logs').insert({
      timestamp: enrichedEvent.timestamp,
      category_id: enrichedEvent.categoryId,
      action_id: enrichedEvent.actionId,
      success: enrichedEvent.success,
      hostname: enrichedEvent.hostname ?? null,
      app_version: enrichedEvent.appVersion ?? null,
    });

    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn('[UsageTracker] Supabase insert failed, saving locally:', err);
    saveToLocalFallback(enrichedEvent);
  }
}

/**
 * Returns the full usage log from the local fallback file.
 */
export async function getUsageLog(): Promise<UsageLog> {
  return readLocalLog();
}
