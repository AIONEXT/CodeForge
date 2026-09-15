// =============================================================================
// @codeforge/core — Recorder Engine
// The central recording engine that captures, processes, and stores all events
// =============================================================================

import type {
  RecordBook,
  RecordEntry,
  Session,
  TerminalCommandRecord,
  ErrorRecord,
  FileSaveRecord,
  FileRenameRecord,
  AIPromptRecord,
  MilestoneRecord,
  GitActionRecord,
  RecorderConfig,
  Platform,
  OS,
  SearchQuery,
  SearchResult,
  ExportOptions,
  SessionSummary,
  CommandCategory,
} from "./types.js";

import { generateId, nowISO, formatDuration } from "./types.js";

import {
  loadOrCreateRecordBook,
  appendRecord,
  addSession,
  updateSession,
  readRecordBook,
} from "./storage.js";

import {
  categorizeCommand,
  classifyError,
  getGitAction,
  getCategoryCounts,
} from "./analyzer.js";

import {
  explainCommand,
  explainError,
  suggestFix,
  getCommandSafetyLevel,
} from "./explainer.js";

// ---------------------------------------------------------------------------
// Recorder class
// ---------------------------------------------------------------------------

export class CodeForgeRecorder {
  private projectRoot: string;
  private platform: Platform;
  private os: OS;
  private recordBook: RecordBook;
  private activeSession: Session | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onRecord?: (record: RecordEntry) => void;
  private onSessionStart?: (session: Session) => void;
  private onSessionEnd?: (session: Session) => void;

  constructor(config: RecorderConfig) {
    this.projectRoot = config.projectRoot;
    this.platform = config.platform;
    this.os = this.detectOS();
    this.onRecord = config.onRecord;
    this.onSessionStart = config.onSessionStart;
    this.onSessionEnd = config.onSessionEnd;

    // Load or create the recordbook
    this.recordBook = loadOrCreateRecordBook(
      config.projectRoot,
      config.platform,
      config.settings
    );

    // Auto-flush every 5 seconds
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  private detectOS(): OS {
    const platform = process.platform;
    if (platform === "win32") return "windows";
    if (platform === "darwin") return "macos";
    if (platform === "linux") return "linux";
    return "unknown";
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /** Start a new recording session */
  startSession(): Session {
    const session: Session = {
      id: generateId(),
      startedAt: nowISO(),
      platform: this.platform,
      os: this.os,
      summary: {
        commandsRun: 0,
        errorsHit: 0,
        filesModified: 0,
        aiPromptsUsed: 0,
        gitActions: 0,
        milestones: 0,
        duration: "0s",
        durationMs: 0,
        topCategories: [],
      },
      records: [],
    };

    this.activeSession = session;
    addSession(this.projectRoot, session);
    this.onSessionStart?.(session);

    return session;
  }

  /** End the current recording session */
  endSession(): Session | null {
    if (!this.activeSession) return null;

    const endedSession: Session = {
      ...this.activeSession,
      endedAt: nowISO(),
      summary: this.computeSummary(this.activeSession),
    };

    updateSession(this.projectRoot, endedSession.id, endedSession);
    this.onSessionEnd?.(endedSession);

    this.activeSession = null;
    return endedSession;
  }

  /** Get the currently active session */
  getActiveSession(): Session | null {
    return this.activeSession;
  }

  // -----------------------------------------------------------------------
  // Recording methods
  // -----------------------------------------------------------------------

  /** Record a terminal command */
  recordCommand(
    command: string,
    output: string,
    exitCode: number,
    duration: number,
    cwd: string,
    shell: string
  ): TerminalCommandRecord | null {
    if (!this.activeSession) return null;
    if (!this.recordBook.codeforge.recordTerminal) return null;

    // Skip empty commands
    if (!command.trim()) return null;

    const { category, destructive } = categorizeCommand(command);
    const explanation = explainCommand(command);

    const record: TerminalCommandRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "terminal_command",
      command: command.trim(),
      output,
      exitCode,
      duration,
      cwd,
      shell,
      category,
      explanation,
      isDestructive: destructive,
    };

    this.emitRecord(record);

    // Auto-detect milestones
    this.detectMilestones(command, output, exitCode);

    return record;
  }

  /** Record an error */
  recordError(
    command: string,
    error: string,
    stderr: string,
    exitCode: number
  ): ErrorRecord | null {
    if (!this.activeSession) return null;

    const category = classifyError(error + " " + stderr);
    const diagnosis = explainError(error + " " + stderr, command);
    const suggestedFix = suggestFix(error + " " + stderr, command);

    const record: ErrorRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "error",
      command: command.trim(),
      error,
      stderr,
      exitCode,
      category,
      diagnosis,
      suggestedFix,
      resolved: false,
    };

    this.emitRecord(record);
    return record;
  }

  /** Record a file save */
  recordFileSave(
    filePath: string,
    language: string,
    sizeBytes: number
  ): FileSaveRecord | null {
    if (!this.activeSession) return null;
    if (!this.recordBook.codeforge.recordEditor) return null;

    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    const record: FileSaveRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "file_save",
      path: filePath,
      fileName,
      language,
      sizeBytes,
    };

    this.emitRecord(record);
    return record;
  }

  /** Record a file rename/move */
  recordFileRename(oldPath: string, newPath: string): FileRenameRecord | null {
    if (!this.activeSession) return null;
    if (!this.recordBook.codeforge.recordEditor) return null;

    const oldName = oldPath.split(/[/\\]/).pop() || oldPath;
    const newName = newPath.split(/[/\\]/).pop() || newPath;

    const record: FileRenameRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "file_rename",
      oldPath,
      newPath,
      oldName,
      newName,
    };

    this.emitRecord(record);
    return record;
  }

  /** Record an AI prompt */
  recordAIPrompt(
    prompt: string,
    source: string,
    filesContext: string[]
  ): AIPromptRecord | null {
    if (!this.activeSession) return null;
    if (!this.recordBook.codeforge.recordAI) return null;

    const record: AIPromptRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "ai_prompt",
      prompt,
      source,
      filesContext,
    };

    this.emitRecord(record);
    return record;
  }

  /** Record a milestone */
  recordMilestone(
    label: string,
    command?: string,
    severity: "info" | "success" | "warning" = "success"
  ): MilestoneRecord | null {
    if (!this.activeSession) return null;

    const record: MilestoneRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "milestone",
      label,
      command,
      explanation: label,
      severity,
    };

    this.emitRecord(record);
    return record;
  }

  /** Record a git action */
  recordGitAction(
    command: string,
    output: string,
    branch: string
  ): GitActionRecord | null {
    if (!this.activeSession) return null;
    if (!this.recordBook.codeforge.recordGit) return null;

    const action = getGitAction(command);
    const explanation = explainCommand(command);

    const record: GitActionRecord = {
      id: generateId(),
      timestamp: nowISO(),
      sessionId: this.activeSession.id,
      type: "git_action",
      action,
      command: command.trim(),
      output,
      branch,
      explanation,
    };

    this.emitRecord(record);
    return record;
  }

  // -----------------------------------------------------------------------
  // Safety checking
  // -----------------------------------------------------------------------

  /** Check if a command is safe to run */
  checkCommandSafety(command: string): {
    level: "safe" | "caution" | "dangerous";
    reason: string;
    explanation: string;
  } {
    const safety = getCommandSafetyLevel(command);
    const explanation = explainCommand(command);
    return { ...safety, explanation };
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /** Search across all recorded history */
  search(query: SearchQuery): SearchResult[] {
    const recordBook = readRecordBook(this.projectRoot);
    if (!recordBook) return [];

    let allRecords: RecordEntry[] = [];
    for (const session of recordBook.sessions) {
      if (query.sessionId && session.id !== query.sessionId) continue;
      allRecords = [...allRecords, ...session.records];
    }

    // Apply filters
    let filtered = allRecords;

    if (query.types && query.types.length > 0) {
      filtered = filtered.filter((r) =>
        (query.types as readonly string[]).includes(r.type)
      );
    }

    if (query.categories && query.categories.length > 0) {
      filtered = filtered.filter((r) => {
        if (r.type === "terminal_command") {
          return (query.categories as readonly string[]).includes(r.category);
        }
        return false;
      });
    }

    if (query.dateRange) {
      const start = new Date(query.dateRange.start).getTime();
      const end = new Date(query.dateRange.end).getTime();
      filtered = filtered.filter((r) => {
        const ts = new Date(r.timestamp).getTime();
        return ts >= start && ts <= end;
      });
    }

    // Text search
    if (query.text) {
      const lowerQuery = query.text.toLowerCase();
      const results: SearchResult[] = [];

      for (const record of filtered) {
        let score = 0;
        const matchedFields: string[] = [];

        if ("command" in record && (record as { command?: string }).command?.toLowerCase().includes(lowerQuery)) {
          score += 10;
          matchedFields.push("command");
        }
        if ("explanation" in record && (record as any).explanation.toLowerCase().includes(lowerQuery)) {
          score += 8;
          matchedFields.push("explanation");
        }
        if ("output" in record && record.output.toLowerCase().includes(lowerQuery)) {
          score += 5;
          matchedFields.push("output");
        }
        if ("error" in record && (record as any).error.toLowerCase().includes(lowerQuery)) {
          score += 7;
          matchedFields.push("error");
        }
        if ("prompt" in record && (record as any).prompt.toLowerCase().includes(lowerQuery)) {
          score += 9;
          matchedFields.push("prompt");
        }
        if ("label" in record && (record as any).label.toLowerCase().includes(lowerQuery)) {
          score += 8;
          matchedFields.push("label");
        }

        if (score > 0) {
          results.push({ record, score, matchedFields });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      return results.slice(offset, offset + limit);
    }

    // No text query — return all filtered results sorted by time
    return filtered
      .slice(0, query.limit || 50)
      .map((record) => ({ record, score: 1, matchedFields: [] }));
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  /** Export the recordbook in the specified format */
  export(options: ExportOptions): string {
    const recordBook = readRecordBook(this.projectRoot);
    if (!recordBook) return "";

    const sessions: Session[] = options.sessionIds
      ? recordBook.sessions.filter((s) =>
          options.sessionIds!.includes(s.id)
        )
      : [...recordBook.sessions];

    switch (options.format) {
      case "markdown":
        return this.exportMarkdown(recordBook, sessions, options);
      case "html":
        return this.exportHTML(recordBook, sessions, options);
      case "json":
        return JSON.stringify({ ...recordBook, sessions }, null, 2);
      default:
        return "";
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /** Flush pending records to disk */
  flush(): void {
    // The storage layer handles persistence on each append
    // This is a no-op placeholder for potential batching optimizations
  }

  /** Destroy the recorder and clean up */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.endSession();
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private emitRecord(record: RecordEntry): void {
    if (!this.activeSession) return;

    appendRecord(this.projectRoot, this.activeSession.id, record);
    this.onRecord?.(record);
  }

  private computeSummary(session: Session): SessionSummary {
    const records = session.records;
    const startedAt = new Date(session.startedAt).getTime();
    const endedAt = session.endedAt
      ? new Date(session.endedAt).getTime()
      : Date.now();
    const durationMs = endedAt - startedAt;

    const commands = records
      .filter((r): r is TerminalCommandRecord => r.type === "terminal_command")
      .map((r) => r.command);

    const categoryCounts = getCategoryCounts(commands);
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category: category as CommandCategory,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      commandsRun: records.filter((r) => r.type === "terminal_command").length,
      errorsHit: records.filter((r) => r.type === "error").length,
      filesModified: records.filter(
        (r) => r.type === "file_save" || r.type === "file_rename"
      ).length,
      aiPromptsUsed: records.filter((r) => r.type === "ai_prompt").length,
      gitActions: records.filter((r) => r.type === "git_action").length,
      milestones: records.filter((r) => r.type === "milestone").length,
      durationMs,
      duration: formatDuration(durationMs),
      topCategories,
    };
  }

  private detectMilestones(
    command: string,
    output: string,
    exitCode: number
  ): void {
    if (exitCode !== 0) return;

    const trimmed = command.trim().toLowerCase();

    // First successful build
    if (
      (trimmed.includes("npm run build") ||
        trimmed.includes("next build") ||
        trimmed.includes("vite build") ||
        trimmed.includes("webpack") ||
        trimmed.includes("make") ||
        trimmed.includes("cargo build") ||
        trimmed.includes("go build")) &&
      output.toLowerCase().includes("success")
    ) {
      this.recordMilestone(
        "Project built successfully!",
        command,
        "success"
      );
    }

    // First test pass
    if (
      (trimmed.includes("npm test") ||
        trimmed.includes("jest") ||
        trimmed.includes("vitest") ||
        trimmed.includes("pytest") ||
        trimmed.includes("cargo test")) &&
      (output.includes("passed") ||
        output.includes("PASS") ||
        output.includes("ok"))
    ) {
      this.recordMilestone("Tests passed!", command, "success");
    }

    // First deploy
    if (
      trimmed.includes("deploy") ||
      trimmed.includes("vercel") ||
      trimmed.includes("netlify") ||
      trimmed.includes("heroku") ||
      trimmed.includes("push") ||
      trimmed.includes("surge")
    ) {
      this.recordMilestone("Deployment detected!", command, "info");
    }

    // First git commit
    if (trimmed.startsWith("git commit") && exitCode === 0) {
      const recordBook = readRecordBook(this.projectRoot);
      const commitCount =
        recordBook?.sessions.reduce(
          (sum, s) =>
            sum +
            s.records.filter(
              (r) =>
                r.type === "git_action" &&
                (r as GitActionRecord).action === "commit"
            ).length,
          0
        ) || 0;

      if (commitCount <= 1) {
        this.recordMilestone("First commit!", command, "success");
      }
    }
  }

  private exportMarkdown(
    recordBook: RecordBook,
    sessions: Session[],
    options: ExportOptions
  ): string {
    const lines: string[] = [];

    lines.push(`# CodeForge Record Book`);
    lines.push(`**Project:** ${recordBook.project.name}`);
    lines.push(`**Type:** ${recordBook.project.detectedType}`);
    lines.push(`**Total Sessions:** ${sessions.length}`);
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const session of sessions) {
      lines.push(`## Session: ${new Date(session.startedAt).toLocaleString()}`);
      lines.push(
        `**Duration:** ${session.summary.duration} | **Commands:** ${session.summary.commandsRun} | **Errors:** ${session.summary.errorsHit}`
      );
      lines.push("");

      for (const record of session.records) {
        if (record.type === "terminal_command") {
          if (options.includeOutputs) {
            lines.push(`### Command`);
            lines.push(`\`\`\`${record.command}\`\`\``);
            if (options.includeExplanations) {
              lines.push(`> ${record.explanation}`);
            }
            if (record.output) {
              lines.push(`**Output:**`);
              lines.push(`\`\`\`\n${record.output}\n\`\`\``);
            }
          } else {
            lines.push(`- **Command:** \`${record.command}\``);
            if (options.includeExplanations) {
              lines.push(`  - ${record.explanation}`);
            }
          }
          lines.push("");
        } else if (record.type === "error" && options.includeErrors) {
          lines.push(`### Error`);
          lines.push(`**Command:** \`${record.command}\``);
          lines.push(`**Error:** ${record.error}`);
          if (options.includeExplanations) {
            lines.push(`> ${record.diagnosis}`);
            lines.push(`> **Fix:** ${record.suggestedFix}`);
          }
          lines.push("");
        } else if (record.type === "milestone") {
          lines.push(`### 🎉 ${record.label}`);
          lines.push("");
        } else if (record.type === "ai_prompt") {
          lines.push(`### AI Prompt`);
          lines.push(`> ${record.prompt}`);
          lines.push(`*Source: ${record.source}*`);
          lines.push("");
        }
      }
    }

    return lines.join("\n");
  }

  private exportHTML(
    recordBook: RecordBook,
    sessions: Session[],
    options: ExportOptions
  ): string {
    const md = this.exportMarkdown(recordBook, sessions, options);
    // Simple markdown-to-HTML conversion for export
    let html = md
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "<br><br>");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeForge Record Book - ${recordBook.project.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #1a1a2e; color: #e0e0e0; }
    h1 { color: #f77f00; border-bottom: 2px solid #f77f00; padding-bottom: 0.5rem; }
    h2 { color: #4cc9f0; }
    h3 { color: #7209b7; }
    code { background: #16213e; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #16213e; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #f77f00; margin: 0; padding: 0.5rem 1rem; color: #adb5bd; }
    strong { color: #f8f9fa; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }
}
