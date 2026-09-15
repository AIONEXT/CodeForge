// =============================================================================
// @codeforge/vscode — Extension Entry Point
// Activates on startup, sets up all listeners, and manages the extension lifecycle
// =============================================================================

import * as vscode from "vscode";
import * as path from "node:path";
import { CodeForgeRecorder } from "@codeforge/core";

import { setupTerminalListener } from "./terminal-listener.js";
import { setupEditorListener } from "./editor-listener.js";
import { setupAIListener } from "./ai-listener.js";
import {
  setupProjectLifecycle,
  deactivateProjectLifecycle,
} from "./project-lifecycle.js";
import { setupSafetyInterceptor } from "./safety-interceptor.js";
import { setupEnvironmentStatus } from "./environment-status.js";
import { registerCommands } from "./commands.js";
import { DashboardProvider } from "./webview/dashboard.js";

/** The global recorder instance */
let recorder: CodeForgeRecorder | null = null;

/**
 * Called when the extension is activated.
 * Activation event: onStartupFinished
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  console.log("[CodeForge] Extension activating...");

  // Determine project root
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
    process.cwd();

  // Read VS Code settings
  const config = vscode.workspace.getConfiguration("codeforge");
  const enabled = config.get<boolean>("enabled", true);

  if (!enabled) {
    console.log("[CodeForge] Extension is disabled in settings.");
    return;
  }

  // Create the recorder
  recorder = new CodeForgeRecorder({
    projectRoot: workspaceRoot,
    platform: "vscode",
    os: getOS(),
    settings: {
      skillLevel: config.get("skillLevel", "beginner") as any,
      language: config.get("language", "en"),
      recordTerminal: config.get("recordTerminal", true),
      recordEditor: config.get("recordEditor", true),
      recordAI: config.get("recordAI", true),
      recordGit: config.get("recordGit", true),
      maxStorageMB: config.get("maxStorageMB", 50),
    },
    onRecord: (record) => {
      // Could be used for real-time notifications
    },
    onSessionStart: (session) => {
      console.log(`[CodeForge] Session started: ${session.id}`);
    },
    onSessionEnd: (session) => {
      console.log(`[CodeForge] Session ended: ${session.id}`);
      console.log(
        `[CodeForge] Summary: ${session.summary.commandsRun} commands, ` +
          `${session.summary.errorsHit} errors, ` +
          `${session.summary.duration}`
      );
    },
  });

  // Create the dashboard provider
  const dashboardProvider = new DashboardProvider(
    context.extensionUri,
    recorder
  );

  // Register the sidebar view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      dashboardProvider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  // Set up all listeners
  setupTerminalListener(context, recorder);
  setupEditorListener(context, recorder);
  setupAIListener(context, recorder);
  setupProjectLifecycle(context, recorder);
  setupSafetyInterceptor(context, recorder);
  setupEnvironmentStatus(context, recorder);

  // Register all commands
  registerCommands(context, recorder, dashboardProvider);

  // Show welcome message on first use
  const hasShownWelcome = context.globalState.get("codeforge.hasShownWelcome");
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      "CodeForge is now recording your session! " +
        "Open the Recall Dashboard from the sidebar or command palette."
    );
    context.globalState.update("codeforge.hasShownWelcome", true);
  }

  // Auto-show dashboard if configured
  const autoShow = config.get<boolean>("autoShowDashboard", true);
  if (autoShow) {
    // Small delay to let the workspace fully load
    setTimeout(() => {
      dashboardProvider.show();
    }, 2000);
  }

  console.log("[CodeForge] Extension activated successfully.");
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  console.log("[CodeForge] Extension deactivating...");
  deactivateProjectLifecycle();
  if (recorder) {
    recorder.destroy();
    recorder = null;
  }
  console.log("[CodeForge] Extension deactivated.");
}

/**
 * Detect the current OS.
 */
function getOS(): "windows" | "macos" | "linux" | "unknown" {
  const platform = process.platform;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  return "unknown";
}
