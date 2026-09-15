// =============================================================================
// @codeforge/vscode — Terminal Listener
// Captures terminal commands and outputs by hooking into VS Code's terminal API
// =============================================================================

import * as vscode from "vscode";
import { CodeForgeRecorder } from "@codeforge/core";

interface TerminalData {
  readonly terminal: vscode.Terminal;
  readonly processId: Thenable<number | undefined>;
  buffer: string;
  currentCommand: string;
  commandStartTime: number;
  isActive: boolean;
}

/**
 * Sets up terminal monitoring for all current and future terminals.
 * Captures command text, output, exit codes, and timing.
 */
export function setupTerminalListener(
  context: vscode.ExtensionContext,
  recorder: CodeForgeRecorder
): void {
  const terminalMap = new Map<number, TerminalData>();

  // Hook into existing terminals
  vscode.window.terminals.forEach((terminal) => {
    registerTerminal(terminal);
  });

  // Hook into new terminals
  context.subscriptions.push(
    vscode.window.onDidOpenTerminal((terminal) => {
      registerTerminal(terminal);
    })
  );

  // Hook into terminal close to clean up
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      const data = terminalMap.get(terminal.processId as any);
      if (data?.isActive && data.currentCommand) {
        flushCurrentCommand(data);
      }
      terminalMap.delete(terminal.processId as any);
    })
  );

  // Hook into terminal shell execution to detect commands
  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution((event) => {
      const terminal = event.terminal;
      const execution = event.execution;
      const commandLine = execution.commandLine;

      if (commandLine.value) {
        handleCommandStart(terminal, commandLine.value);
      }
    })
  );

  // Hook into terminal shell execution close
  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((event) => {
      const terminal = event.terminal;
      const execution = event.execution;
      // exitCode may not be available on all VS Code versions
      const exitCode = (event as any).exitCode ?? 0;

      handleCommandEnd(terminal, exitCode);
    })
  );

  function registerTerminal(terminal: vscode.Terminal): void {
    const data: TerminalData = {
      terminal,
      processId: terminal.processId,
      buffer: "",
      currentCommand: "",
      commandStartTime: 0,
      isActive: true,
    };

    terminal.processId.then((id) => {
      if (id) {
        terminalMap.set(id, data);
      }
    });

    // Capture output data
    const disposable = (terminal as any).onDidWriteData?.((rawData: string) => {
      if (!data.isActive) return;

      // Strip ANSI escape sequences for clean output
      const cleanData = stripAnsiCodes(rawData);

      // Detect if this looks like a prompt (new command line)
      if (isPromptLine(cleanData)) {
        // If there was a previous command, flush it
        if (data.currentCommand) {
          flushCurrentCommand(data);
        }
        // Start tracking new command
        data.currentCommand = extractCommandFromPrompt(cleanData);
        data.commandStartTime = Date.now();
        data.buffer = "";
      } else {
        data.buffer += cleanData;
      }
    });

    if (disposable) {
      context.subscriptions.push(disposable);
    }
  }

  function handleCommandStart(terminal: vscode.Terminal, command: string): void {
    terminal.processId.then((id) => {
      if (!id) return;
      const data = terminalMap.get(id);
      if (!data) return;

      // Flush any previous command
      if (data.currentCommand) {
        flushCurrentCommand(data);
      }

      data.currentCommand = command;
      data.commandStartTime = Date.now();
      data.buffer = "";
    });
  }

  function handleCommandEnd(terminal: vscode.Terminal, exitCode: number): void {
    terminal.processId.then((id) => {
      if (!id) return;
      const data = terminalMap.get(id);
      if (!data || !data.currentCommand) return;

      const duration = Date.now() - data.commandStartTime;
      const output = data.buffer.trim();

      // Get working directory
      const cwd = (terminal as any).creationOptions?.cwd?.toString() ||
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

      // Get shell info
      const shellPath = (terminal as any).creationOptions?.shellPath || "unknown";

      recorder.recordCommand(
        data.currentCommand,
        output,
        exitCode,
        duration,
        cwd,
        shellPath
      );

      // If command failed, also record as error
      if (exitCode !== 0) {
        recorder.recordError(
          data.currentCommand,
          output || `Command exited with code ${exitCode}`,
          data.buffer,
          exitCode
        );
      }

      // Reset
      data.currentCommand = "";
      data.buffer = "";
      data.commandStartTime = 0;
    });
  }

  function flushCurrentCommand(data: TerminalData): void {
    if (!data.currentCommand) return;

    const duration = Date.now() - data.commandStartTime;
    const output = data.buffer.trim();

    const cwd = (data.terminal as any).creationOptions?.cwd?.toString() ||
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    const shellPath = (data.terminal as any).creationOptions?.shellPath || "unknown";

    recorder.recordCommand(
      data.currentCommand,
      output,
      0, // unknown exit code when flushing manually
      duration,
      cwd,
      shellPath
    );

    data.currentCommand = "";
    data.buffer = "";
    data.commandStartTime = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip ANSI escape sequences from terminal output */
function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g, "");
}

/** Detect if a line looks like a terminal prompt */
function isPromptLine(text: string): boolean {
  const trimmed = text.trim();
  // Common prompt patterns
  return (
    trimmed.endsWith("$") ||
    trimmed.endsWith("#") ||
    trimmed.endsWith(">") ||
    trimmed.endsWith("%") ||
    /[\w.]+@[\w.]+:/.test(trimmed) ||
    /\$\s*$/.test(trimmed)
  );
}

/** Extract the command from a prompt line (text after the last $ or >) */
function extractCommandFromPrompt(text: string): string {
  const trimmed = text.trim();
  // Try to find command after common prompt endings
  const dollarMatch = trimmed.match(/\$\s+(.+)$/);
  if (dollarMatch) return dollarMatch[1];

  const greaterMatch = trimmed.match(/>\s*(.+)$/);
  if (greaterMatch) return greaterMatch[1];

  // If no prompt pattern found, return the whole line
  return trimmed;
}
