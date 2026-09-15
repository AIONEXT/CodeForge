<div align="center">

# CodeForge

### Universal Command Recorder & Recall System for Every Coder

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.95-007ACC)
![JetBrains](https://img.shields.io/badge/JetBrains-2024+-FF3100)

<br />

*Silently records your terminal commands, file changes, and AI prompts.
Recalls everything when you return to a project.*

[Installation](#installation) | [Quick Start](#quick-start) | [Features](#features) | [Configuration](#configuration) | [Contributing](#contributing)

</div>

---

## What is CodeForge?

CodeForge is a developer productivity tool that sits quietly in your IDE, recording every terminal command, file save, git action, and AI prompt you use. When you return to a project days, weeks, or months later, CodeForge instantly recalls what you did and explains it in plain English.

No more re-learning project setup. No more digging through shell history. No more wondering what that command did.

## Architecture

```
                              CodeForge Architecture
                              ======================

    +------------------------------------------------------------------+
    |                        IDE Layer                                  |
    |                                                                  |
    |   +-------------------+           +------------------------+     |
    |   |   VS Code         |           |   JetBrains            |     |
    |   |   Extension       |           |   Plugin               |     |
    |   |                   |           |                        |     |
    |   | - Terminal Listener|          | - Terminal Listener    |     |
    |   | - Editor Listener |           | - Editor Listener      |     |
    |   | - AI Listener     |           | - AI Listener          |     |
    |   | - Safety Check    |           | - Safety Check         |     |
    |   | - Status Bar      |           | - Status Widget        |     |
    |   | - Dashboard       |           | - Dashboard Panel      |     |
    |   +--------+----------+           +------------+-----------+     |
    |            |                                 |                   |
    +------------|---------------------------------|-------------------+
                 |                                 |
                 v                                 v
    +------------------------------------------------------------------+
    |                      Core Engine (@codeforge/core)                |
    |                                                                  |
    |   +------------------+  +------------------+  +----------------+  |
    |   | Recorder         |  | Analyzer          |  | Explainer      |  |
    |   |                  |  |                    |  |                |  |
    |   | - recordCommand  |  | - categorizeCommand| | - explainCmd   |  |
    |   | - recordError    |  | - classifyError   |  | - explainError |  |
    |   | - recordFileSave |  | - getGitAction    |  | - suggestFix   |  |
    |   | - recordAI       |  | - getCategoryCount|  | - safetyCheck  |  |
    |   | - recordMilestone|  |                    |  | - glossary     |  |
    |   +--------+---------+  +---------+----------+  +-------+--------+  |
    |            |                      |                     |          |
    |            v                      v                     v          |
    |   +-----------------------------------------------------------+   |
    |   |                   Storage Engine                          |   |
    |   |                                                           |   |
    |   |  .codeforge/recordbook.json                               |   |
    |   |  +-----------------------------------------------------+  |   |
    |   |  | {                                                    |  |   |
    |   |  |   "version": "2.0.0",                                |  |   |
    |   |  |   "project": { "name": "...", "type": "react" },     |  |   |
    |   |  |   "sessions": [ ... ],                                |  |   |
    |   |  |   "recipes": [ ... ],                                 |  |   |
    |   |  |   "glossary": [ ... ]                                 |  |   |
    |   |  | }                                                    |  |   |
    |   |  +-----------------------------------------------------+  |   |
    |   +-----------------------------------------------------------+   |
    +------------------------------------------------------------------+
```

## Features

### 1. Automatic Command Recording
Every terminal command is captured silently -- command text, output, exit code, duration, working directory, and shell type. No configuration needed.

### 2. Smart Command Categorization
Commands are automatically classified into 16 categories: navigation, git, package manager, build, test, deploy, file operations, text processing, network, docker, database, process, system, editor, debug, and AI tools.

### 3. Plain-English Explanations
Every command gets a human-readable explanation. `git push --force` becomes *"Force-pushes to a remote branch, potentially overwriting others' work."*

### 4. Error Diagnosis & Fix Suggestions
When a command fails, CodeForge explains what went wrong and suggests a fix. EADDRINUSE? *"Another program is already using this port. Find it with `lsof -i :3000`."*

### 5. Safety Interceptor
Destructive commands (`rm -rf`, `git reset --hard`, `DROP TABLE`) trigger a warning dialog before execution, explaining the risk and offering alternatives.

### 6. File Change Tracking
All file saves and renames are recorded with language detection, file size, and full path. Skips binary files automatically.

### 7. AI Prompt Recording
Prompts sent to GitHub Copilot, ChatGPT, Cursor, and other AI assistants are captured with the files context, so you remember what you asked and why.

### 8. Git Action Tracking
Every `git commit`, `git push`, `git pull`, and other git operations are recorded with branch context and explanations.

### 9. Milestone Detection
CodeForge automatically detects milestones: first successful build, first test pass, first deploy, first commit -- and celebrates them.

### 10. Recall Dashboard
A full-featured webview dashboard in your IDE sidebar shows your session history with a searchable timeline, color-coded record types, and one-click export.

### 11. Session History
Each project open/close creates a session with aggregated statistics: commands run, errors hit, files modified, duration, and top command categories.

### 12. Full-Text Search
Search across all recorded history with relevance scoring. Find that command you ran last Tuesday in seconds.

### 13. Export to Markdown & HTML
Export your entire session history as a beautifully formatted Markdown document or HTML page -- perfect for project documentation or onboarding new team members.

### 14. Recipe System
Auto-generated command sequences (recipes) that capture common workflows. Replay them with one click instead of retyping 10 commands.

### 15. Technical Glossary
An integrated glossary with 50+ definitions for common development terms, from "git commit" to "Docker container", accessible directly from the command palette.

## Installation

### VS Code

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **CodeForge**
4. Click **Install**
5. Reload VS Code when prompted

Or install from the command line:

```bash
code --install-extension codeforge.codeforge
```

### JetBrains IDEs

1. Open your JetBrains IDE (IntelliJ IDEA, WebStorm, PyCharm, etc.)
2. Go to **Settings/Preferences** > **Plugins** > **Marketplace**
3. Search for **CodeForge**
4. Click **Install**
5. Restart the IDE when prompted

### From Source

```bash
git clone https://github.com/codeforge-dev/codeforge.git
cd codeforge
pnpm install
pnpm build
```

For VS Code, open the `packages/vscode` folder in VS Code and press `F5` to launch the extension in development mode.

## Quick Start

1. **Install** CodeForge from the marketplace (see above)
2. **Open** any project folder in your IDE
3. **Use** your terminal as normal -- CodeForge records everything automatically
4. **Open** the Recall Dashboard from the sidebar or run `CodeForge: Open Recall Dashboard`
5. **Search** your command history, review explanations, and export documentation

That's it. No configuration required.

### What You'll See

After a few minutes of use, your dashboard will show:

- **Commands** with color-coded categories and plain-English explanations
- **Errors** with diagnoses and suggested fixes
- **File saves** with language tags
- **AI prompts** with source detection
- **Milestones** celebrating your progress
- **Git actions** with branch context

## Configuration

CodeForge works out of the box with sensible defaults. Customize via VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `codeforge.enabled` | `true` | Enable or disable recording |
| `codeforge.recordTerminal` | `true` | Record terminal commands |
| `codeforge.recordEditor` | `true` | Record file saves and renames |
| `codeforge.recordAI` | `true` | Record AI assistant prompts |
| `codeforge.recordGit` | `true` | Record git actions |
| `codeforge.skillLevel` | `"beginner"` | Adjust explanation detail (`beginner`, `intermediate`, `advanced`, `power`) |
| `codeforge.language` | `"en"` | Language for explanations (ISO 639-1) |
| `codeforge.maxStorageMB` | `50` | Maximum storage for recordbook |
| `codeforge.autoShowDashboard` | `true` | Auto-show dashboard on project open |

## Project Structure

```
codeforge/
  packages/
    core/           # @codeforge/core — Recording engine, storage, analysis, explanations
    vscode/         # @codeforge/vscode — VS Code extension
    jetbrains/      # JetBrains IDE plugin
    dashboard/      # @codeforge/dashboard — Web dashboard components
```

## Commands

| Command | Description |
|---------|-------------|
| `CodeForge: Open Recall Dashboard` | Open the dashboard panel |
| `CodeForge: Start Recording Session` | Manually start a new session |
| `CodeForge: Stop Recording Session` | End the current session |
| `CodeForge: Search Command History` | Search across all recorded history |
| `CodeForge: Export Session as Markdown` | Export to .md file |
| `CodeForge: Export Session as HTML` | Export to .html file |
| `CodeForge: Show Glossary` | Browse technical term definitions |
| `CodeForge: Check Project Health` | Display environment detection results |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development environment setup
- Code style and conventions
- Pull request process
- Issue reporting

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with care for developers who want to learn faster and forget less.**

</div>
