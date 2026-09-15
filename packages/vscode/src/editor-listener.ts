// =============================================================================
// @codeforge/vscode — Editor Listener
// Captures file saves, renames, and other editor actions
// =============================================================================

import * as vscode from "vscode";
import * as path from "node:path";
import { CodeForgeRecorder } from "@codeforge/core";

/**
 * Maps file extensions to human-readable language names.
 */
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript React",
  ".js": "JavaScript",
  ".jsx": "JavaScript React",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".swift": "Swift",
  ".c": "C",
  ".cpp": "C++",
  ".h": "C Header",
  ".css": "CSS",
  ".scss": "SCSS",
  ".less": "LESS",
  ".html": "HTML",
  ".htm": "HTML",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".xml": "XML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".sh": "Shell",
  ".bash": "Bash",
  ".ps1": "PowerShell",
  ".env": "Environment",
  ".toml": "TOML",
  ".ini": "INI",
  ".cfg": "Config",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".dart": "Dart",
  ".php": "PHP",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".hs": "Haskell",
};

/**
 * Sets up editor monitoring for file saves and renames.
 */
export function setupEditorListener(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  // Track file saves
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const filePath = document.fileName;
      const ext = path.extname(filePath).toLowerCase();
      const language = LANGUAGE_MAP[ext] || ext.replace(".", "").toUpperCase();
      const sizeBytes = Buffer.byteLength(document.getText(), "utf-8");

      // Skip binary files and very large files
      if (sizeBytes > 10 * 1024 * 1024) return; // > 10MB
      if (isBinaryExtension(ext)) return;

      recorder.recordFileSave(filePath, language, sizeBytes);
    })
  );

  // Track file renames
  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles((event) => {
      for (const rename of event.files) {
        const oldPath = rename.oldUri.fsPath;
        const newPath = rename.newUri.fsPath;

        // Skip if both paths are the same (shouldn't happen but just in case)
        if (oldPath === newPath) continue;

        recorder.recordFileRename(oldPath, newPath);
      }
    })
  );
}

/**
 * Check if a file extension is likely binary.
 */
function isBinaryExtension(ext: string): boolean {
  const binaryExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".webp",
    ".mp3",
    ".mp4",
    ".wav",
    ".avi",
    ".mov",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".o",
    ".obj",
    ".stl",
    ".3mf",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
  ]);
  return binaryExtensions.has(ext);
}
