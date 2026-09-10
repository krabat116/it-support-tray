// ============================================================
// src/main/command-runner.ts
// System command execution module.
//
// ★ UAC (User Account Control) handling ★
// ──────────────────────────────────────────────────────────
// When running commands that require admin rights on Windows,
// PowerShell's Start-Process with the -Verb RunAs flag is used.
//
//   powershell -NoProfile -Command
//     "Start-Process cmd -ArgumentList '/c <command>' -Verb RunAs -Wait -WindowStyle Hidden"
//
// Advantages of this approach:
//   1. The Electron app itself runs with normal privileges (electron-builder.yml: asInvoker)
//   2. The UAC dialog only appears when admin rights are actually needed
//   3. If the user cancels UAC, the app doesn't crash — an error message is returned instead
//
// Notes:
//   - The -Wait flag waits for the command to complete (Promise remains pending until done)
//   - If the user cancels UAC, a non-zero exit code is returned
//   - Double quotes (") inside commands must be escaped
// ──────────────────────────────────────────────────────────
// ============================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { QuickFixResult } from '../shared/types';

const execAsync = promisify(exec);

// ----------------------------------------------------------------
// Internal helper: run command with normal privileges
// ----------------------------------------------------------------

/**
 * Executes a shell command with normal (non-admin) privileges.
 */
async function runNormalCommand(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, {
    shell: 'cmd.exe',  // Explicitly set cmd.exe for && chaining on Windows
    timeout: 30_000,   // 30-second timeout
  });
}

// ----------------------------------------------------------------
// Internal helper: run command with admin privileges (triggers UAC)
// ----------------------------------------------------------------

/**
 * Executes a command that requires admin privileges.
 * Triggers a UAC prompt via PowerShell Start-Process -Verb RunAs.
 *
 * Implementation details:
 *   - Escapes double quotes inside the command to prevent PowerShell parsing errors
 *   - Uses -WindowStyle Hidden to prevent cmd.exe window flicker
 *   - Uses -Wait to wait for completion before resolving
 */
async function runAdminCommand(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  // Escape double quotes inside the command (inside a PowerShell string)
  const escaped = command.replace(/"/g, '`"');

  const psScript = [
    `Start-Process cmd`,
    `-ArgumentList '/c ${escaped}'`,
    `-Verb RunAs`,
    `-Wait`,
    `-WindowStyle Hidden`,
  ].join(' ');

  return execAsync(
    `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript}"`,
    { timeout: 60_000 }  // 60-second timeout including UAC approval wait
  );
}

// ----------------------------------------------------------------
// Special command: clean temp files
// ----------------------------------------------------------------

/**
 * Deletes files and folders in the %TEMP% directory.
 * Skips files that are in use or lack sufficient permissions.
 */
async function handleCleanTemp(): Promise<QuickFixResult> {
  const tempDir = os.tmpdir();
  let deleted = 0;
  let skipped = 0;

  try {
    const entries = fs.readdirSync(tempDir);

    for (const entry of entries) {
      const fullPath = path.join(tempDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        deleted++;
      } catch {
        // Locked files, insufficient permissions, etc. — skip
        skipped++;
      }
    }

    return {
      actionId: 'clean-temp',
      success: true,
      message: `Temp cleanup complete — ${deleted} deleted, ${skipped} skipped`,
    };
  } catch (err) {
    return {
      actionId: 'clean-temp',
      success: false,
      message: `Temp cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ----------------------------------------------------------------
// Special command: empty recycle bin
// ----------------------------------------------------------------

/**
 * Empties the Recycle Bin using PowerShell Clear-RecycleBin.
 */
async function handleEmptyRecycleBin(): Promise<QuickFixResult> {
  try {
    await execAsync(
      'powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"',
      { timeout: 30_000 }
    );
    return {
      actionId: 'empty-recycle-bin',
      success: true,
      message: 'Recycle Bin emptied successfully.',
    };
  } catch (err) {
    return {
      actionId: 'empty-recycle-bin',
      success: false,
      message: `Failed to empty Recycle Bin: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Executes a Quick Fix command and returns the result.
 *
 * @param actionId      Action ID defined in config (for logging/tracking)
 * @param command       Command string or special command ID to execute
 * @param requiresAdmin Whether admin privileges are required
 */
export async function runQuickFix(
  actionId: string,
  command: string,
  requiresAdmin: boolean
): Promise<QuickFixResult> {
  // Handle special command IDs (Node.js direct implementation, not shell commands)
  if (command === 'clean-temp') return handleCleanTemp();
  if (command === 'empty-recycle-bin') return handleEmptyRecycleBin();

  try {
    const { stdout, stderr } = requiresAdmin
      ? await runAdminCommand(command)
      : await runNormalCommand(command);

    return {
      actionId,
      success: true,
      message: 'Command executed successfully.',
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (err: unknown) {
    const e = err as {
      message?: string;
      stdout?: string;
      stderr?: string;
      code?: number | string;
    };

    // Detect UAC cancellation or access denied
    const isUacCancelled =
      requiresAdmin &&
      (e.message?.includes('was canceled') ||
        e.message?.includes('Access is denied') ||
        e.code === 1);

    if (isUacCancelled) {
      return {
        actionId,
        success: false,
        message: 'Admin permission request was cancelled. Please click "Yes" in the UAC prompt.',
        stderr: e.stderr,
      };
    }

    return {
      actionId,
      success: false,
      message: `Execution failed: ${e.message ?? 'Unknown error'}`,
      stdout: e.stdout,
      stderr: e.stderr,
    };
  }
}
