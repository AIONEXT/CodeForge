// =============================================================================
// @codeforge/vscode — Environment Status
// Status bar indicator showing project health and recording state
// =============================================================================

import * as vscode from "vscode";
import { CodeForgeRecorder, detectEnvironment, detectProjectType } from "@codeforge/core";

/** Status bar item for CodeForge */
let statusBarItem: vscode.StatusBarItem | null = null;

/** Current recording state */
let isRecording = false;

/**
 * Create and manage the status bar indicator.
 */
export function setupEnvironmentStatus(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  // Create status bar item (left side, priority 100)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  updateStatusBar(recorder, true);

  // Show it
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);

  // Update when workspace changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      updateStatusBar(recorder, isRecording);
    })
  );

  // Update recording state
  isRecording = true;
  updateStatusBar(recorder, true);
}

/**
 * Update the status bar to reflect current state.
 */
function updateStatusBar(recorder: CodeForgeRecorder, recording: boolean): void {
  if (!statusBarItem) return;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspaceRoot) {
    statusBarItem.text = "$(history) CodeForge: No Workspace";
    statusBarItem.tooltip = "Open a folder to start recording";
    statusBarItem.backgroundColor = undefined;
    return;
  }

  if (recording) {
    statusBarItem.text = "$(pulse) CodeForge: Recording";
    statusBarItem.tooltip = "CodeForge is recording your session. Click to open dashboard.";
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = "$(history) CodeForge: Paused";
    statusBarItem.tooltip = "CodeForge is paused. Click to resume.";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  }

  // Click to open dashboard
  statusBarItem.command = "codeforge.openDashboard";
}

/**
 * Update recording state.
 */
export function setRecordingState(recording: boolean): void {
  isRecording = recording;
  if (statusBarItem) {
    const recorder = require("./project-lifecycle").getRecorder();
    if (recorder) {
      updateStatusBar(recorder, recording);
    }
  }
}

/**
 * Show environment health check in a panel.
 */
export async function showEnvironmentHealth(
  recorder: CodeForgeRecorder
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage("No workspace folder is open.");
    return;
  }

  const env = detectEnvironment(workspaceRoot);
  const projectInfo = detectProjectType(workspaceRoot);

  const panel = vscode.window.createWebviewPanel(
    "codeforgeHealth",
    "CodeForge: Project Health",
    vscode.ViewColumn.Active,
    { enableScripts: false }
  );

  panel.webview.html = generateHealthHTML(env, projectInfo, workspaceRoot);
}

function generateHealthHTML(
  env: ReturnType<typeof detectEnvironment>,
  projectInfo: ReturnType<typeof detectProjectType>,
  projectRoot: string
): string {
  const projectName = projectRoot.split(/[/\\]/).pop() || "Unknown";

  const versionRows = [
    env.nodeVersion ? ["Node.js", env.nodeVersion] : null,
    env.npmVersion ? ["npm", env.npmVersion] : null,
    env.pythonVersion ? ["Python", env.pythonVersion] : null,
    env.javaVersion ? ["Java", env.javaVersion] : null,
    env.rustVersion ? ["Rust", env.rustVersion] : null,
    env.goVersion ? ["Go", env.goVersion] : null,
    env.gitVersion ? ["Git", env.gitVersion] : null,
  ].filter(Boolean) as [string, string][];

  const issues = env.detectedIssues.length > 0
    ? env.detectedIssues.map((i) => `<div class="issue">⚠️ ${escapeHtml(i)}</div>`).join("")
    : '<div class="ok">✅ No issues detected</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; color: #e0e0e0; background: #1a1a2e; }
    h1 { color: #f77f00; margin-bottom: 5px; }
    .subtitle { color: #adb5bd; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { text-align: left; padding: 8px; border-bottom: 2px solid #f77f00; color: #f77f00; }
    td { padding: 8px; border-bottom: 1px solid #333; }
    .ok { color: #2ecc71; padding: 5px 0; }
    .issue { color: #e74c3c; padding: 5px 0; }
    .tag { display: inline-block; background: #16213e; padding: 4px 10px; border-radius: 12px; margin: 3px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Project Health</h1>
  <div class="subtitle">${escapeHtml(projectName)}</div>
  
  <h2>Detected Type</h2>
  <div><span class="tag">${escapeHtml(projectInfo.type)}</span></div>
  <div style="margin-top: 8px;">
    ${projectInfo.toolchain.map((t: string) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}
  </div>

  <h2>Versions</h2>
  <table>
    <tr><th>Tool</th><th>Version</th></tr>
    ${versionRows.map(([name, ver]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(ver)}</td></tr>`).join("")}
  </table>

  <h2>Issues</h2>
  ${issues}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
