# Architecture

This document describes the internal architecture of CodeForge.

## Monorepo Structure

CodeForge uses a pnpm workspace monorepo. All packages share a common TypeScript base configuration and build tooling.

```
codeforge/
  packages/
    core/                # @codeforge/core
      src/
        index.ts         # Public API exports
        types.ts         # Type definitions
        recorder.ts      # CodeForgeRecorder class
        storage.ts       # RecordBook persistence
        analyzer.ts      # Command/error classification
        explainer.ts     # Plain-English explanations
    vscode/              # @codeforge/vscode
      src/
        extension.ts         # Activation entry point
        commands.ts          # Command palette commands
        terminal-listener.ts # Terminal monitoring
        editor-listener.ts   # File save/rename monitoring
        ai-listener.ts       # AI prompt capture
        project-lifecycle.ts # Session management
        safety-interceptor.ts# Destructive command warnings
        environment-status.ts# Status bar + health check
        webview/
          dashboard.ts       # Recall Dashboard webview
    jetbrains/            # IntelliJ Platform plugin (Kotlin)
    dashboard/            # Web dashboard components
  tsconfig.base.json      # Shared TypeScript config
  pnpm-workspace.yaml     # Workspace definition
  package.json            # Root scripts and devDependencies
```

## Core Engine

The core engine (`@codeforge/core`) is the heart of CodeForge. It is platform-agnostic and consumed by both the VS Code extension and JetBrains plugin.

### Recorder (`recorder.ts`)

The `CodeForgeRecorder` class manages the recording lifecycle:

```
  CodeForgeRecorder
  =================

  constructor(config)
      |
      +--> loadOrCreateRecordBook(projectRoot, platform, settings)
      +--> setInterval(flush, 5000)

  .startSession() --> Session
      |
      +--> addSession(projectRoot, session)
      +--> onSessionStart callback

  .recordCommand(command, output, exitCode, duration, cwd, shell)
      |
      +--> categorizeCommand(command) -> { category, destructive }
      +--> explainCommand(command) -> string
      +--> emitRecord(record)
      +--> detectMilestones(command, output, exitCode)

  .recordError(command, error, stderr, exitCode)
      |
      +--> classifyError(error) -> ErrorCategory
      +--> explainError(error) -> string
      +--> suggestFix(error) -> string
      +--> emitRecord(record)

  .recordFileSave(filePath, language, sizeBytes)
  .recordFileRename(oldPath, newPath)
  .recordAIPrompt(prompt, source, filesContext)
  .recordMilestone(label, command, severity)
  .recordGitAction(command, output, branch)

  .search(query) -> SearchResult[]
  .export(options) -> string
  .checkCommandSafety(command) -> { level, reason, explanation }

  .endSession() -> Session | null
  .destroy()
```

### Storage (`storage.ts`)

All data is persisted to `.codeforge/recordbook.json` in the project root.

```
  .codeforge/
    recordbook.json       # The complete record book
```

Storage functions:

| Function | Description |
|----------|-------------|
| `createRecordBook(projectRoot, platform, settings)` | Initialize a new recordbook |
| `readRecordBook(projectRoot)` | Read from disk |
| `writeRecordBook(projectRoot, recordBook)` | Write to disk |
| `loadOrCreateRecordBook(projectRoot, platform, settings)` | Load existing or create new |
| `addSession(projectRoot, session)` | Add a session to the recordbook |
| `updateSession(projectRoot, sessionId, updates)` | Update session (e.g. on end) |
| `appendRecord(projectRoot, sessionId, record)` | Append a record to a session |
| `upsertRecipe(projectRoot, recipe)` | Add or update a recipe |
| `addGlossaryEntry(projectRoot, entry)` | Add a glossary term |
| `pruneOldSessions(projectRoot, maxSessions)` | Remove old sessions |
| `deleteRecordBook(projectRoot)` | Remove all data |
| `detectEnvironment(projectRoot)` | Detect tool versions |
| `detectProjectType(projectRoot)` | Detect project framework |

### Analyzer (`analyzer.ts`)

Classifies commands and errors using pattern matching:

```
  categorizeCommand(command) -> { category: CommandCategory, destructive: boolean }
  classifyError(errorMessage) -> ErrorCategory
  isGitCommand(command) -> boolean
  getGitAction(command) -> string
  getCommandName(command) -> string
  getCategoryCounts(commands) -> Record<CommandCategory, number>
  getCategoryLabel(category) -> string
  getErrorCategoryLabel(category) -> string
```

**Command Categories** (16):
`navigation`, `git`, `package_manager`, `build`, `test`, `deploy`, `file_ops`, `text_processing`, `network`, `docker`, `database`, `process`, `system`, `editor`, `debug`, `ai_tool`, `unknown`

**Error Categories** (13):
`port_conflict`, `module_not_found`, `permission_denied`, `file_not_found`, `syntax_error`, `type_error`, `network_error`, `memory_error`, `dependency_missing`, `git_conflict`, `build_error`, `runtime_error`, `unknown`

### Explainer (`explainer.ts`)

Translates technical commands and errors into plain English:

```
  explainCommand(command) -> string
  explainError(error, command?) -> string
  suggestFix(error, command?) -> string
  getCommandSafetyLevel(command) -> { level, reason }
  getGlossaryDefinition(term) -> string | null
```

## VS Code Extension

### Activation

The extension activates on `onStartupFinished` and sets up:

1. Creates a `CodeForgeRecorder` instance
2. Registers the Dashboard webview provider
3. Sets up all event listeners
4. Registers commands
5. Creates the status bar item

### Listeners

Each listener captures a specific type of event and feeds it to the recorder:

```
  terminal-listener.ts
  ====================
  Hooks: onDidStartTerminalShellExecution, onDidEndTerminalShellExecution,
         onDidOpenTerminal, onDidCloseTerminal, onDidWriteData
  Captures: command text, output, exit code, duration, shell, cwd

  editor-listener.ts
  ==================
  Hooks: onDidSaveTextDocument, onDidRenameFiles
  Captures: file path, language, size, renames

  ai-listener.ts
  ==============
  Hooks: onDidChangeTextDocument, onDidSaveTextDocument
  Captures: prompt text, AI source, files context

  project-lifecycle.ts
  ====================
  Hooks: onDidChangeWorkspaceFolders
  Captures: session start/end, project type, environment

  safety-interceptor.ts
  =====================
  Hooks: onDidStartTerminalShellExecution
  Captures: destructive command warnings (rm -rf, git reset --hard, etc.)

  environment-status.ts
  =====================
  Creates: status bar item
  Captures: environment health, recording state
```

### Dashboard Webview

The Recall Dashboard renders as both a sidebar view and a panel:

```
  DashboardProvider
  =================
  viewType: "codeforge.dashboard"

  resolveWebviewView()      -> Sets up sidebar webview
  show()                    -> Opens as panel
  refreshData()             -> Sends recordbook to webview
  handleMessage(message)    -> Handles webview -> extension messages
    - search                 -> recorder.search()
    - loadRecordBook        -> readRecordBook()
    - export                 -> recorder.export()
    - explainCommand         -> explainCommand()
```

### Commands

| Command ID | Action |
|-----------|--------|
| `codeforge.openDashboard` | Open the dashboard panel |
| `codeforge.startSession` | Start a new recording session |
| `codeforge.stopSession` | End the current session |
| `codeforge.searchHistory` | Search command history with quick pick |
| `codeforge.exportMarkdown` | Export session as .md file |
| `codeforge.exportHTML` | Export session as .html file |
| `codeforge.showGlossary` | Browse glossary terms |
| `codeforge.checkEnvironment` | Show project health panel |

## Data Flow

```
  User Action
      |
      v
  VS Code API Event
      |
      v
  Listener (terminal/editor/ai/git)
      |
      v
  CodeForgeRecorder.record*()
      |
      +--> categorizeCommand() / classifyError()
      +--> explainCommand() / explainError()
      +--> appendRecord() -> writeRecordBook()
      +--> detectMilestones()
      +--> onRecord callback
      |
      v
  .codeforge/recordbook.json (persisted)
      |
      v
  Dashboard Webview (renders timeline)
  Search Results (returned to UI)
  Export (Markdown/HTML/JSON)
```

## RecordBook Schema

The root document stored in `.codeforge/recordbook.json`:

```json
{
  "version": "2.0.0",
  "codeforge": {
    "skillLevel": "beginner",
    "language": "en",
    "aiProvider": "none",
    "recordTerminal": true,
    "recordEditor": true,
    "recordAI": true,
    "recordGit": true,
    "excludePatterns": ["node_modules", ".git", "dist", "build"],
    "maxStorageMB": 50
  },
  "project": {
    "name": "my-project",
    "rootPath": "/path/to/project",
    "detectedType": "react",
    "detectedToolchain": ["node", "npm", "react"],
    "firstOpened": "2026-01-01T00:00:00.000Z",
    "lastOpened": "2026-09-15T12:00:00.000Z",
    "totalSessions": 42,
    "totalCommandsRecorded": 1234
  },
  "environment": {
    "nodeVersion": "20.11.0",
    "npmVersion": "10.2.0",
    "gitVersion": "2.43.0",
    "detectedPackageManagers": ["npm", "pnpm"],
    "detectedIssues": []
  },
  "recipes": [
    {
      "id": "abc-123",
      "name": "Setup Dev Environment",
      "description": "Common setup commands",
      "autoGenerated": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "steps": [
        {
          "command": "pnpm install",
          "explanation": "Download and install all libraries",
          "category": "package_manager",
          "cwd": "/path/to/project",
          "isOptional": false
        }
      ],
      "timesReplayed": 5,
      "tags": ["setup"]
    }
  ],
  "glossary": [],
  "sessions": [
    {
      "id": "xyz-789",
      "startedAt": "2026-09-15T10:00:00.000Z",
      "endedAt": "2026-09-15T12:00:00.000Z",
      "platform": "vscode",
      "os": "windows",
      "summary": {
        "commandsRun": 47,
        "errorsHit": 3,
        "filesModified": 12,
        "aiPromptsUsed": 2,
        "gitActions": 5,
        "milestones": 1,
        "duration": "2h 0m",
        "durationMs": 7200000,
        "topCategories": [
          { "category": "package_manager", "count": 15 },
          { "category": "git", "count": 10 },
          { "category": "build", "count": 8 }
        ]
      },
      "records": [
        {
          "id": "rec-001",
          "timestamp": "2026-09-15T10:01:00.000Z",
          "sessionId": "xyz-789",
          "type": "terminal_command",
          "command": "pnpm install",
          "output": "Packages: +456\nDone in 12.3s",
          "exitCode": 0,
          "duration": 12300,
          "cwd": "/path/to/project",
          "shell": "bash",
          "category": "package_manager",
          "explanation": "Download and install all libraries this project needs",
          "isDestructive": false
        }
      ]
    }
  ]
}
```

## Extension Points

### Adding a New Record Type

1. Define the type in `packages/core/src/types.ts` extending `BaseRecord`
2. Add it to the `RecordEntry` union type
3. Add a `record*` method to `CodeForgeRecorder`
4. Add rendering logic to the dashboard webview
5. Update the search scoring in `CodeForgeRecorder.search()`

### Adding a New Command Category

1. Add the category to `CommandCategory` in `types.ts`
2. Add pattern rules to `COMMAND_PATTERNS` in `analyzer.ts`
3. Add a label to `getCategoryLabel()` in `analyzer.ts`

### Adding a New Error Category

1. Add the category to `ErrorCategory` in `types.ts`
2. Add pattern rules to `ERROR_PATTERNS` in `analyzer.ts`
3. Add explanation rules to `ERROR_EXPLANATIONS` in `explainer.ts`
4. Add a label to `getErrorCategoryLabel()` in `analyzer.ts`

### Adding a New Platform

1. Create a new package in `packages/`
2. Import `@codeforge/core`
3. Create platform-specific listeners (terminal, editor, AI)
4. Initialize `CodeForgeRecorder` with the platform identifier
5. Render the dashboard using the platform's webview/panel system
