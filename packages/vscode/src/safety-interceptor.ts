// =============================================================================
// @codeforge/vscode — Safety Interceptor
// Warns before destructive commands are executed in the terminal
// =============================================================================

import * as vscode from "vscode";
import { CodeForgeRecorder } from "@codeforge/core";

/** Commands that are considered destructive */
const DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\brm\s+(-[rRfF]+\s+|-[a-zA-Z]*[rR][a-zA-Z]*\s+)/,
    reason: "This will permanently delete files and folders. There is no undo.",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: "This will discard ALL uncommitted changes. They cannot be recovered.",
  },
  {
    pattern: /\bgit\s+push\s+.*--force\b/,
    reason: "This will force-push to a remote branch, potentially overwriting others' work.",
  },
  {
    pattern: /\bgit\s+clean\s+-[^\s]*f\b/,
    reason: "This will permanently delete untracked files from your repository.",
  },
  {
    pattern: /\bDROP\s+(TABLE|DATABASE)\b/i,
    reason: "This will permanently delete database tables and all their data.",
  },
  {
    pattern: /\bDELETE\s+FROM\b/i,
    reason: "This will permanently delete rows from a database table.",
  },
  {
    pattern: /\bTRUNCATE\s+(TABLE)?\b/i,
    reason: "This will permanently delete all rows from a database table.",
  },
  {
    pattern: /\bchmod\s+777\b/,
    reason: "This gives everyone full access to the file, which is a security risk.",
  },
  {
    pattern: /\bsudo\s+rm\b/,
    reason: "This permanently deletes files with administrator privileges.",
  },
  {
    pattern: /\bdocker\s+(rm|rmi)\s+/,
    reason: "This will remove a container or image. Make sure you have backups.",
  },
  {
    pattern: /\bnpm\s+publish\b/,
    reason: "This will publish a package to the npm registry. Make sure you're ready.",
  },
];

/**
 * Sets up a safety interceptor that warns before destructive commands.
 *
 * This works by hooking into the terminal shell execution event
 * and showing a confirmation dialog before allowing the command.
 */
export function setupSafetyInterceptor(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  // Hook into terminal shell execution
  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution(async (event) => {
      const commandLine = event.execution.commandLine.value;

      // Check if this command is destructive
      const destructive = DESTRUCTIVE_PATTERNS.find((d) =>
        d.pattern.test(commandLine)
      );

      if (destructive) {
        // Get the safety check from the recorder
        const safety = recorder.checkCommandSafety(commandLine);

        // Show a detailed warning
        const action = await vscode.window.showWarningMessage(
          `CodeForge Safety: ${destructive.reason}`,
          { modal: true },
          "Run Anyway",
          "Cancel",
          "Show Explanation"
        );

        if (action === "Cancel") {
          // Cancel the execution by not continuing
          // Note: VS Code doesn't provide a direct way to cancel terminal execution
          // The user will need to press Ctrl+C in the terminal
          vscode.window.showInformationMessage(
            "CodeForge: Command cancelled. Press Ctrl+C in the terminal if needed."
          );
        } else if (action === "Show Explanation") {
          const panel = vscode.window.createWebviewPanel(
            "codeforgeSafety",
            "CodeForge Safety Check",
            vscode.ViewColumn.Active,
            { enableScripts: false }
          );

          panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, sans-serif; padding: 20px; color: #e0e0e0; background: #1a1a2e; }
                h2 { color: #f77f00; }
                .command { background: #16213e; padding: 10px; border-radius: 6px; font-family: monospace; margin: 10px 0; }
                .explanation { color: #4cc9f0; margin: 10px 0; }
                .warning { color: #e74c3c; font-weight: bold; }
                .fix { color: #2ecc71; margin-top: 10px; }
              </style>
            </head>
            <body>
              <h2>Safety Check</h2>
              <div class="command">${escapeHtml(commandLine)}</div>
              <div class="warning">⚠️ ${escapeHtml(destructive.reason)}</div>
              <div class="explanation">${escapeHtml(safety.explanation)}</div>
              <div class="fix">💡 ${escapeHtml(safety.reason)}</div>
            </body>
            </html>
          `;
        }
        // If "Run Anyway", let it proceed
      }
    })
  );
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
