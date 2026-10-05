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
  const isWindows = process.platform === 'win32';
  return execAsync(command, {
    shell: isWindows ? 'cmd.exe' : '/bin/sh',  // cmd.exe on Windows, /bin/sh on macOS
    timeout: 30_000,   // 30-second timeout
  });
}

// ----------------------------------------------------------------
// Internal helper: run command with admin privileges (triggers UAC)
// ----------------------------------------------------------------

/**
 * Executes a command that requires admin privileges.
 *
 * Windows: Triggers a UAC prompt via PowerShell Start-Process -Verb RunAs.
 * macOS:   Shows a native password dialog via osascript (do shell script ... with administrator privileges).
 */
async function runAdminCommand(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  if (process.platform !== 'win32') {
    // macOS: native admin authentication dialog via osascript
    // Escape backslashes first, then double quotes (AppleScript string delimiters)
    const escaped = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    // 2>&1 merges stderr into stdout so error details are visible in the UI
    return execAsync(
      `osascript -e 'do shell script "${escaped} 2>&1" with administrator privileges'`,
      { timeout: 60_000 }
    );
  }

  // Windows: PowerShell UAC elevation
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

    const out = stdout.trim();
    return {
      actionId,
      success: true,
      // If the command echoed a result message, show it; otherwise use a generic message
      message: out || 'Command executed successfully.',
      stdout: out,
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
      (e.message?.includes('was canceled') ||        // Windows UAC canceled
        e.message?.includes('Access is denied') ||   // Windows access denied
        e.message?.includes('User canceled') ||      // macOS osascript cancel
        e.message?.includes('(-128)') ||             // AppleScript user-cancel code
        e.code === 1);

    if (isUacCancelled) {
      return {
        actionId,
        success: false,
        message: process.platform === 'win32'
          ? 'Admin permission request was cancelled. Please click "Yes" in the UAC prompt.'
          : 'Admin permission request was cancelled. Please enter your password when prompted.',
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
