// ============================================================
// src/main/config-loader.ts
// Module for loading app configuration (categories, Quick Fixes, PDF guide list).
//
// ★ Replaceable interface layer ★
// Current implementation: reads directly from a local JSON file (config/app-config.json).
//
// When a backend API is added in Phase 2, only the internals of this file need to change:
//   call the API inside loadConfig() → fall back to local file on failure
//
// The rest of the renderer/main code depends only on the AppConfig type returned by
// loadConfig(), so changes to this module's implementation won't require edits elsewhere.
// ============================================================

import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type { AppConfig } from '../shared/types';

// In-memory cache — prevents repeated file I/O during app runtime
let cachedConfig: AppConfig | null = null;

/**
 * Determines the config file path based on the environment.
 *
 * Packaged build: copied by electron-builder extraResources
 *   → process.resourcesPath/config/app-config.json
 *
 * Development: project root
 *   → <appPath>/config/app-config.json
 */
function getConfigFilePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', 'app-config.json');
  }
  return path.join(app.getAppPath(), 'config', 'app-config.json');
}

/**
 * Reads and returns configuration from the local JSON file.
 * Also used as a fallback when API calls fail in Phase 2.
 */
function readLocalConfig(): AppConfig {
  const configPath = getConfigFilePath();

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

/**
 * Loads the app configuration.
 *
 * Current: reads directly from local JSON file (sync file I/O wrapped in async)
 *
 * Phase 2 replacement example (only change the internals of this function):
 * ─────────────────────────────────────────
 * try {
 *   const res = await fetch(`${API_BASE}/api/v1/config`);
 *   if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *   cachedConfig = await res.json();
 *   saveLocalCache(cachedConfig);   // save cache for offline fallback
 *   return cachedConfig;
 * } catch (err) {
 *   console.warn('[ConfigLoader] API failed, falling back to local cache:', err);
 *   cachedConfig = readLocalConfig();
 *   return cachedConfig;
 * }
 * ─────────────────────────────────────────
 *
 * @returns App configuration object
 */
export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  cachedConfig = readLocalConfig();
  return cachedConfig;
}

/**
 * Invalidates the in-memory cache.
 * Call this when hot-reload is needed after the config file changes.
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
}
