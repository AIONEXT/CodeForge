// =============================================================================
// @codeforge/vscode — Commands
// All registered VS Code commands for CodeForge
// =============================================================================

import * as vscode from "vscode";
import * as path from "node:path";
import { CodeForgeRecorder, ExportFormat } from "@codeforge/core";
import { showEnvironmentHealth } from "./environment-status.js";

/**
 * Register all CodeForge commands.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder,
  dashboardProvider: any
): void {
  // Open Recall Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.openDashboard", () => {
      dashboardProvider.show();
    })
  );

  // Start Recording Session
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.startSession", () => {
      const session = recorder.startSession();
      vscode.window.showInformationMessage(
        `CodeForge: Session "${session.id.slice(0, 8)}" started.`
      );
    })
  );

  // Stop Recording Session
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.stopSession", () => {
      const session = recorder.endSession();
      if (session) {
        vscode.window.showInformationMessage(
          `CodeForge: Session ended. ${session.summary.commandsRun} commands, ` +
          `${session.summary.errorsHit} errors recorded.`
        );
      } else {
        vscode.window.showWarningMessage("No active session to stop.");
      }
    })
  );

  // Search History
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.searchHistory", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Search your command history",
        placeHolder: "e.g. npm install, git commit, error",
      });

      if (!query) return;

      const results = recorder.search({ text: query, limit: 20 });

      if (results.length === 0) {
        vscode.window.showInformationMessage(`No results found for "${query}".`);
        return;
      }

      // Show results in a quick pick
      const items = results.map((r) => {
        const record = r.record;
        let label = "";
        let description = "";
        let detail = "";

        if (record.type === "terminal_command") {
          label = `$(terminal) ${record.command}`;
          description = record.category;
          detail = record.explanation;
        } else if (record.type === "error") {
          label = `$(error) ${record.command}`;
          description = "error";
          detail = record.diagnosis;
        } else if (record.type === "file_save") {
          label = `$(file) ${record.fileName}`;
          description = "file save";
          detail = record.path;
        } else if (record.type === "ai_prompt") {
          label = `$(sparkle) ${record.prompt.slice(0, 60)}`;
          description = record.source;
          detail = record.prompt;
        } else if (record.type === "milestone") {
          label = `$(star) ${record.label}`;
          description = "milestone";
          detail = record.explanation;
        } else if (record.type === "git_action") {
          label = `$(git-commit) ${record.action}`;
          description = "git";
          detail = record.explanation;
        }

        return {
          label,
          description,
          detail,
          record,
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Found ${results.length} results for "${query}"`,
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (selected) {
        // Show detail in a notification
        const record = selected.record as any;
        const detail = record.explanation || record.diagnosis || record.label || "";
        vscode.window.showInformationMessage(`CodeForge: ${detail}`);
      }
    })
  );

  // Export as Markdown
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.exportMarkdown", async () => {
      const output = recorder.export({
        format: "markdown",
        includeExplanations: true,
        includeOutputs: true,
        includeErrors: true,
      });

      if (!output) {
        vscode.window.showWarningMessage("No session data to export.");
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) return;

      const defaultPath = path.join(workspaceRoot, "codeforge-export.md");

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultPath),
        filters: {
          "Markdown": ["md"],
        },
      });

      if (uri) {
        const fs = require("node:fs");
        fs.writeFileSync(uri.fsPath, output, "utf-8");
        vscode.window.showInformationMessage(
          `CodeForge: Exported to ${uri.fsPath}`
        );
      }
    })
  );

  // Export as HTML
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.exportHTML", async () => {
      const output = recorder.export({
        format: "html",
        includeExplanations: true,
        includeOutputs: true,
        includeErrors: true,
      });

      if (!output) {
        vscode.window.showWarningMessage("No session data to export.");
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) return;

      const defaultPath = path.join(workspaceRoot, "codeforge-export.html");

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultPath),
        filters: {
          "HTML": ["html"],
        },
      });

      if (uri) {
        const fs = require("node:fs");
        fs.writeFileSync(uri.fsPath, output, "utf-8");
        vscode.window.showInformationMessage(
          `CodeForge: Exported to ${uri.fsPath}`
        );
      }
    })
  );

  // Show Glossary
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.showGlossary", async () => {
      const terms = [
        "git", "commit", "branch", "merge", "clone", "push", "pull",
        "npm", "node_modules", "package.json", "dependency",
        "port", "localhost", "terminal", "CLI", "PATH",
        "environment variable", ".env file", ".gitignore",
        "build", "compile", "debug", "stack trace",
        "API", "endpoint", "REST", "HTTP",
        "Docker", "container", "image",
        "TypeScript", "React", "Node.js",
      ];

      const selected = await vscode.window.showQuickPick(
        terms.map((t) => ({ label: t })),
        { placeHolder: "Select a term to learn about" }
      );

      if (selected) {
        // Use the explainer's glossary
        const { getGlossaryDefinition } = require("@codeforge/core");
        const definition = getGlossaryDefinition(selected.label);

        if (definition) {
          vscode.window.showInformationMessage(
            `${selected.label}: ${definition}`
          );
        } else {
          vscode.window.showInformationMessage(
            `No definition available for "${selected.label}".`
          );
        }
      }
    })
  );

  // Check Environment Health
  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.checkEnvironment", () => {
      showEnvironmentHealth(recorder);
    })
  );
}
