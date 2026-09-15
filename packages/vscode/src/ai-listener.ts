// =============================================================================
// @codeforge/vscode — AI Prompt Listener
// Captures prompts sent to AI assistants (GitHub Copilot, etc.)
// =============================================================================

import * as vscode from "vscode";
import { CodeForgeRecorder } from "@codeforge/core";

/** Known AI-related VS Code command IDs that involve user prompts */
const AI_COMMAND_IDS = new Set([
  "github.copilot.chat\u202E",
  "github.copilot.generate",
  "github.copilot.chat.explain",
  "github.copilot.chat.fix",
  "github.copilot.chat.review",
  "github.copilot.inlineChat",
  "editor.action.inlineChat",
  "workbench.action.chat",
  "workbench.action.chat.open",
  "workbench.action.chat.clear",
  "workbench.action.chat.send",
]);

/** Track if we're in a chat input context */
let lastChatInput = "";
let chatInputTimestamp = 0;

/**
 * Sets up monitoring for AI assistant interactions.
 *
 * Strategy:
 * 1. Monitor chat input via onDidChangeTextDocument on chat input files
 * 2. Monitor Copilot inline chat sessions
 * 3. Record any AI-related command invocations
 */
export function setupAIListener(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  // Monitor text documents that look like chat/AI input
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const document = event.document;

      // Check if this is a chat-like input (temporary, untitled, or special language)
      if (isChatDocument(document)) {
        const text = document.getText();
        if (text.length > 0 && text !== lastChatInput) {
          lastChatInput = text;
          chatInputTimestamp = Date.now();
        }
      }
    })
  );

  // Monitor when documents are saved — check if it was a chat response
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      // If a chat-like document was saved, record it as an AI prompt
      if (isChatDocument(document)) {
        const text = document.getText().trim();
        if (text.length > 0) {
          const activeEditor = vscode.window.activeTextEditor;
          const source = detectAISource(activeEditor);
          const filesContext = getOpenFilePaths();

          recorder.recordAIPrompt(text, source, filesContext);
        }
      }
    })
  );

  // Monitor command executions that might be AI-related
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeforge.interceptAIPrompt",
      (...args: unknown[]) => {
        // This is a fallback — if we detect an AI command, record it
        const prompt = args[0];
        if (typeof prompt === "string" && prompt.length > 0) {
          const source = "copilot";
          const filesContext = getOpenFilePaths();
          recorder.recordAIPrompt(prompt, source, filesContext);
        }
      }
    )
  );

  // Register a manual command to record an AI prompt
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeforge.recordAIPrompt",
      async () => {
        const prompt = await vscode.window.showInputBox({
          prompt: "Enter the AI prompt you used",
          placeHolder: "e.g. Add error handling to the API endpoint",
          validateInput: (value) => {
            return value.length === 0 ? "Please enter a prompt" : null;
          },
        });

        if (prompt) {
          const source = await vscode.window.showQuickPick(
            ["copilot", "chatgpt", "cursor", "claude", "other"],
            { placeHolder: "Which AI tool did you use?" }
          );

          const filesContext = getOpenFilePaths();
          recorder.recordAIPrompt(prompt, source || "other", filesContext);
        }
      }
    )
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a document looks like an AI chat input */
function isChatDocument(document: vscode.TextDocument): boolean {
  // Check language
  const langId = document.languageId;
  if (langId === "chat" || langId === "copilot-chat") return true;

  // Check if untitled (new file, might be chat input)
  if (document.isUntitled) {
    const text = document.getText();
    // Chat prompts are typically short, single-line text
    if (text.length < 500 && !text.includes("\n\n")) {
      return true;
    }
  }

  // Check file name patterns
  const fileName = document.fileName.toLowerCase();
  if (
    fileName.includes("chat") ||
    fileName.includes("prompt") ||
    fileName.includes("copilot")
  ) {
    return true;
  }

  return false;
}

/** Detect which AI tool is being used */
function detectAISource(
  editor: vscode.TextEditor | undefined
): string {
  if (!editor) return "unknown";

  const langId = editor.document.languageId;
  if (langId === "copilot-chat" || langId === "github-copilot-chat") {
    return "copilot";
  }

  // Check the active extensions for clues
  const extensions = vscode.extensions.all.map((ext) => ext.id.toLowerCase());
  if (extensions.some((id) => id.includes("copilot"))) return "copilot";
  if (extensions.some((id) => id.includes("cursor"))) return "cursor";
  if (extensions.some((id) => id.includes("claude"))) return "claude";

  return "other";
}

/** Get the file paths of all currently open editors */
function getOpenFilePaths(): string[] {
  return vscode.window.visibleTextEditors.map(
    (editor) => editor.document.fileName
  );
}
