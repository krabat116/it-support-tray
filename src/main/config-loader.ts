// ============================================================
// src/main/config-loader.ts
// Module for loading app configuration (categories, Quick Fixes, PDF guide list).
//
// ★ Replaceable interface layer ★
// Phase 2 implementation: fetches from Supabase, falls back to local JSON on failure.
//
// The rest of the renderer/main code depends only on the AppConfig type returned by
// loadConfig(), so changes to this module's implementation won't require edits elsewhere.
// ============================================================

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { AppConfig, Category, QuickFixAction, SettingsShortcut, PdfGuide } from '../shared/types';

// Supabase realtime-js checks global.WebSocket at init time (static method).
// Electron main process (Node.js 20) has no native WebSocket — inject ws here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = WebSocket;

// In-memory cache — prevents repeated network calls during app runtime
let cachedConfig: AppConfig | null = null;

/**
 * Determines the config file path based on the environment.
 */
function getConfigFilePath(filename: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', filename);
  }
  return path.join(app.getAppPath(), 'config', filename);
}

/**
 * Reads and returns configuration from the local JSON file.
 * Used as a fallback when Supabase is unreachable.
 */
function readLocalConfig(): AppConfig {
  const configPath = getConfigFilePath('app-config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

/**
 * Reads Supabase credentials from config/supabase.json.
 */
function readSupabaseCredentials(): { url: string; anonKey: string } {
  const credPath = getConfigFilePath('supabase.json');

  if (!fs.existsSync(credPath)) {
    throw new Error(`Supabase config not found: ${credPath}`);
  }

  const raw = fs.readFileSync(credPath, 'utf-8');
  return JSON.parse(raw) as { url: string; anonKey: string };
}

/**
 * Fetches configuration from Supabase and maps it to AppConfig format.
 */
async function fetchFromSupabase(): Promise<AppConfig> {
  const { url, anonKey } = readSupabaseCredentials();
  const supabase = createClient(url, anonKey);

  const [catRes, qfRes, scRes, guidesRes] = await Promise.all([
    supabase.from('categories').select('*').order('order'),
    supabase.from('quick_fixes').select('*').order('order'),
    supabase.from('settings_shortcuts').select('*').order('order'),
    supabase.from('guides').select('*').order('uploaded_at', { ascending: false }),
  ]);

  if (catRes.error) throw new Error(`Supabase categories error: ${catRes.error.message}`);
  if (qfRes.error) throw new Error(`Supabase quick_fixes error: ${qfRes.error.message}`);
  if (scRes.error) throw new Error(`Supabase settings_shortcuts error: ${scRes.error.message}`);
  if (guidesRes.error) throw new Error(`Supabase guides error: ${guidesRes.error.message}`);

  type Row = Record<string, unknown>;

  const categories: Category[] = (catRes.data ?? []).map((cat: Row) => {
    const quickFixes: QuickFixAction[] = (qfRes.data ?? [])
      .filter((q: Row) => q.category_id === cat.id)
      .map((q: Row) => ({
        id: q.id as string,
        label: q.label as string,
        requiresAdmin: q.requires_admin as boolean,
        command: q.command as string,
      }));

    const settingsShortcuts: SettingsShortcut[] = (scRes.data ?? [])
      .filter((s: Row) => s.category_id === cat.id)
      .map((s: Row) => ({
        id: s.id as string,
        label: s.label as string,
        uri: s.uri as string,
      }));

    // Use the first guide per category (most recently uploaded)
    const guideRow = (guidesRes.data ?? []).find((g: Row) => g.category_id === cat.id);
    const pdfGuide: PdfGuide | undefined = guideRow
      ? {
          id: guideRow.id as string,
          label: guideRow.filename as string,
          filename: guideRow.storage_url as string, // URL stored here; IPC handler detects https://
        }
      : undefined;

    return {
      id: cat.id as string,
      title: cat.title as string,
      icon: cat.icon as string | undefined,
      quickFixes,
      settingsShortcuts,
      pdfGuide,
    };
  });

  return {
    appName: 'IT Support Tool',
    version: '1.0.0',
    categories,
  };
}

/**
 * Loads the app configuration.
 * Tries Supabase first; falls back to local app-config.json on failure.
 *
 * @returns App configuration object
 */
export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    cachedConfig = await fetchFromSupabase();
    console.log('[ConfigLoader] Loaded config from Supabase.');
  } catch (err) {
    console.warn('[ConfigLoader] Supabase fetch failed, falling back to local config:', err);
    cachedConfig = readLocalConfig();
  }

  return cachedConfig;
}

/**
 * Invalidates the in-memory cache.
 * Call this to force a fresh fetch on the next loadConfig() call.
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
}

/**
 * Starts a Supabase Realtime subscription on all 4 config tables.
 * When any row is inserted, updated, or deleted, invalidates the cache
 * and calls onUpdate() so the main process can notify the renderer.
 *
 * Fails silently if Supabase credentials are unavailable.
 */
export function startRealtimeSync(onUpdate: () => void): void {
  try {
    const { url, anonKey } = readSupabaseCredentials();
    const supabase = createClient(url, anonKey);

    const handleChange = () => {
      console.log('[ConfigLoader] Realtime change detected — invalidating cache.');
      invalidateConfigCache();
      onUpdate();
    };

    supabase
      .channel('config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_fixes' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings_shortcuts' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guides' }, handleChange)
      .subscribe((status) => {
        console.log('[ConfigLoader] Realtime subscription status:', status);
      });
  } catch (err) {
    console.warn('[ConfigLoader] Realtime sync unavailable (offline or no credentials):', err);
  }
}
