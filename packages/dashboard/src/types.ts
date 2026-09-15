// @codeforge/dashboard — types.ts
// Matches @codeforge/core RecordBook schema exactly.

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type AiProvider = 'openai' | 'anthropic' | 'copilot' | 'local' | 'other';

export type RecordType =
  | 'terminal_command'
  | 'error'
  | 'file_save'
  | 'file_rename'
  | 'ai_prompt'
  | 'milestone'
  | 'git_action';

export interface CodeforgeSettings {
  skillLevel: SkillLevel;
  language: string;
  aiProvider: AiProvider;
  recordTerminal: boolean;
  recordEditor: boolean;
  recordAI: boolean;
  recordGit: boolean;
  excludePatterns: string[];
  maxStorageMB: number;
}

export interface ProjectMetadata {
  name: string;
  rootPath: string;
  detectedType: string;
  detectedToolchain: string;
  firstOpened: string;
  lastOpened: string;
  totalSessions: number;
  totalCommandsRecorded: number;
}

export interface EnvironmentInfo {
  nodeVersion?: string;
  npmVersion?: string;
  pythonVersion?: string;
  gitVersion?: string;
  os?: string;
  shell?: string;
  vscodeVersion?: string;
  jetbrainsVersion?: string;
  [key: string]: string | undefined;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: RecipeStep[];
  derivedFrom: string[];
  confidence: number;
  createdAt: string;
  lastUsed?: string;
}

export interface RecipeStep {
  order: number;
  command: string;
  description: string;
  recordIds: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  context?: string;
  category: string;
  relatedTerms?: string[];
}

// --- Record types (union) ---

export interface TerminalCommandRecord {
  id: string;
  type: 'terminal_command';
  timestamp: string;
  command: string;
  cwd?: string;
  exitCode?: number;
  duration?: number;
  explanation?: string;
  category?: string;
  tags?: string[];
}

export interface ErrorRecord {
  id: string;
  type: 'error';
  timestamp: string;
  message: string;
  stack?: string;
  source?: string;
  command?: string;
  diagnosis?: string;
  fixSuggestion?: string;
  resolved?: boolean;
}

export interface FileSaveRecord {
  id: string;
  type: 'file_save';
  timestamp: string;
  filePath: string;
  language?: string;
  linesAdded?: number;
  linesRemoved?: number;
  explanation?: string;
}

export interface FileRenameRecord {
  id: string;
  type: 'file_rename';
  timestamp: string;
  oldPath: string;
  newPath: string;
  explanation?: string;
}

export interface AiPromptRecord {
  id: string;
  type: 'ai_prompt';
  timestamp: string;
  prompt: string;
  response?: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  explanation?: string;
}

export interface MilestoneRecord {
  id: string;
  type: 'milestone';
  timestamp: string;
  title: string;
  description?: string;
  relatedRecordIds?: string[];
}

export interface GitActionRecord {
  id: string;
  type: 'git_action';
  timestamp: string;
  action: string;
  branch?: string;
  commitHash?: string;
  message?: string;
  filesChanged?: string[];
  explanation?: string;
}

export type Record =
  | TerminalCommandRecord
  | ErrorRecord
  | FileSaveRecord
  | FileRenameRecord
  | AiPromptRecord
  | MilestoneRecord
  | GitActionRecord;

export interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  records: Record[];
}

export interface RecordBook {
  version: number;
  codeforge: CodeforgeSettings;
  project: ProjectMetadata;
  environment: EnvironmentInfo;
  recipes: Recipe[];
  glossary: GlossaryEntry[];
  sessions: Session[];
}

// --- Dashboard-specific types ---

export type TabId = 'timeline' | 'recipes' | 'health' | 'glossary';

export interface DashboardState {
  recordBook: RecordBook | null;
  activeTab: TabId;
  searchQuery: string;
  filterType: RecordType | 'all';
  selectedSessionId: string | null;
}

// Message types for webview communication
export type IncomingMessage =
  | { type: 'recordBook'; data: RecordBook }
  | { type: 'update'; data: Partial<RecordBook> }
  | { type: 'ping' };

export type OutgoingMessage =
  | { type: 'ready' }
  | { type: 'export'; format: 'markdown' | 'html' | 'json'; data: string };
