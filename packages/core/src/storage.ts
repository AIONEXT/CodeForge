// =============================================================================
// @codeforge/core — Storage Engine
// Handles reading, writing, and managing .codeforge/recordbook.json
// =============================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import type {
  RecordBook,
  RecordEntry,
  Session,
  CodeForgeSettings,
  EnvironmentInfo,
  Recipe,
  GlossaryEntry,
} from "./types.js";
import { nowISO } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CODEFORGE_DIR = ".codeforge";
export const RECORDBOOK_FILE = "recordbook.json";
export const MAX_STORAGE_MB = 50;
export const VERSION = "2.0.0";

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: CodeForgeSettings = {
  skillLevel: "beginner",
  language: "en",
  aiProvider: "none",
  recordTerminal: true,
  recordEditor: true,
  recordAI: true,
  recordGit: true,
  excludePatterns: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    ".codeforge",
  ],
  maxStorageMB: MAX_STORAGE_MB,
};

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Get the .codeforge directory path for a project */
export function getCodeforgeDir(projectRoot: string): string {
  return path.join(projectRoot, CODEFORGE_DIR);
}

/** Get the recordbook.json path for a project */
export function getRecordbookPath(projectRoot: string): string {
  return path.join(getCodeforgeDir(projectRoot), RECORDBOOK_FILE);
}

/** Check if a project has an existing recordbook */
export function hasRecordbook(projectRoot: string): boolean {
  return fs.existsSync(getRecordbookPath(projectRoot));
}

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

function runCommandSafe(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

/** Detect the project's environment information */
export function detectEnvironment(_projectRoot: string): EnvironmentInfo {
  const nodeVersion = runCommandSafe("node --version") || undefined;
  const npmVersion = runCommandSafe("npm --version") || undefined;
  const pythonVersion = runCommandSafe("python --version")?.replace("Python ", "") || undefined;
  const javaVersion = runCommandSafe("java -version 2>&1")?.match(/"([\d.]+)"/)?.[1] || undefined;
  const rustVersion = runCommandSafe("rustc --version")?.match(/rustc\s+([\d.]+)/)?.[1] || undefined;
  const goVersion = runCommandSafe("go version")?.match(/go([\d.]+)/)?.[1] || undefined;
  const gitVersion = runCommandSafe("git --version")?.match(/git version\s+([\d.]+)/)?.[1] || undefined;

  const detectedPackageManagers: string[] = [];
  if (npmVersion) detectedPackageManagers.push("npm");
  if (runCommandSafe("yarn --version")) detectedPackageManagers.push("yarn");
  if (runCommandSafe("pnpm --version")) detectedPackageManagers.push("pnpm");
  if (runCommandSafe("bun --version")) detectedPackageManagers.push("bun");

  const detectedIssues: string[] = [];

  return {
    nodeVersion,
    npmVersion,
    pythonVersion,
    javaVersion,
    rustVersion,
    goVersion,
    gitVersion,
    detectedPackageManagers: detectedPackageManagers as any,
    detectedIssues,
  };
}

// ---------------------------------------------------------------------------
// Project type detection
// ---------------------------------------------------------------------------

export function detectProjectType(projectRoot: string): {
  type: string;
  toolchain: string[];
} {
  const toolchain: string[] = [];
  let type = "unknown";

  const files = new Set(
    fs.readdirSync(projectRoot).filter((f: string) => !f.startsWith("."))
  );

  if (files.has("package.json")) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")
      );
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      toolchain.push("node", "npm");

      if (deps["next"]) { type = "nextjs"; toolchain.push("nextjs"); }
      else if (deps["react"] || deps["react-dom"]) { type = "react"; toolchain.push("react"); }
      else if (deps["vue"]) { type = "vue"; toolchain.push("vue"); }
      else if (deps["svelte"]) { type = "svelte"; toolchain.push("svelte"); }
      else if (deps["@angular/core"]) { type = "angular"; toolchain.push("angular"); }
      else { type = "node"; }
    } catch {
      type = "node";
    }
  } else if (files.has("requirements.txt") || files.has("pyproject.toml") || files.has("setup.py")) {
    type = "python";
    toolchain.push("python");
    if (files.has("manage.py")) { type = "django"; toolchain.push("django"); }
    if (files.has("app.py") || files.has("wsgi.py")) toolchain.push("flask");
  } else if (files.has("Cargo.toml")) {
    type = "rust";
    toolchain.push("rust", "cargo");
  } else if (files.has("go.mod")) {
    type = "go";
    toolchain.push("go");
  } else if (files.has("pom.xml") || files.has("build.gradle")) {
    type = "java";
    toolchain.push("java");
    if (files.has("pom.xml")) toolchain.push("maven");
    if (files.has("build.gradle")) toolchain.push("gradle");
  } else if (files.has("Gemfile")) {
    type = "ruby";
    toolchain.push("ruby", "bundler");
  } else if (files.has("composer.json")) {
    type = "php";
    toolchain.push("php", "composer");
  } else if (files.has("pubspec.yaml")) {
    type = "flutter";
    toolchain.push("flutter", "dart");
  }

  return { type, toolchain };
}

// ---------------------------------------------------------------------------
// Create / Initialize
// ---------------------------------------------------------------------------

/** Create a new recordbook for a project */
export function createRecordBook(
  projectRoot: string,
  _platform: string,
  settings: Partial<CodeForgeSettings> = {}
): RecordBook {
  const codeforgeDir = getCodeforgeDir(projectRoot);
  if (!fs.existsSync(codeforgeDir)) {
    fs.mkdirSync(codeforgeDir, { recursive: true });
  }

  const { type, toolchain } = detectProjectType(projectRoot);
  const projectName = path.basename(projectRoot);
  const now = nowISO();

  const fullSettings: CodeForgeSettings = { ...DEFAULT_SETTINGS, ...settings };

  const recordBook: RecordBook = {
    version: VERSION,
    codeforge: fullSettings,
    project: {
      name: projectName,
      rootPath: projectRoot,
      detectedType: type as any,
      detectedToolchain: toolchain,
      firstOpened: now,
      lastOpened: now,
      totalSessions: 0,
      totalCommandsRecorded: 0,
    },
    environment: detectEnvironment(projectRoot),
    recipes: [],
    glossary: [],
    sessions: [],
  };

  writeRecordBook(projectRoot, recordBook);
  return recordBook;
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

/** Read the recordbook from disk */
export function readRecordBook(projectRoot: string): RecordBook | null {
  const filePath = getRecordbookPath(projectRoot);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as RecordBook;
  } catch (err) {
    console.error(`[CodeForge] Failed to read recordbook: ${err}`);
    return null;
  }
}

/** Write the recordbook to disk */
export function writeRecordBook(projectRoot: string, recordBook: RecordBook): void {
  const codeforgeDir = getCodeforgeDir(projectRoot);
  if (!fs.existsSync(codeforgeDir)) {
    fs.mkdirSync(codeforgeDir, { recursive: true });
  }

  const filePath = getRecordbookPath(projectRoot);
  const json = JSON.stringify(recordBook, null, 2);

  // Check size limit
  const sizeMB = Buffer.byteLength(json, "utf-8") / (1024 * 1024);
  if (sizeMB > recordBook.codeforge.maxStorageMB) {
    console.warn(
      `[CodeForge] Recordbook exceeds ${recordBook.codeforge.maxStorageMB}MB limit. ` +
      `Consider exporting and clearing old sessions.`
    );
  }

  fs.writeFileSync(filePath, json, "utf-8");
}

/** Load or create a recordbook */
export function loadOrCreateRecordBook(
  projectRoot: string,
  platform: string,
  settings: Partial<CodeForgeSettings> = {}
): RecordBook {
  const existing = readRecordBook(projectRoot);
  if (existing) {
    // Update lastOpened
    const updated: RecordBook = {
      ...existing,
      project: {
        ...existing.project,
        lastOpened: nowISO(),
      },
    };
    writeRecordBook(projectRoot, updated);
    return updated;
  }
  return createRecordBook(projectRoot, platform, settings);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/** Add a new session to the recordbook */
export function addSession(projectRoot: string, session: Session): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  const updated: RecordBook = {
    ...recordBook,
    project: {
      ...recordBook.project,
      totalSessions: recordBook.project.totalSessions + 1,
      lastOpened: nowISO(),
    },
    sessions: [...recordBook.sessions, session],
  };

  writeRecordBook(projectRoot, updated);
}

/** Update an existing session (e.g. when it ends) */
export function updateSession(
  projectRoot: string,
  sessionId: string,
  updates: Partial<Session>
): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  const sessions = recordBook.sessions.map((s) =>
    s.id === sessionId ? { ...s, ...updates } : s
  );

  const totalCommands = sessions.reduce(
    (sum, s) => sum + s.records.filter((r) => r.type === "terminal_command").length,
    0
  );

  const updated: RecordBook = {
    ...recordBook,
    project: {
      ...recordBook.project,
      totalCommandsRecorded: totalCommands,
      lastOpened: nowISO(),
    },
    sessions,
  };

  writeRecordBook(projectRoot, updated);
}

/** Append a record to an active session */
export function appendRecord(
  projectRoot: string,
  sessionId: string,
  record: RecordEntry
): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  const sessions = recordBook.sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const newRecords = [...s.records, record];

    // Update summary
    const commands = newRecords.filter((r) => r.type === "terminal_command").length;
    const errors = newRecords.filter((r) => r.type === "error").length;
    const files = newRecords.filter((r) => r.type === "file_save" || r.type === "file_rename").length;
    const aiPrompts = newRecords.filter((r) => r.type === "ai_prompt").length;
    const gitActions = newRecords.filter((r) => r.type === "git_action").length;
    const milestones = newRecords.filter((r) => r.type === "milestone").length;

    const startedAt = new Date(s.startedAt).getTime();
    const now = Date.now();

    return {
      ...s,
      records: newRecords,
      summary: {
        ...s.summary,
        commandsRun: commands,
        errorsHit: errors,
        filesModified: files,
        aiPromptsUsed: aiPrompts,
        gitActions,
        milestones,
        durationMs: now - startedAt,
        duration: "", // will be computed
      },
    };
  });

  writeRecordBook(projectRoot, { ...recordBook, sessions });
}

// ---------------------------------------------------------------------------
// Recipe management
// ---------------------------------------------------------------------------

/** Add or update a recipe */
export function upsertRecipe(projectRoot: string, recipe: Recipe): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  const existing = recordBook.recipes.find((r) => r.id === recipe.id);
  let recipes: Recipe[];

  if (existing) {
    recipes = recordBook.recipes.map((r) =>
      r.id === recipe.id ? recipe : r
    );
  } else {
    recipes = [...recordBook.recipes, recipe];
  }

  writeRecordBook(projectRoot, { ...recordBook, recipes });
}

// ---------------------------------------------------------------------------
// Glossary management
// ---------------------------------------------------------------------------

/** Add a glossary entry */
export function addGlossaryEntry(
  projectRoot: string,
  entry: GlossaryEntry
): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  const exists = recordBook.glossary.some((g) => g.term === entry.term);
  if (exists) return; // don't duplicate

  writeRecordBook(projectRoot, {
    ...recordBook,
    glossary: [...recordBook.glossary, entry],
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/** Prune old sessions beyond a maximum count */
export function pruneOldSessions(
  projectRoot: string,
  maxSessions: number = 100
): void {
  const recordBook = readRecordBook(projectRoot);
  if (!recordBook) return;

  if (recordBook.sessions.length <= maxSessions) return;

  const sorted = [...recordBook.sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const pruned = sorted.slice(sorted.length - maxSessions);

  writeRecordBook(projectRoot, { ...recordBook, sessions: pruned });
}

/** Remove all data for a project */
export function deleteRecordBook(projectRoot: string): void {
  const codeforgeDir = getCodeforgeDir(projectRoot);
  if (fs.existsSync(codeforgeDir)) {
    fs.rmSync(codeforgeDir, { recursive: true, force: true });
  }
}
