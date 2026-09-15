// =============================================================================
// @codeforge/core — Type Definitions
// The complete type system for CodeForge recording, analysis, and recall
// =============================================================================

// ---------------------------------------------------------------------------
// 1. PLATFORM & ENVIRONMENT
// ---------------------------------------------------------------------------

/** IDE platform where CodeForge is running */
export type Platform = "vscode" | "jetbrains" | "unknown";

/** Operating system */
export type OS = "windows" | "macos" | "linux" | "unknown";

/** Detected project type based on config files */
export type ProjectType =
  | "node"
  | "react"
  | "nextjs"
  | "vue"
  | "svelte"
  | "angular"
  | "python"
  | "django"
  | "flask"
  | "rust"
  | "go"
  | "java"
  | "ruby"
  | "php"
  | "dotnet"
  | "flutter"
  | "swift"
  | "unknown";

/** Detected package manager */
export type PackageManager =
  | "npm"
  | "yarn"
  | "pnpm"
  | "bun"
  | "pip"
  | "poetry"
  | "cargo"
  | "go"
  | "maven"
  | "gradle"
  | "composer"
  | "mix"
  | "unknown";

/** User skill level for progressive difficulty */
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "power";

/** Environment for AI explanation provider */
export type AIProvider = "local" | "openai" | "anthropic" | "none";

// ---------------------------------------------------------------------------
// 2. RECORD TYPES — What gets captured
// ---------------------------------------------------------------------------

/** Base fields shared by all record types */
export interface BaseRecord {
  readonly id: string;
  readonly timestamp: string; // ISO 8601
  readonly sessionId: string;
}

/** A terminal command that was executed */
export interface TerminalCommandRecord extends BaseRecord {
  readonly type: "terminal_command";
  readonly command: string;
  readonly output: string;
  readonly exitCode: number;
  readonly duration: number; // milliseconds
  readonly cwd: string; // working directory when command ran
  readonly shell: string; // e.g. "bash", "powershell", "zsh"
  readonly category: CommandCategory;
  readonly explanation: string;
  readonly isDestructive: boolean;
}

/** An error that occurred during command execution */
export interface ErrorRecord extends BaseRecord {
  readonly type: "error";
  readonly command: string;
  readonly error: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly category: ErrorCategory;
  readonly diagnosis: string;
  readonly suggestedFix: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
}

/** A file that was saved or modified */
export interface FileSaveRecord extends BaseRecord {
  readonly type: "file_save";
  readonly path: string;
  readonly fileName: string;
  readonly language: string;
  readonly sizeBytes: number;
}

/** A file that was renamed or moved */
export interface FileRenameRecord extends BaseRecord {
  readonly type: "file_rename";
  readonly oldPath: string;
  readonly newPath: string;
  readonly oldName: string;
  readonly newName: string;
}

/** An AI prompt that was sent to Copilot, ChatGPT, etc. */
export interface AIPromptRecord extends BaseRecord {
  readonly type: "ai_prompt";
  readonly prompt: string;
  readonly source: string; // "copilot", "chatgpt", "cursor", etc.
  readonly filesContext: readonly string[];
}

/** A milestone event (first build, first deploy, etc.) */
export interface MilestoneRecord extends BaseRecord {
  readonly type: "milestone";
  readonly label: string;
  readonly command?: string;
  readonly explanation: string;
  readonly severity: "info" | "success" | "warning";
}

/** A git action that was performed */
export interface GitActionRecord extends BaseRecord {
  readonly type: "git_action";
  readonly action: string; // "commit", "push", "pull", "branch", etc.
  readonly command: string;
  readonly output: string;
  readonly branch: string;
  readonly explanation: string;
}

/** Union of all record types */
export type RecordEntry =
  | TerminalCommandRecord
  | ErrorRecord
  | FileSaveRecord
  | FileRenameRecord
  | AIPromptRecord
  | MilestoneRecord
  | GitActionRecord;

// ---------------------------------------------------------------------------
// 3. COMMAND ANALYSIS
// ---------------------------------------------------------------------------

/** Categories for command classification */
export type CommandCategory =
  | "navigation"       // cd, pwd, ls, dir, tree
  | "git"              // git commit, git push, git pull, etc.
  | "package_manager"  // npm install, yarn add, pip install, etc.
  | "build"            // make, cmake, tsc, webpack, vite build
  | "test"             // npm test, pytest, cargo test, jest, etc.
  | "deploy"           // vercel deploy, heroku push, docker deploy
  | "file_ops"         // mkdir, rm, cp, mv, touch, cat
  | "text_processing"  // grep, sed, awk, find, sort
  | "network"          // curl, wget, ping, ssh, scp
  | "docker"           // docker build, docker run, docker-compose
  | "database"         // psql, mysql, mongosh, redis-cli
  | "process"          // ps, top, kill, bg, fg, jobs
  | "system"           // sudo, chmod, chown, env, export
  | "editor"           // code, vim, nano, subl
  | "debug"            // console.log, debugger, breakpoints
  | "ai_tool"          // claude, copilot, chatgpt CLI
  | "unknown";         // uncategorized

/** Categories for error classification */
export type ErrorCategory =
  | "port_conflict"       // EADDRINUSE
  | "module_not_found"   // MODULE_NOT_FOUND, cannot find module
  | "permission_denied"  // EACCES, permission denied
  | "file_not_found"     // ENOENT, no such file or directory
  | "syntax_error"       // SyntaxError, parse error
  | "type_error"         // TypeError, cannot read property
  | "network_error"      // ECONNREFUSED, timeout
  | "memory_error"       // heap out of memory
  | "dependency_missing" // missing peer dependency
  | "git_conflict"       // merge conflict
  | "build_error"        // compilation failed
  | "runtime_error"      // uncaught exception
  | "unknown";           // uncategorized error

// ---------------------------------------------------------------------------
// 4. PROJECT STRUCTURE
// ---------------------------------------------------------------------------

/** A node in the project file tree */
export interface FileTreeNode {
  readonly name: string;
  readonly path: string;
  readonly type: "file" | "directory";
  readonly children?: readonly FileTreeNode[];
  readonly sizeBytes?: number;
  readonly extension?: string;
  /** Whether this entry is likely generated (node_modules, dist, etc.) */
  readonly isGenerated: boolean;
}

/** Environment information detected at project open */
export interface EnvironmentInfo {
  readonly nodeVersion?: string;
  readonly npmVersion?: string;
  readonly pythonVersion?: string;
  readonly javaVersion?: string;
  readonly rustVersion?: string;
  readonly goVersion?: string;
  readonly gitVersion?: string;
  readonly detectedPackageManagers: readonly PackageManager[];
  readonly detectedIssues: readonly string[];
}

// ---------------------------------------------------------------------------
// 5. SESSION
// ---------------------------------------------------------------------------

/** Aggregated summary of a recording session */
export interface SessionSummary {
  readonly commandsRun: number;
  readonly errorsHit: number;
  readonly filesModified: number;
  readonly aiPromptsUsed: number;
  readonly gitActions: number;
  readonly milestones: number;
  readonly duration: string; // human-readable e.g. "2h 30m"
  readonly durationMs: number;
  readonly topCategories: readonly { category: CommandCategory; count: number }[];
}

/** A single recording session (from project open to close) */
export interface Session {
  readonly id: string;
  readonly startedAt: string; // ISO 8601
  readonly endedAt?: string;
  readonly platform: Platform;
  readonly os: OS;
  readonly summary: SessionSummary;
  readonly structureSnapshot?: FileTreeNode;
  readonly records: readonly RecordEntry[];
}

// ---------------------------------------------------------------------------
// 6. RECIPE
// ---------------------------------------------------------------------------

/** A single step in a recipe */
export interface RecipeStep {
  readonly command: string;
  readonly explanation: string;
  readonly category: CommandCategory;
  readonly cwd?: string;
  readonly isOptional: boolean;
}

/** An auto-generated or user-saved command sequence */
export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly autoGenerated: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly steps: readonly RecipeStep[];
  readonly timesReplayed: number;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// 7. GLOSSARY
// ---------------------------------------------------------------------------

/** A glossary entry explaining a technical term */
export interface GlossaryEntry {
  readonly term: string;
  readonly explanation: string;
  readonly relatedCommands: readonly string[];
  readonly category: string;
}

// ---------------------------------------------------------------------------
// 8. RECORD BOOK — The root document
// ---------------------------------------------------------------------------

/** CodeForge user preferences */
export interface CodeForgeSettings {
  readonly skillLevel: SkillLevel;
  readonly language: string; // ISO 639-1 code
  readonly aiProvider: AIProvider;
  readonly recordTerminal: boolean;
  readonly recordEditor: boolean;
  readonly recordAI: boolean;
  readonly recordGit: boolean;
  readonly excludePatterns: readonly string[];
  readonly maxStorageMB: number;
}

/** Project-level metadata */
export interface ProjectMeta {
  readonly name: string;
  readonly rootPath: string;
  readonly detectedType: ProjectType;
  readonly detectedToolchain: readonly string[];
  readonly firstOpened: string;
  readonly lastOpened: string;
  readonly totalSessions: number;
  readonly totalCommandsRecorded: number;
}

/** The root record book document stored in .codeforge/recordbook.json */
export interface RecordBook {
  readonly version: string;
  readonly codeforge: CodeForgeSettings;
  readonly project: ProjectMeta;
  readonly environment: EnvironmentInfo;
  readonly recipes: readonly Recipe[];
  readonly glossary: readonly GlossaryEntry[];
  readonly sessions: readonly Session[];
}

// ---------------------------------------------------------------------------
// 9. RECORDER CONFIG
// ---------------------------------------------------------------------------

/** Configuration passed to the recorder when it starts */
export interface RecorderConfig {
  readonly projectRoot: string;
  readonly platform: Platform;
  readonly os: OS;
  readonly settings: Partial<CodeForgeSettings>;
  /** Called when a new record is captured */
  readonly onRecord?: (record: RecordEntry) => void;
  /** Called when a session starts */
  readonly onSessionStart?: (session: Session) => void;
  /** Called when a session ends */
  readonly onSessionEnd?: (session: Session) => void;
}

// ---------------------------------------------------------------------------
// 10. SEARCH
// ---------------------------------------------------------------------------

/** Search query for filtering records */
export interface SearchQuery {
  readonly text?: string;
  readonly types?: readonly RecordEntry["type"][];
  readonly categories?: readonly CommandCategory[];
  readonly errorCategories?: readonly ErrorCategory[];
  readonly dateRange?: {
    readonly start: string;
    readonly end: string;
  };
  readonly sessionId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** Search result with relevance scoring */
export interface SearchResult {
  readonly record: RecordEntry;
  readonly score: number;
  readonly matchedFields: readonly string[];
  readonly context?: string;
}

// ---------------------------------------------------------------------------
// 11. EXPORT
// ---------------------------------------------------------------------------

/** Export format options */
export type ExportFormat = "markdown" | "html" | "json";

/** Options for exporting the record book */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly sessionIds?: readonly string[];
  readonly includeExplanations: boolean;
  readonly includeOutputs: boolean;
  readonly includeErrors: boolean;
  readonly dateRange?: {
    readonly start: string;
    readonly end: string;
  };
}

// ---------------------------------------------------------------------------
// 12. UTILITY TYPES
// ---------------------------------------------------------------------------

/** Generate a unique ID */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/** Get current ISO timestamp */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Format milliseconds to human-readable duration */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/** Sanitize a file path for display (remove user home prefix) */
export function displayPath(fullPath: string, homeDir: string): string {
  if (fullPath.startsWith(homeDir)) {
    return "~" + fullPath.substring(homeDir.length);
  }
  return fullPath;
}
