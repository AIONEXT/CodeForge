// =============================================================================
// @codeforge/core — Plain-English Explainer
// Translates commands and errors into human-readable explanations
// =============================================================================



// ---------------------------------------------------------------------------
// Command explanations — maps patterns to plain English
// ---------------------------------------------------------------------------

interface CommandExplanationRule {
  pattern: RegExp;
  explain: (match: RegExpMatchArray, full: string) => string;
}

const COMMAND_EXPLANATIONS: CommandExplanationRule[] = [
  // Navigation
  {
    pattern: /^\s*cd\s+(.+)/,
    explain: (_, cmd) => {
      const target = cmd.replace(/^\s*cd\s+/, "").trim();
      if (target === "..") return "Go up one folder";
      if (target === "~") return "Go to your home folder";
      if (target === "/") return "Go to the root folder";
      if (target === "-") return "Go back to the previous folder";
      return `Navigate into the "${target}" folder`;
    },
  },
  {
    pattern: /^\s*pwd\b/,
    explain: () => "Print the full path of the current folder",
  },
  {
    pattern: /^\s*ls\b/,
    explain: (match) => {
      const flags = match[0].trim();
      if (flags.includes("-la") || flags.includes("-al")) return "List all files including hidden ones, with details";
      if (flags.includes("-l")) return "List files with details (size, permissions, date)";
      if (flags.includes("-a")) return "List all files including hidden ones";
      if (flags.includes("-R")) return "List all files recursively (including subfolders)";
      if (flags.includes("tree") || flags.includes("--tree")) return "Show folder structure as a tree";
      return "List files in the current folder";
    },
  },
  {
    pattern: /^\s*tree\b/,
    explain: () => "Show the folder structure as a visual tree",
  },

  // Git
  {
    pattern: /^\s*git\s+init\b/,
    explain: () => "Start tracking this folder as a Git project (creates a .git folder)",
  },
  {
    pattern: /^\s*git\s+clone\s+(.+)/,
    explain: (_, cmd) => {
      const url = cmd.replace(/^\s*git\s+clone\s+/, "").trim();
      const name = url.split("/").pop()?.replace(".git", "") || "project";
      return `Download a copy of "${name}" from GitHub to your computer`;
    },
  },
  {
    pattern: /^\s*git\s+add\s+(.+)/,
    explain: (_, cmd) => {
      const target = cmd.replace(/^\s*git\s+add\s+/, "").trim();
      if (target === "." || target === "-A") return "Stage ALL changed files to be saved";
      if (target.includes("*")) return `Stage files matching "${target}" to be saved`;
      return `Stage the file "${target}" to be saved`;
    },
  },
  {
    pattern: /^\s*git\s+commit\b/,
    explain: (_, cmd) => {
      const msgMatch = cmd.match(/-m\s+["'](.+?)["']/);
      if (msgMatch) return `Save a snapshot of your changes with the message: "${msgMatch[1]}"`;
      return "Save a snapshot of your staged changes (opens editor for a message)";
    },
  },
  {
    pattern: /^\s*git\s+push\b/,
    explain: () => "Upload your saved snapshots to GitHub (or your remote server)",
  },
  {
    pattern: /^\s*git\s+pull\b/,
    explain: () => "Download the latest changes from GitHub and merge them into your code",
  },
  {
    pattern: /^\s*git\s+fetch\b/,
    explain: () => "Download the latest changes from GitHub without merging yet",
  },
  {
    pattern: /^\s*git\s+status\b/,
    explain: () => "Show what files have changed and what needs to be saved",
  },
  {
    pattern: /^\s*git\s+log\b/,
    explain: () => "Show the history of all saved snapshots (commits)",
  },
  {
    pattern: /^\s*git\s+diff\b/,
    explain: () => "Show exactly what changed in your files since the last save",
  },
  {
    pattern: /^\s*git\s+branch\b/,
    explain: () => "List all branches (parallel versions of your project)",
  },
  {
    pattern: /^\s*git\s+checkout\s+(.+)/,
    explain: (_, cmd) => {
      const branch = cmd.replace(/^\s*git\s+checkout\s+/, "").trim().replace(/^-b\s+/, "");
      if (cmd.includes("-b")) return `Create and switch to a new branch called "${branch}"`;
      return `Switch to the branch "${branch}"`;
    },
  },
  {
    pattern: /^\s*git\s+merge\s+(.+)/,
    explain: (_, cmd) => {
      const branch = cmd.replace(/^\s*git\s+merge\s+/, "").trim();
      return `Combine the changes from branch "${branch}" into your current branch`;
    },
  },
  {
    pattern: /^\s*git\s+stash\b/,
    explain: () => "Temporarily save your changes so you can work on something else",
  },
  {
    pattern: /^\s*git\s+stash\s+pop\b/,
    explain: () => "Bring back your temporarily saved changes",
  },
  {
    pattern: /^\s*git\s+reset\b/,
    explain: (_, cmd) => {
      if (cmd.includes("--hard")) return "⚠️ DISCARD all changes since the last commit (CANNOT be undone)";
      if (cmd.includes("--soft")) return "Undo the last commit but keep your file changes";
      return "Undo the last commit and unstage changes";
    },
  },
  {
    pattern: /^\s*git\s+revert\s+(.+)/,
    explain: (_, cmd) => {
      const hash = cmd.replace(/^\s*git\s+revert\s+/, "").trim();
      return `Create a new commit that undoes the changes from commit ${hash}`;
    },
  },

  // Package managers
  {
    pattern: /^\s*npm\s+install\b/,
    explain: (_, cmd) => {
      if (cmd.includes("-g")) return "Install a package globally (available everywhere on your computer)";
      const pkg = cmd.replace(/^\s*npm\s+install\s+/, "").trim();
      if (pkg === "" || pkg === ".") return "Download and install all libraries this project needs";
      return `Download and install the "${pkg}" library for this project`;
    },
  },
  {
    pattern: /^\s*npm\s+(run\s+)?dev\b/,
    explain: () => "Start the development server (lets you see your app live as you code)",
  },
  {
    pattern: /^\s*npm\s+(run\s+)?start\b/,
    explain: () => "Start the application in production mode",
  },
  {
    pattern: /^\s*npm\s+(run\s+)?build\b/,
    explain: () => "Build the project for production (creates optimized files for deployment)",
  },
  {
    pattern: /^\s*npm\s+(run\s+)?test\b/,
    explain: () => "Run all the automated tests to check if your code works correctly",
  },
  {
    pattern: /^\s*npm\s+init\b/,
    explain: () => "Create a new package.json file to start a new Node.js project",
  },
  {
    pattern: /^\s*npx\b/,
    explain: (_, cmd) => {
      const tool = cmd.replace(/^\s*npx\s+/, "").trim().split(/\s+/)[0];
      return `Run the "${tool}" tool without permanently installing it`;
    },
  },
  {
    pattern: /^\s*yarn\s+(add|install)\b/,
    explain: (_, cmd) => {
      if (cmd.includes("install")) return "Download and install all libraries this project needs (using Yarn)";
      const pkg = cmd.replace(/^\s*yarn\s+add\s+/, "").trim();
      return `Download and install the "${pkg}" library (using Yarn)`;
    },
  },
  {
    pattern: /^\s*pnpm\s+install\b/,
    explain: () => "Download and install all libraries this project needs (using pnpm, saves disk space)",
  },
  {
    pattern: /^\s*pip\s+install\s+(.+)/,
    explain: (_, cmd) => {
      const pkg = cmd.replace(/^\s*pip\s+install\s+/, "").trim().split(/\s+/)[0];
      return `Download and install the "${pkg}" Python library`;
    },
  },
  {
    pattern: /^\s*cargo\s+(run|build|test)\b/,
    explain: (match) => {
      const action = match[0].includes("run") ? "Run" : match[0].includes("test") ? "Test" : "Build";
      return `${action} your Rust project`;
    },
  },
  {
    pattern: /^\s*go\s+(run|build|test)\b/,
    explain: (match) => {
      const action = match[0].includes("run") ? "Run" : match[0].includes("test") ? "Test" : "Build";
      return `${action} your Go project`;
    },
  },

  // Build
  {
    pattern: /^\s*make\b/,
    explain: () => "Run the build instructions defined in the Makefile",
  },
  {
    pattern: /^\s*tsc\b/,
    explain: () => "Compile TypeScript code into regular JavaScript",
  },

  // File operations
  {
    pattern: /^\s*mkdir\s+(.+)/,
    explain: (_, cmd) => {
      const dir = cmd.replace(/^\s*mkdir\s+/, "").trim().replace(/-p\s+/, "");
      return `Create a new folder called "${dir}"`;
    },
  },
  {
    pattern: /^\s*(rm|rmdir)\s+(.+)/,
    explain: (_, cmd) => {
      const target = cmd.replace(/^\s*(rm|rmdir)\s+/, "").trim();
      const isRecursive = cmd.includes("-r") || cmd.includes("-rf") || cmd.includes("-fr");
      if (isRecursive) return `⚠️ PERMANENTLY delete "${target}" and everything inside it`;
      return `Delete the file "${target}"`;
    },
  },
  {
    pattern: /^\s*cp\s+(.+)/,
    explain: (_, cmd) => {
      const parts = cmd.replace(/^\s*cp\s+/, "").trim().split(/\s+/);
      return `Copy "${parts[0]}" to "${parts[parts.length - 1]}"`;
    },
  },
  {
    pattern: /^\s*mv\s+(.+)/,
    explain: (_, cmd) => {
      const parts = cmd.replace(/^\s*mv\s+/, "").trim().split(/\s+/);
      return `Move or rename "${parts[0]}" to "${parts[parts.length - 1]}"`;
    },
  },
  {
    pattern: /^\s*touch\s+(.+)/,
    explain: (_, cmd) => {
      const file = cmd.replace(/^\s*touch\s+/, "").trim();
      return `Create an empty file called "${file}" (or update its timestamp if it exists)`;
    },
  },

  // Docker
  {
    pattern: /^\s*docker\s+run\s+(.+)/,
    explain: () => "Start a new container (a lightweight, isolated environment for running software)",
  },
  {
    pattern: /^\s*docker\s+build\s+(.+)/,
    explain: () => "Build a Docker image from the instructions in the Dockerfile",
  },
  {
    pattern: /^\s*docker-compose\s+(up|docker\s+compose\s+up)\b/,
    explain: () => "Start all the services defined in your docker-compose.yml file",
  },
  {
    pattern: /^\s*docker\s+(stop|kill|rm)\s+(.+)/,
    explain: (_match, cmd) => {
      if (cmd.includes("stop")) return "Gracefully stop a running container";
      if (cmd.includes("kill")) return "Forcefully stop a running container";
      return "Remove a stopped container";
    },
  },

  // Network
  {
    pattern: /^\s*curl\s+(.+)/,
    explain: () => "Send an HTTP request to a web server and show the response",
  },
  {
    pattern: /^\s*wget\s+(.+)/,
    explain: () => "Download a file from the internet",
  },
  {
    pattern: /^\s*ssh\s+(.+)/,
    explain: () => "Connect to another computer securely through the terminal",
  },

  // System
  {
    pattern: /^\s*sudo\s+(.+)/,
    explain: (_, cmd) => {
      const inner = cmd.replace(/^\s*sudo\s+/, "").trim();
      return `⚠️ Run "${inner}" with administrator privileges (be careful!)`;
    },
  },
  {
    pattern: /^\s*chmod\s+(.+)/,
    explain: () => "Change file or folder permissions (who can read, write, or execute it)",
  },
  {
    pattern: /^\s*env\b/,
    explain: () => "Show all the environment variables set on your system",
  },
  {
    pattern: /^\s*export\s+(.+)/,
    explain: (_, cmd) => {
      const varName = cmd.replace(/^\s*export\s+/, "").trim().split("=")[0];
      return `Set the environment variable "${varName}" for this terminal session`;
    },
  },

  // Kill/process
  {
    pattern: /^\s*kill\s+(.+)/,
    explain: (_, cmd) => {
      const pid = cmd.replace(/^\s*kill\s+/, "").trim();
      if (cmd.includes("-9")) return `Forcefully stop the process with ID ${pid}`;
      return `Ask the process with ID ${pid} to stop gracefully`;
    },
  },
  {
    pattern: /^\s*lsof\s+(.+)/,
    explain: () => "Show which processes are using a file or network port",
  },

  // Editors
  {
    pattern: /^\s*code\s+(.+)/,
    explain: (_, cmd) => {
      const target = cmd.replace(/^\s*code\s+/, "").trim();
      if (target === ".") return "Open this folder in Visual Studio Code";
      return `Open "${target}" in Visual Studio Code`;
    },
  },
  {
    pattern: /^\s*code\s*\./,
    explain: () => "Open this folder in Visual Studio Code",
  },
];

// ---------------------------------------------------------------------------
// Error explanations
// ---------------------------------------------------------------------------

interface ErrorExplanationRule {
  pattern: RegExp;
  explain: (error: string, command?: string) => string;
  fix: (error: string, command?: string) => string;
}

const ERROR_EXPLANATIONS: ErrorExplanationRule[] = [
  // Port in use
  {
    pattern: /EADDRINUSE|address already in use|port.*already/i,
    explain: () => "Another program is already using this port number. Most likely a previous server is still running in the background.",
    fix: (error) => {
      const portMatch = error.match(/(?:port|:::)(\d+)/);
      const port = portMatch ? portMatch[1] : "3000";
      return `Find the process using port ${port} with: lsof -i :${port}\nThen kill it with: kill <PID>\nOr use a different port.`;
    },
  },

  // Module not found
  {
    pattern: /MODULE_NOT_FOUND|Cannot find module|No module named/i,
    explain: (error) => {
      const moduleMatch = error.match(/(?:module|No module named)\s+['"]?([^'")\s]+)/);
      const moduleName = moduleMatch ? moduleMatch[1] : "a required module";
      return `The code is trying to use "${moduleName}" but it's not installed or can't be found.`;
    },
    fix: (error) => {
      const moduleMatch = error.match(/(?:module|No module named)\s+['"]?([^'")\s]+)/);
      const moduleName = moduleMatch ? moduleMatch[1] : "the-module";
      return `Try running: npm install ${moduleName}\nIf it's a local file, check the import path and filename.`;
    },
  },

  // Permission denied
  {
    pattern: /EACCES|Permission denied|Operation not permitted/i,
    explain: () => "You don't have permission to access this file or folder. This often happens when a file was created by a different user or with administrator privileges.",
    fix: () => `Check file permissions with: ls -la\nIf needed, change permissions with: chmod 755 <file>\nAvoid using sudo unless absolutely necessary.`,
  },

  // File not found
  {
    pattern: /ENOENT|No such file or directory|FileNotFoundError/i,
    explain: (error) => {
      const pathMatch = error.match(/(?:'[^']*'|"[^"]*"|path)\s+['"]?([^'")\s]+)/);
      const filePath = pathMatch ? pathMatch[1] : "the specified path";
      return `The file or folder "${filePath}" doesn't exist at the location the code expects.`;
    },
    fix: () => `Check you're in the right directory with: pwd\nList files with: ls\nVerify the file path in your code is correct.`,
  },

  // Syntax error
  {
    pattern: /SyntaxError|Unexpected token|IndentationError/i,
    explain: (error) => {
      const lineMatch = error.match(/line\s+(\d+)/i);
      const line = lineMatch ? ` on line ${lineMatch[1]}` : "";
      return `There's a grammar mistake in the code${line}. The computer can't understand what you wrote.`;
    },
    fix: () => `Look at the line number mentioned in the error. Check for:\n- Missing commas, brackets, or quotes\n- Wrong indentation (spaces vs tabs)\n- Misspelled keywords`,
  },

  // Type error
  {
    pattern: /TypeError|Cannot read prop|is not a function|undefined is not/i,
    explain: (error) => {
      if (error.includes("Cannot read prop")) return "The code is trying to read a property from something that doesn't exist (is undefined or null).";
      if (error.includes("is not a function")) return "The code is trying to call something as a function, but it's not a function.";
      return "The code is trying to use a value in a way that doesn't match its type.";
    },
    fix: () => `Add a check before using the value:\n- Use: if (value) { ... } or value?.property\n- Check: typeof value before using it\n- Log: console.log(value) to see what it actually is`,
  },

  // Network error
  {
    pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed/i,
    explain: () => "The connection to a server was refused or timed out. The server might be down, or your internet connection might have an issue.",
    fix: () => `Check:\n1. Is the server running?\n2. Is your internet working?\n3. Is the URL/port correct?\n4. Try: ping <host> to test connectivity`,
  },

  // Out of memory
  {
    pattern: /heap out of memory|ENOMEM/i,
    explain: () => "The program ran out of memory. This usually happens with very large projects or when processing huge amounts of data.",
    fix: () => `Increase memory with: NODE_OPTIONS="--max-old-space-size=4096" npm run build\nOr close other programs to free up memory.`,
  },

  // Dependency conflict
  {
    pattern: /ERESOLVE|peer dependency|conflicting peer/i,
    explain: () => "Two packages need different versions of the same dependency, and npm can't resolve the conflict automatically.",
    fix: () => `Try: npm install --legacy-peer-deps\nOr use: --force flag (may cause issues later)\nOr manually install the correct version of the conflicting dependency.`,
  },

  // Git conflict
  {
    pattern: /CONFLICT|merge conflict/i,
    explain: () => "Git found the same file was changed in two different places and doesn't know which version to keep.",
    fix: () => `Open the conflicted files. Look for <<<<<<< and >>>>>>> markers.\nChoose which changes to keep, remove the markers, then:\ngit add .\ngit commit`,
  },

  // Build error
  {
    pattern: /Build failed|error TS\d+|Compilation failed/i,
    explain: () => "The project couldn't be compiled or built. There are errors in the code that need to be fixed first.",
    fix: () => `Read the error messages above carefully — they usually tell you exactly which file and line has the problem.`,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get a plain-English explanation for a command */
export function explainCommand(command: string): string {
  for (const rule of COMMAND_EXPLANATIONS) {
      const matchResult = command.match(rule.pattern);
      if (matchResult) {
        return rule.explain(matchResult, command);
      }
  }

  // Fallback: generate a generic explanation
  const cmdName = command.trim().split(/\s+/)[0];
  return `Run the "${cmdName}" command`;
}

/** Get a plain-English explanation for an error */
export function explainError(error: string, command?: string): string {
  for (const rule of ERROR_EXPLANATIONS) {
    if (rule.pattern.test(error)) {
      return rule.explain(error, command);
    }
  }
  return "An error occurred. Check the error message above for details.";
}

/** Get a suggested fix for an error */
export function suggestFix(error: string, command?: string): string {
  for (const rule of ERROR_EXPLANATIONS) {
    if (rule.pattern.test(error)) {
      return rule.fix(error, command);
    }
  }
  return "Try re-reading the error message and searching for it online.";
}

/** Get the safety level of a command */
export function getCommandSafetyLevel(command: string): {
  level: "safe" | "caution" | "dangerous";
  reason: string;
} {
  const trimmed = command.trim().toLowerCase();

  // Dangerous patterns
  if (/\brm\s+-rf\b|\brm\s+-fr\b/.test(trimmed)) {
    return { level: "dangerous", reason: "Permanently deletes files and folders recursively with no confirmation" };
  }
  if (/\bgit\s+reset\s+--hard\b/.test(trimmed)) {
    return { level: "dangerous", reason: "Discards ALL uncommitted changes (cannot be undone)" };
  }
  if (/\bgit\s+push\s+.*--force\b/.test(trimmed)) {
    return { level: "dangerous", reason: "Force-pushes to a remote branch, potentially overwriting others' work" };
  }
  if (/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i.test(trimmed)) {
    return { level: "dangerous", reason: "Permanently deletes data from the database" };
  }
  if (/\bchmod\s+777\b/.test(trimmed)) {
    return { level: "dangerous", reason: "Gives everyone full access to the file (security risk)" };
  }
  if (/\bsudo\b/.test(trimmed)) {
    return { level: "caution", reason: "Runs with administrator privileges — be careful what it does" };
  }
  if (/\bkill\b/.test(trimmed)) {
    return { level: "caution", reason: "Stops a running process — make sure it's the right one" };
  }
  if (/\bmv\b.*\//.test(trimmed) && !/\bmv\b.*\.\//.test(trimmed)) {
    return { level: "caution", reason: "Moving files to a different location — make sure the destination is correct" };
  }
  if (/\brm\b/.test(trimmed)) {
    return { level: "caution", reason: "Deletes a file (check if you have a backup)" };
  }

  return { level: "safe", reason: "This command is generally safe to run" };
}

/** Get a glossary definition for a technical term */
export function getGlossaryDefinition(term: string): string | null {
  const glossary: Record<string, string> = {
    "git": "A tool that tracks changes to your code over time, like a save-point system for your project",
    "commit": "Saving a snapshot of your current code changes in Git",
    "branch": "A parallel version of your project where you can make changes without affecting the main code",
    "merge": "Combining changes from one branch into another",
    "repository (repo)": "A folder that Git is tracking — it contains your project code and its history",
    "clone": "Making a copy of a remote repository on your computer",
    "push": "Uploading your local changes to a remote server (like GitHub)",
    "pull": "Downloading changes from a remote server to your computer",
    "npm": "Node Package Manager — a tool to install and manage code libraries for JavaScript projects",
    "node_modules": "A folder where npm stores all the downloaded libraries your project needs",
    "package.json": "A file that describes your project: its name, version, and which libraries it depends on",
    "dependency": "Code written by someone else that your project uses",
    "dev dependency": "Libraries only needed during development (not in production)",
    "port": "A numbered doorway your app uses to communicate. Like 3000, 8080, etc.",
    "localhost": "Your own computer — when an app runs on localhost, it's only accessible on your machine",
    "terminal": "A text-based way to interact with your computer (as opposed to clicking with a mouse)",
    "CLI": "Command Line Interface — another name for the terminal",
    "PATH": "A list of folders your computer searches when you type a command",
    "environment variable": "A setting stored outside your code, like API keys or configuration",
    ".env file": "A file where you store environment variables (secrets, API keys) — never commit this to Git!",
    ".gitignore": "A file that tells Git which files to ignore (like node_modules, .env, etc.)",
    "build": "Converting your source code into optimized files that can run in production",
    "compile": "Translating code from one language to another (e.g., TypeScript to JavaScript)",
    "transpile": "Same as compile — converting code to a compatible format",
    "debug": "Finding and fixing errors in your code",
    "stack trace": "The list of function calls that led to an error — read it from bottom to top",
    "API": "Application Programming Interface — a way for different programs to talk to each other",
    "endpoint": "A specific URL where an API can be reached",
    "REST": "A common style of designing APIs using HTTP methods (GET, POST, PUT, DELETE)",
    "HTTP": "The protocol used for communication on the web (GET, POST, PUT, DELETE are HTTP methods)",
    "Docker": "A tool that packages your app with everything it needs to run, in an isolated container",
    "container": "A lightweight, isolated environment that runs your app with its own dependencies",
    "image": "A template used to create Docker containers",
    "CI/CD": "Continuous Integration / Continuous Deployment — automated testing and deployment",
    "linter": "A tool that checks your code for common mistakes and style issues",
    "formatter": "A tool that automatically organizes your code layout (indentation, spacing, etc.)",
    "TypeScript": "A programming language that adds type safety to JavaScript — catches errors before you run the code",
    "React": "A JavaScript library for building user interfaces (websites and apps)",
    "Vue": "A JavaScript framework for building user interfaces (similar to React)",
    "Angular": "A JavaScript framework for building large web applications",
    "Next.js": "A React framework that adds features like server-side rendering and routing",
    "Node.js": "JavaScript runtime that lets you run JavaScript outside the browser (on your computer/server)",
  };

  const lowerTerm = term.toLowerCase();
  for (const [key, value] of Object.entries(glossary)) {
    if (key.toLowerCase() === lowerTerm || key.toLowerCase().includes(lowerTerm)) {
      return value;
    }
  }
  return null;
}
