# API Reference

## @codeforge/core

The core package provides the recording engine, storage, command analysis, and explanation system.

---

## Types

### Platform

```typescript
type Platform = "vscode" | "jetbrains" | "unknown";
```

IDE platform where CodeForge is running.

### OS

```typescript
type OS = "windows" | "macos" | "linux" | "unknown";
```

Operating system.

### ProjectType

```typescript
type ProjectType =
  | "node" | "react" | "nextjs" | "vue" | "svelte" | "angular"
  | "python" | "django" | "flask"
  | "rust" | "go" | "java" | "ruby" | "php" | "dotnet"
  | "flutter" | "swift" | "unknown";
```

Detected project type based on configuration files.

### SkillLevel

```typescript
type SkillLevel = "beginner" | "intermediate" | "advanced" | "power";
```

User skill level for progressive explanation difficulty.

### CommandCategory

```typescript
type CommandCategory =
  | "navigation" | "git" | "package_manager" | "build" | "test"
  | "deploy" | "file_ops" | "text_processing" | "network" | "docker"
  | "database" | "process" | "system" | "editor" | "debug"
  | "ai_tool" | "unknown";
```

### ErrorCategory

```typescript
type ErrorCategory =
  | "port_conflict" | "module_not_found" | "permission_denied"
  | "file_not_found" | "syntax_error" | "type_error"
  | "network_error" | "memory_error" | "dependency_missing"
  | "git_conflict" | "build_error" | "runtime_error" | "unknown";
```

### RecordEntry

```typescript
type RecordEntry =
  | TerminalCommandRecord
  | ErrorRecord
  | FileSaveRecord
  | FileRenameRecord
  | AIPromptRecord
  | MilestoneRecord
  | GitActionRecord;
```

Union of all record types.

### TerminalCommandRecord

```typescript
interface TerminalCommandRecord extends BaseRecord {
  type: "terminal_command";
  command: string;
  output: string;
  exitCode: number;
  duration: number;        // milliseconds
  cwd: string;             // working directory
  shell: string;           // e.g. "bash", "powershell"
  category: CommandCategory;
  explanation: string;
  isDestructive: boolean;
}
```

### ErrorRecord

```typescript
interface ErrorRecord extends BaseRecord {
  type: "error";
  command: string;
  error: string;
  stderr: string;
  exitCode: number;
  category: ErrorCategory;
  diagnosis: string;
  suggestedFix: string;
  resolved: boolean;
  resolvedBy?: string;
}
```

### FileSaveRecord

```typescript
interface FileSaveRecord extends BaseRecord {
  type: "file_save";
  path: string;
  fileName: string;
  language: string;
  sizeBytes: number;
}
```

### FileRenameRecord

```typescript
interface FileRenameRecord extends BaseRecord {
  type: "file_rename";
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}
```

### AIPromptRecord

```typescript
interface AIPromptRecord extends BaseRecord {
  type: "ai_prompt";
  prompt: string;
  source: string;                // "copilot", "chatgpt", "cursor", etc.
  filesContext: readonly string[];
}
```

### MilestoneRecord

```typescript
interface MilestoneRecord extends BaseRecord {
  type: "milestone";
  label: string;
  command?: string;
  explanation: string;
  severity: "info" | "success" | "warning";
}
```

### GitActionRecord

```typescript
interface GitActionRecord extends BaseRecord {
  type: "git_action";
  action: string;        // "commit", "push", "pull", etc.
  command: string;
  output: string;
  branch: string;
  explanation: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  startedAt: string;           // ISO 8601
  endedAt?: string;
  platform: Platform;
  os: OS;
  summary: SessionSummary;
  structureSnapshot?: FileTreeNode;
  records: readonly RecordEntry[];
}
```

### SessionSummary

```typescript
interface SessionSummary {
  commandsRun: number;
  errorsHit: number;
  filesModified: number;
  aiPromptsUsed: number;
  gitActions: number;
  milestones: number;
  duration: string;           // human-readable, e.g. "2h 30m"
  durationMs: number;
  topCategories: readonly { category: CommandCategory; count: number }[];
}
```

### RecordBook

```typescript
interface RecordBook {
  version: string;
  codeforge: CodeForgeSettings;
  project: ProjectMeta;
  environment: EnvironmentInfo;
  recipes: readonly Recipe[];
  glossary: readonly GlossaryEntry[];
  sessions: readonly Session[];
}
```

### SearchQuery

```typescript
interface SearchQuery {
  text?: string;
  types?: readonly RecordEntry["type"][];
  categories?: readonly CommandCategory[];
  errorCategories?: readonly ErrorCategory[];
  dateRange?: { start: string; end: string };
  sessionId?: string;
  limit?: number;
  offset?: number;
}
```

### SearchResult

```typescript
interface SearchResult {
  record: RecordEntry;
  score: number;
  matchedFields: readonly string[];
  context?: string;
}
```

### ExportOptions

```typescript
type ExportFormat = "markdown" | "html" | "json";

interface ExportOptions {
  format: ExportFormat;
  sessionIds?: readonly string[];
  includeExplanations: boolean;
  includeOutputs: boolean;
  includeErrors: boolean;
  dateRange?: { start: string; end: string };
}
```

### RecorderConfig

```typescript
interface RecorderConfig {
  projectRoot: string;
  platform: Platform;
  os: OS;
  settings: Partial<CodeForgeSettings>;
  onRecord?: (record: RecordEntry) => void;
  onSessionStart?: (session: Session) => void;
  onSessionEnd?: (session: Session) => void;
}
```

---

## Classes

### CodeForgeRecorder

The central recording engine that captures, processes, and stores all events.

```typescript
class CodeForgeRecorder {
  constructor(config: RecorderConfig);

  // Session lifecycle
  startSession(): Session;
  endSession(): Session | null;
  getActiveSession(): Session | null;

  // Recording methods
  recordCommand(
    command: string,
    output: string,
    exitCode: number,
    duration: number,
    cwd: string,
    shell: string
  ): TerminalCommandRecord | null;

  recordError(
    command: string,
    error: string,
    stderr: string,
    exitCode: number
  ): ErrorRecord | null;

  recordFileSave(
    filePath: string,
    language: string,
    sizeBytes: number
  ): FileSaveRecord | null;

  recordFileRename(
    oldPath: string,
    newPath: string
  ): FileRenameRecord | null;

  recordAIPrompt(
    prompt: string,
    source: string,
    filesContext: string[]
  ): AIPromptRecord | null;

  recordMilestone(
    label: string,
    command?: string,
    severity?: "info" | "success" | "warning"
  ): MilestoneRecord | null;

  recordGitAction(
    command: string,
    output: string,
    branch: string
  ): GitActionRecord | null;

  // Safety checking
  checkCommandSafety(command: string): {
    level: "safe" | "caution" | "dangerous";
    reason: string;
    explanation: string;
  };

  // Search
  search(query: SearchQuery): SearchResult[];

  // Export
  export(options: ExportOptions): string;

  // Lifecycle
  flush(): void;
  destroy(): void;
}
```

#### Constructor

```typescript
new CodeForgeRecorder({
  projectRoot: "/path/to/project",
  platform: "vscode",
  os: "windows",
  settings: {
    skillLevel: "beginner",
    language: "en",
    recordTerminal: true,
    recordEditor: true,
    recordAI: true,
    recordGit: true,
    maxStorageMB: 50,
  },
  onRecord: (record) => console.log("New record:", record.type),
  onSessionStart: (session) => console.log("Session started:", session.id),
  onSessionEnd: (session) => console.log("Session ended:", session.summary),
});
```

#### startSession()

Begins a new recording session. Returns the session object. Subsequent `record*` calls will append records to this session.

```typescript
const session = recorder.startSession();
// session.id, session.startedAt, session.platform, session.os
```

#### endSession()

Ends the current recording session. Computes the session summary and persists it. Returns the ended session or `null` if no active session.

```typescript
const ended = recorder.endSession();
if (ended) {
  console.log(ended.summary.commandsRun);  // e.g. 47
  console.log(ended.summary.duration);     // e.g. "2h 30m"
}
```

#### recordCommand()

Records a terminal command with its output and metadata. Returns `null` if recording is disabled for terminal or no active session.

```typescript
const record = recorder.recordCommand(
  "pnpm install",
  "Packages: +456\nDone in 12.3s",
  0,       // exit code
  12300,   // duration in ms
  "/path/to/project",
  "bash"
);
// record.category === "package_manager"
// record.explanation === "Download and install all libraries this project needs"
// record.isDestructive === false
```

#### recordError()

Records a failed command with diagnosis and fix suggestion.

```typescript
const record = recorder.recordError(
  "npm start",
  "Error: listen EADDRINUSE: address already in use :::3000",
  "Error: listen EADDRINUSE: address already in use :::3000",
  1
);
// record.category === "port_conflict"
// record.diagnosis === "Another program is already using this port number..."
// record.suggestedFix === "Find the process using port 3000 with: lsof -i :3000\n..."
```

#### search()

Search across all recorded history with relevance scoring.

```typescript
const results = recorder.search({
  text: "npm install",
  limit: 20,
});

// results[0].record.command === "npm install express"
// results[0].score === 10
// results[0].matchedFields === ["command"]
```

#### export()

Export the recordbook in the specified format.

```typescript
const markdown = recorder.export({
  format: "markdown",
  includeExplanations: true,
  includeOutputs: true,
  includeErrors: true,
});

const html = recorder.export({
  format: "html",
  includeExplanations: true,
  includeOutputs: false,
  includeErrors: true,
});

const json = recorder.export({
  format: "json",
  includeExplanations: true,
  includeOutputs: true,
  includeErrors: true,
});
```

---

## Storage Functions

### Constants

```typescript
const CODEFORGE_DIR = ".codeforge";
const RECORDBOOK_FILE = "recordbook.json";
const MAX_STORAGE_MB = 50;
```

### Path Helpers

```typescript
function getCodeforgeDir(projectRoot: string): string;
// Returns: /path/to/project/.codeforge

function getRecordbookPath(projectRoot: string): string;
// Returns: /path/to/project/.codeforge/recordbook.json

function hasRecordbook(projectRoot: string): boolean;
// Returns: true if recordbook.json exists
```

### Environment Detection

```typescript
function detectEnvironment(projectRoot: string): EnvironmentInfo;
// Returns: { nodeVersion, npmVersion, gitVersion, detectedPackageManagers, detectedIssues, ... }

function detectProjectType(projectRoot: string): { type: string; toolchain: string[] };
// Returns: { type: "react", toolchain: ["node", "npm", "react"] }
```

### RecordBook CRUD

```typescript
function createRecordBook(
  projectRoot: string,
  platform: string,
  settings?: Partial<CodeForgeSettings>
): RecordBook;

function readRecordBook(projectRoot: string): RecordBook | null;

function writeRecordBook(projectRoot: string, recordBook: RecordBook): void;

function loadOrCreateRecordBook(
  projectRoot: string,
  platform: string,
  settings?: Partial<CodeForgeSettings>
): RecordBook;
// Loads existing recordbook or creates a new one. Updates lastOpened.
```

### Session Management

```typescript
function addSession(projectRoot: string, session: Session): void;

function updateSession(
  projectRoot: string,
  sessionId: string,
  updates: Partial<Session>
): void;

function appendRecord(
  projectRoot: string,
  sessionId: string,
  record: RecordEntry
): void;
```

### Recipe & Glossary

```typescript
function upsertRecipe(projectRoot: string, recipe: Recipe): void;

function addGlossaryEntry(projectRoot: string, entry: GlossaryEntry): void;
```

### Cleanup

```typescript
function pruneOldSessions(projectRoot: string, maxSessions?: number): void;
// Default maxSessions: 100

function deleteRecordBook(projectRoot: string): void;
// Removes .codeforge/ directory entirely
```

---

## Analyzer Functions

```typescript
function categorizeCommand(command: string): {
  category: CommandCategory;
  destructive: boolean;
};
// Categorizes a command string into a CommandCategory

function classifyError(errorMessage: string): ErrorCategory;
// Classifies an error message into an ErrorCategory

function isGitCommand(command: string): boolean;
// Returns true if the command starts with "git"

function getGitAction(command: string): string;
// Extracts the git subcommand (e.g. "commit", "push")

function getCommandName(command: string): string;
// Extracts the primary command name (first word, handles pipes and sudo)

function getCategoryCounts(commands: string[]): Record<CommandCategory, number>;
// Counts occurrences of each category in a list of commands

function getCategoryLabel(category: CommandCategory): string;
// Human-readable label for a command category

function getErrorCategoryLabel(category: ErrorCategory): string;
// Human-readable label for an error category
```

---

## Explainer Functions

```typescript
function explainCommand(command: string): string;
// Returns a plain-English explanation for a command

function explainError(error: string, command?: string): string;
// Returns a plain-English explanation for an error

function suggestFix(error: string, command?: string): string;
// Returns a suggested fix for an error

function getCommandSafetyLevel(command: string): {
  level: "safe" | "caution" | "dangerous";
  reason: string;
};
// Returns the safety classification of a command

function getGlossaryDefinition(term: string): string | null;
// Returns a definition for a technical term, or null if not found
```

---

## Utility Functions

```typescript
function generateId(): string;
// Generates a unique ID (timestamp + random)

function nowISO(): string;
// Returns the current ISO 8601 timestamp

function formatDuration(ms: number): string;
// Converts milliseconds to human-readable duration
// e.g. 1500 -> "1s", 7200000 -> "2h"

function displayPath(fullPath: string, homeDir: string): string;
// Replaces home directory prefix with "~"
// e.g. "/home/user/project" -> "~/project"
```
