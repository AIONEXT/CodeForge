// =============================================================================
// @codeforge/vscode — Project Lifecycle
// Handles project open/close, auto-loads recordbook, detects environment
// =============================================================================

import * as vscode from "vscode";
import * as path from "node:path";
import {
  CodeForgeRecorder,
  loadOrCreateRecordBook,
  detectEnvironment,
  detectProjectType,
  RecordBook,
} from "@codeforge/core";

/** The active recorder instance */
let activeRecorder: CodeForgeRecorder | null = null;

/** Get the current recorder (or null if not initialized) */
export function getRecorder(): CodeForgeRecorder | null {
  return activeRecorder;
}

/**
 * Initialize the project lifecycle hooks.
 * Called when VS Code starts or when a workspace is opened.
 */
export function setupProjectLifecycle(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  activeRecorder = recorder;

  // Record that we're starting a session
  const session = recorder.startSession();

  vscode.window.showInformationMessage(
    `CodeForge: Recording session started for "${session.id.slice(0, 8)}..."`
  );

  // On workspace folder change, handle project switch
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      // For added folders
      for (const folder of event.added) {
        handleProjectOpen(folder.uri.fsPath);
      }

      // For removed folders
      for (const folder of event.removed) {
        handleProjectClose(folder.uri.fsPath);
      }
    })
  );

  // On window close, end the session
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(() => {
      // No-op — session ends on deactivation
    })
  );

  // Detect and display project health
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    const env = detectEnvironment(workspaceRoot);
    const projectInfo = detectProjectType(workspaceRoot);

    if (env.detectedIssues.length > 0) {
      vscode.window.showWarningMessage(
        `CodeForge: Project has ${env.detectedIssues.length} issue(s). Click for details.`,
        "Show Issues"
      ).then((action) => {
        if (action === "Show Issues") {
          vscode.commands.executeCommand("codeforge.checkEnvironment");
        }
      });
    }
  }
}

/**
 * Handle a project being opened.
 */
function handleProjectOpen(projectRoot: string): void {
  const recordBook = loadOrCreateRecordBook(projectRoot, "vscode");
  vscode.window.showInformationMessage(
    `CodeForge: Loaded record book for "${recordBook.project.name}"`
  );
}

/**
 * Handle a project being closed.
 */
function handleProjectClose(projectRoot: string): void {
  // Session end is handled by the recorder's destroy method
}

/**
 * Clean up when the extension deactivates.
 */
export function deactivateProjectLifecycle(): void {
  if (activeRecorder) {
    activeRecorder.endSession();
    activeRecorder.destroy();
    activeRecorder = null;
  }
}
