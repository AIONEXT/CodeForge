// =============================================================================
// @codeforge/core — Public API
// Everything that consumers of this package can import
// =============================================================================

// Types
export type {
  Platform,
  OS,
  ProjectType,
  PackageManager,
  SkillLevel,
  AIProvider,
  BaseRecord,
  TerminalCommandRecord,
  ErrorRecord,
  FileSaveRecord,
  FileRenameRecord,
  AIPromptRecord,
  MilestoneRecord,
  GitActionRecord,
  RecordEntry,
  CommandCategory,
  ErrorCategory,
  FileTreeNode,
  EnvironmentInfo,
  SessionSummary,
  Session,
  RecipeStep,
  Recipe,
  GlossaryEntry,
  CodeForgeSettings,
  ProjectMeta,
  RecordBook,
  RecorderConfig,
  SearchQuery,
  SearchResult,
  ExportFormat,
  ExportOptions,
} from "./types.js";

// Utility functions
export {
  generateId,
  nowISO,
  formatDuration,
  displayPath,
} from "./types.js";

// Storage
export {
  CODEFORGE_DIR,
  RECORDBOOK_FILE,
  MAX_STORAGE_MB,
  getCodeforgeDir,
  getRecordbookPath,
  hasRecordbook,
  detectEnvironment,
  detectProjectType,
  createRecordBook,
  readRecordBook,
  writeRecordBook,
  loadOrCreateRecordBook,
  addSession,
  updateSession,
  appendRecord,
  upsertRecipe,
  addGlossaryEntry,
  pruneOldSessions,
  deleteRecordBook,
} from "./storage.js";

// Analyzer
export {
  categorizeCommand,
  classifyError,
  isGitCommand,
  getGitAction,
  getCommandName,
  getCategoryCounts,
  getCategoryLabel,
  getErrorCategoryLabel,
} from "./analyzer.js";

// Explainer
export {
  explainCommand,
  explainError,
  suggestFix,
  getCommandSafetyLevel,
  getGlossaryDefinition,
} from "./explainer.js";

// Recorder
export { CodeForgeRecorder } from "./recorder.js";
