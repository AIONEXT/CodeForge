// =============================================================================
// @codeforge/core — Command Analyzer
// Categorizes commands, detects errors, identifies destructive operations
// =============================================================================

import type {
  CommandCategory,
  ErrorCategory,
} from "./types.js";

// ---------------------------------------------------------------------------
// Command category rules
// ---------------------------------------------------------------------------

interface CommandPattern {
  pattern: RegExp;
  category: CommandCategory;
  destructive: boolean;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // Navigation
  { pattern: /^\s*(cd|pushd|popd|dirs)\b/i, category: "navigation", destructive: false },
  { pattern: /^\s*(pwd)\b/i, category: "navigation", destructive: false },
  { pattern: /^\s*(ls|dir|tree|find|fd|eza|exa)\b/i, category: "navigation", destructive: false },
  { pattern: /^\s*(locate|which|where|whereis)\b/i, category: "navigation", destructive: false },

  // Git
  { pattern: /^\s*git\s+(commit|add|push|pull|fetch|merge|rebase|branch|checkout|switch|stash|tag|clone|init|remote|log|diff|status|reset|revert|bisect|cherry-pick|clean|gc)\b/i, category: "git", destructive: false },
  { pattern: /^\s*git\s+push\s+.*--force/i, category: "git", destructive: true },
  { pattern: /^\s*git\s+reset\s+--hard/i, category: "git", destructive: true },
  { pattern: /^\s*git\s+clean\s+-[^\s]*f/i, category: "git", destructive: true },
  { pattern: /^\s*git\s+checkout\s+.*--\s/i, category: "git", destructive: true },

  // Package managers
  { pattern: /^\s*npm\s+(install|i|add|update|upgrade|uninstall|remove|run|exec|npx|start|test|build|init|link|publish)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*yarn\s+(add|remove|install|upgrade|run|dev|build|start|test)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*pnpm\s+(add|remove|install|update|run|dev|build|start|test|exec)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*bun\s+(install|add|remove|run|dev|build|start|test)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*pip\s+(install|uninstall|freeze|list|show|download)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*pip3\s+(install|uninstall|freeze|list|show|download)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*poetry\s+(install|add|remove|update|run|shell|init|new)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*cargo\s+(add|remove|install|update|build|run|test|clippy|fmt|publish)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*go\s+(get|install|mod|build|run|test)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*mvn\s+(clean|install|compile|test|package|deploy)\b/i, category: "package_manager", destructive: false },
  { pattern: /^\s*gradle\s+(build|run|test|clean|assemble|install)\b/i, category: "package_manager", destructive: false },

  // Build
  { pattern: /^\s*(make|cmake|ninja|meson)\b/i, category: "build", destructive: false },
  { pattern: /^\s*(tsc|typescript)\b/i, category: "build", destructive: false },
  { pattern: /^\s*(webpack|vite|esbuild|rollup|parcel|turbo)\b/i, category: "build", destructive: false },
  { pattern: /^\s*npm\s+run\s+(build|compile|dev|start)\b/i, category: "build", destructive: false },
  { pattern: /^\s*(next|nuxt|svelte-kit|vite)\s+(build|dev|start|preview)\b/i, category: "build", destructive: false },

  // Test
  { pattern: /^\s*(jest|vitest|mocha|jasmine|karma|ava|tap)\b/i, category: "test", destructive: false },
  { pattern: /^\s*(pytest|unittest|nose|tox)\b/i, category: "test", destructive: false },
  { pattern: /^\s*(cargo\s+test|go\s+test)\b/i, category: "test", destructive: false },
  { pattern: /^\s*npm\s+(test|run\s+test)\b/i, category: "test", destructive: false },
  { pattern: /^\s*(cypress|playwright|selenium)\s+(run|open|test)\b/i, category: "test", destructive: false },

  // Deploy
  { pattern: /^\s*(vercel|netlify|heroku|firebase|surge|fly|railway)\s+(deploy|push|release|publish)\b/i, category: "deploy", destructive: false },
  { pattern: /^\s*aws\s+(s3\s+sync|ec2|deploy|cloudformation)\b/i, category: "deploy", destructive: false },
  { pattern: /^\s*(gh\s+pages|pages)\s+(deploy|push)\b/i, category: "deploy", destructive: false },

  // File operations
  { pattern: /^\s*(mkdir|touch|cp|mv|ln)\b/i, category: "file_ops", destructive: false },
  { pattern: /^\s*(rm|del|rmdir|unlink|shred)\b/i, category: "file_ops", destructive: true },
  { pattern: /^\s*(rm\s+-rf|rm\s+-fr|rm\s+-r)\b/i, category: "file_ops", destructive: true },
  { pattern: /^\s*(chmod|chown|chgrp)\b/i, category: "file_ops", destructive: false },

  // Text processing
  { pattern: /^\s*(grep|rg|ag|ack|find|sed|awk|sort|uniq|wc|head|tail|cut|tr|diff|patch|xargs)\b/i, category: "text_processing", destructive: false },
  { pattern: /^\s*(cat|less|more|type)\b/i, category: "text_processing", destructive: false },

  // Network
  { pattern: /^\s*(curl|wget|httpie|http)\b/i, category: "network", destructive: false },
  { pattern: /^\s*(ssh|scp|rsync|sftp)\b/i, category: "network", destructive: false },
  { pattern: /^\s*(ping|traceroute|nslookup|dig|host)\b/i, category: "network", destructive: false },
  { pattern: /^\s*(nc|netcat|ncat)\b/i, category: "network", destructive: false },

  // Docker
  { pattern: /^\s*(docker|docker-compose|docker compose)\b/i, category: "docker", destructive: false },
  { pattern: /^\s*docker\s+(rm|rmi|system\s+prune|volume\s+rm)\b/i, category: "docker", destructive: true },

  // Database
  { pattern: /^\s*(psql|mysql|mongosh|mongo|redis-cli|sqlite3|flask\s+db)\b/i, category: "database", destructive: false },
  { pattern: /^\s*(DROP\s+TABLE|DROP\s+DATABASE|DELETE\s+FROM|TRUNCATE)\b/i, category: "database", destructive: true },

  // Process management
  { pattern: /^\s*(ps|top|htop|kill|killall|pkill|pgrep|jobs|bg|fg|nohup)\b/i, category: "process", destructive: false },
  { pattern: /^\s*(lsof|fuser)\b/i, category: "process", destructive: false },

  // System
  { pattern: /^\s*(sudo|su)\b/i, category: "system", destructive: false },
  { pattern: /^\s*(env|export|set|echo)\b/i, category: "system", destructive: false },
  { pattern: /^\s*(source|\.\/)\b/i, category: "system", destructive: false },

  // Editor
  { pattern: /^\s*(code|vim|vi|nvim|nano|subl|atom|emacs|gedit)\b/i, category: "editor", destructive: false },

  // Debug
  { pattern: /^\s*(node\s+--inspect|nodemon|ts-node|tsx)\b/i, category: "debug", destructive: false },

  // AI tools
  { pattern: /^\s*(claude|copilot|chatgpt|cursor|copilot-cli)\b/i, category: "ai_tool", destructive: false },
];

// ---------------------------------------------------------------------------
// Error patterns
// ---------------------------------------------------------------------------

interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Port conflicts
  { pattern: /EADDRINUSE|address already in use|port.*in use|BindError/i, category: "port_conflict" },

  // Module not found
  { pattern: /MODULE_NOT_FOUND|Cannot find module|Module not found|No module named/i, category: "module_not_found" },

  // Permission denied
  { pattern: /EACCES|Permission denied|Operation not permitted|EPERM/i, category: "permission_denied" },

  // File not found
  { pattern: /ENOENT|No such file or directory|FileNotFoundError|file not found/i, category: "file_not_found" },

  // Syntax errors
  { pattern: /SyntaxError|ParseError|Unexpected token|Syntax error|IndentationError/i, category: "syntax_error" },

  // Type errors
  { pattern: /TypeError|Cannot read prop|is not a function|is not defined|undefined is not/i, category: "type_error" },

  // Network errors
  { pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|NetworkError|fetch failed/i, category: "network_error" },

  // Memory errors
  { pattern: /JavaScript heap out of memory|heap.*OOM|ENOMEM|MemoryError/i, category: "memory_error" },

  // Dependency issues
  { pattern: /peer dependency|ERESOLVE|Could not resolve dependency|conflicting peer/i, category: "dependency_missing" },

  // Git conflicts
  { pattern: /CONFLICT|merge conflict|conflict.*merge|cannot lock ref/i, category: "git_conflict" },

  // Build errors
  { pattern: /Build failed|Compilation failed|error TS\d+|Error: Build|webpack.*error/i, category: "build_error" },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Categorize a command and determine if it's destructive */
export function categorizeCommand(command: string): {
  category: CommandCategory;
  destructive: boolean;
} {
  const trimmed = command.trim();

  for (const rule of COMMAND_PATTERNS) {
    if (rule.pattern.test(trimmed)) {
      return { category: rule.category, destructive: rule.destructive };
    }
  }

  return { category: "unknown", destructive: false };
}

/** Classify an error message into a category */
export function classifyError(errorMessage: string): ErrorCategory {
  for (const rule of ERROR_PATTERNS) {
    if (rule.pattern.test(errorMessage)) {
      return rule.category;
    }
  }
  return "unknown";
}

/** Detect if a command looks like a git command */
export function isGitCommand(command: string): boolean {
  return /^\s*git\s+/i.test(command);
}

/** Get the git action from a git command */
export function getGitAction(command: string): string {
  const match = command.match(/^\s*git\s+(\w+)/);
  return match ? match[1] : "unknown";
}

/** Extract the primary command name (first word) */
export function getCommandName(command: string): string {
  const trimmed = command.trim();
  // Handle pipes — use the last command
  const pipeSplit = trimmed.split("|");
  const lastPart = pipeSplit[pipeSplit.length - 1].trim();
  // Handle sudo
  const sudoStripped = lastPart.replace(/^sudo\s+/, "");
  // Get the first word
  const match = sudoStripped.match(/^(\S+)/);
  return match ? match[1] : sudoStripped;
}

/** Count how many times each category appears in a list of commands */
export function getCategoryCounts(
  commands: string[]
): Record<CommandCategory, number> {
  const counts: Record<string, number> = {};

  for (const cmd of commands) {
    const { category } = categorizeCommand(cmd);
    counts[category] = (counts[category] || 0) + 1;
  }

  return counts as Record<CommandCategory, number>;
}

/** Get a human-readable label for a command category */
export function getCategoryLabel(category: CommandCategory): string {
  const labels: Record<CommandCategory, string> = {
    navigation: "File Navigation",
    git: "Git Version Control",
    package_manager: "Package Manager",
    build: "Build & Compile",
    test: "Testing",
    deploy: "Deployment",
    file_ops: "File Operations",
    text_processing: "Text Processing",
    network: "Networking",
    docker: "Docker Containers",
    database: "Database",
    process: "Process Management",
    system: "System",
    editor: "Editor",
    debug: "Debugging",
    ai_tool: "AI Tool",
    unknown: "Other",
  };
  return labels[category] || "Other";
}

/** Get a human-readable label for an error category */
export function getErrorCategoryLabel(category: ErrorCategory): string {
  const labels: Record<ErrorCategory, string> = {
    port_conflict: "Port Already in Use",
    module_not_found: "Missing Module",
    permission_denied: "Permission Denied",
    file_not_found: "File Not Found",
    syntax_error: "Syntax Error",
    type_error: "Type Error",
    network_error: "Network Error",
    memory_error: "Out of Memory",
    dependency_missing: "Missing Dependency",
    git_conflict: "Merge Conflict",
    build_error: "Build Failed",
    runtime_error: "Runtime Error",
    unknown: "Unknown Error",
  };
  return labels[category] || "Unknown Error";
}
