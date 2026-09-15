import { useState, useEffect, useCallback } from 'react';
import type { RecordBook, IncomingMessage, TabId, RecordType } from '../types';

export interface UseRecordBookResult {
  recordBook: RecordBook | null;
  isLoading: boolean;
  error: string | null;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: RecordType | 'all';
  setFilterType: (t: RecordType | 'all') => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  refresh: () => void;
}

function postToHost(message: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  // VS Code webview API
  const vscode = (window as Record<string, unknown>).__vscode;
  if (vscode && typeof vscode === 'object' && 'postMessage' in vscode) {
    (vscode as { postMessage: (msg: Record<string, unknown>) => void }).postMessage(message);
    return;
  }
  // JetBrains JCEF
  if (typeof (window as Record<string, unknown>).JCEF === 'object') {
    (window as Record<string, unknown>).JCEF = message;
    return;
  }
  // Fallback: custom event
  window.dispatchEvent(new CustomEvent('codeforge-message', { detail: message }));
}

export function useRecordBook(): UseRecordBookResult {
  const [recordBook, setRecordBook] = useState<RecordBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleIncomingMessage = useCallback((event: MessageEvent<IncomingMessage> | CustomEvent<IncomingMessage>) => {
    const message = 'detail' in event ? event.detail : event.data;
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
      case 'recordBook':
        setRecordBook(message.data);
        setIsLoading(false);
        setError(null);
        break;
      case 'update':
        setRecordBook(prev => prev ? { ...prev, ...message.data } : prev);
        break;
      case 'ping':
        postToHost({ type: 'ready' });
        break;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for messages from host (VS Code / JetBrains)
    window.addEventListener('message', handleIncomingMessage as EventListener);
    // Also listen for custom events (fallback)
    window.addEventListener('codeforge-message', handleIncomingMessage as EventListener);

    // Signal readiness
    postToHost({ type: 'ready' });

    // Demo data for standalone mode (no host)
    const timer = setTimeout(() => {
      if (!recordBook) {
        setRecordBook(getDemoRecordBook());
        setIsLoading(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleIncomingMessage as EventListener);
      window.removeEventListener('codeforge-message', handleIncomingMessage as EventListener);
      clearTimeout(timer);
    };
  }, [handleIncomingMessage, recordBook]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    postToHost({ type: 'requestRecordBook' });
  }, []);

  return {
    recordBook,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedSessionId,
    setSelectedSessionId,
    refresh,
  };
}

function getDemoRecordBook(): RecordBook {
  return {
    version: 1,
    codeforge: {
      skillLevel: 'intermediate',
      language: 'typescript',
      aiProvider: 'copilot',
      recordTerminal: true,
      recordEditor: true,
      recordAI: true,
      recordGit: true,
      excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
      maxStorageMB: 50,
    },
    project: {
      name: 'CodeForge',
      rootPath: '/home/user/projects/CodeForge',
      detectedType: 'typescript-library',
      detectedToolchain: 'npm + vitest + eslint + prettier',
      firstOpened: '2025-01-15T10:00:00Z',
      lastOpened: new Date().toISOString(),
      totalSessions: 42,
      totalCommandsRecorded: 1337,
    },
    environment: {
      nodeVersion: 'v20.11.0',
      npmVersion: '10.2.4',
      gitVersion: '2.43.0',
      os: 'linux',
      shell: 'zsh',
      vscodeVersion: '1.85.1',
    },
    recipes: [
      {
        id: 'r1',
        name: 'Setup New Package',
        description: 'Initialize a new package in the monorepo with TypeScript and ESLint',
        category: 'scaffolding',
        steps: [
          { order: 1, command: 'npm init -y', description: 'Initialize package.json', recordIds: [] },
          { order: 2, command: 'npm install -D typescript @types/node', description: 'Install TypeScript', recordIds: [] },
          { order: 3, command: 'npx tsc --init', description: 'Generate tsconfig.json', recordIds: [] },
          { order: 4, command: 'npm install -D eslint @typescript-eslint/parser', description: 'Install ESLint', recordIds: [] },
        ],
        derivedFrom: ['session-1', 'session-5'],
        confidence: 0.92,
        createdAt: '2025-02-01T14:30:00Z',
        lastUsed: '2025-03-10T09:00:00Z',
      },
      {
        id: 'r2',
        name: 'Run Full Test Suite',
        description: 'Execute all tests with coverage and generate report',
        category: 'testing',
        steps: [
          { order: 1, command: 'npm run build', description: 'Build the project first', recordIds: [] },
          { order: 2, command: 'npm test -- --coverage', description: 'Run tests with coverage', recordIds: [] },
          { order: 3, command: 'npm run lint', description: 'Run linting', recordIds: [] },
        ],
        derivedFrom: ['session-3', 'session-7', 'session-12'],
        confidence: 0.98,
        createdAt: '2025-01-20T11:00:00Z',
        lastUsed: new Date().toISOString(),
      },
      {
        id: 'r3',
        name: 'Deploy to Production',
        description: 'Build, version bump, and deploy the application',
        category: 'deployment',
        steps: [
          { order: 1, command: 'git pull origin main', description: 'Pull latest changes', recordIds: [] },
          { order: 2, command: 'npm version patch', description: 'Bump version', recordIds: [] },
          { order: 3, command: 'npm run build', description: 'Production build', recordIds: [] },
          { order: 4, command: 'npm run deploy', description: 'Deploy to production', recordIds: [] },
          { order: 5, command: 'git push --tags', description: 'Push version tags', recordIds: [] },
        ],
        derivedFrom: ['session-20'],
        confidence: 0.85,
        createdAt: '2025-02-15T16:00:00Z',
      },
    ],
    glossary: [
      { term: 'RecordBook', definition: 'The central data structure that stores all session recordings, recipes, glossary entries, and project metadata.', context: 'CodeForge Core', category: 'core', relatedTerms: ['Session', 'Record'] },
      { term: 'Session', definition: 'A continuous period of coding activity, containing one or more records of actions taken.', context: 'CodeForge Core', category: 'core', relatedTerms: ['Record', 'RecordBook'] },
      { term: 'Recipe', definition: 'An auto-generated, step-by-step guide derived from repeated terminal command patterns across sessions.', context: 'CodeForge Recipes', category: 'automation', relatedTerms: ['Milestone'] },
      { term: 'Terminal Command Record', definition: 'A captured terminal command with its working directory, exit code, duration, and optional explanation.', context: 'CodeForge Records', category: 'record', relatedTerms: ['Error Record'] },
      { term: 'Error Record', definition: 'A captured error with its message, stack trace, diagnosis, and suggested fix.', context: 'CodeForge Records', category: 'record', relatedTerms: ['Terminal Command Record'] },
      { term: 'Milestone', definition: 'A significant event marker in a session, such as completing a feature or fixing a critical bug.', context: 'CodeForge Records', category: 'record', relatedTerms: ['Session'] },
      { term: 'JCEF', definition: 'Java Chromium Embedded Framework — used by JetBrains IDEs to render web content in tool windows.', context: 'JetBrains Integration', category: 'integration', relatedTerms: ['VS Code Webview'] },
      { term: 'Webview', definition: 'A sandboxed browser context used by VS Code extensions to render custom UI.', context: 'VS Code Integration', category: 'integration', relatedTerms: ['JCEF'] },
    ],
    sessions: [
      {
        id: 'session-1',
        startedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        endedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        records: [
          { id: 'rec-1', type: 'terminal_command', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), command: 'git checkout -b feature/dashboard', exitCode: 0, duration: 1200, explanation: 'Created new feature branch for dashboard development', category: 'git', tags: ['branch'] },
          { id: 'rec-2', type: 'terminal_command', timestamp: new Date(Date.now() - 3600000 * 4.9).toISOString(), command: 'npm install react react-dom @types/react', exitCode: 0, duration: 15000, explanation: 'Installed React and its type definitions', category: 'dependency', tags: ['install'] },
          { id: 'rec-3', type: 'file_save', timestamp: new Date(Date.now() - 3600000 * 4.8).toISOString(), filePath: 'src/components/Dashboard.tsx', language: 'typescript', linesAdded: 45, linesRemoved: 0, explanation: 'Created initial Dashboard component' },
          { id: 'rec-4', type: 'ai_prompt', timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString(), prompt: 'Generate a responsive sidebar component with navigation items', response: 'Here is a responsive sidebar...', provider: 'copilot', model: 'gpt-4', tokensUsed: 520, explanation: 'Used AI to scaffold sidebar component' },
          { id: 'rec-5', type: 'error', timestamp: new Date(Date.now() - 3600000 * 4.2).toISOString(), message: "Module not found: Can't resolve './utils/helpers'", source: 'webpack', diagnosis: 'Missing file due to incorrect import path', fixSuggestion: 'Check import path casing — file is helpers.ts not Helpers.ts', resolved: true },
          { id: 'rec-6', type: 'milestone', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), title: 'Dashboard scaffolding complete', description: 'All base components created and rendering correctly' },
        ],
      },
      {
        id: 'session-2',
        startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        endedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        records: [
          { id: 'rec-7', type: 'terminal_command', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), command: 'npm run test -- --watch', exitCode: 0, duration: 3000, explanation: 'Started test watcher for TDD workflow', category: 'testing', tags: ['test'] },
          { id: 'rec-8', type: 'file_save', timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(), filePath: 'src/components/Dashboard.test.tsx', language: 'typescript', linesAdded: 80, linesRemoved: 0, explanation: 'Added unit tests for Dashboard component' },
          { id: 'rec-9', type: 'git_action', timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), action: 'commit', branch: 'feature/dashboard', commitHash: 'a1b2c3d', message: 'feat: add dashboard component with tests', filesChanged: ['src/components/Dashboard.tsx', 'src/components/Dashboard.test.tsx'], explanation: 'Committed dashboard with full test coverage' },
          { id: 'rec-10', type: 'terminal_command', timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(), command: 'npm run lint -- --fix', exitCode: 0, duration: 4500, explanation: 'Auto-fixed linting issues', category: 'code-quality', tags: ['lint'] },
          { id: 'rec-11', type: 'milestone', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), title: 'First feature branch ready for PR', description: 'Dashboard component complete with tests and passing CI checks' },
        ],
      },
      {
        id: 'session-3',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        records: [
          { id: 'rec-12', type: 'terminal_command', timestamp: new Date(Date.now() - 1800000).toISOString(), command: 'npm run build', exitCode: 0, duration: 8000, explanation: 'Production build of the project', category: 'build', tags: ['build'] },
          { id: 'rec-13', type: 'error', timestamp: new Date(Date.now() - 1500000).toISOString(), message: 'Type error: Property "theme" does not exist on type "ThemeContext"', source: 'typescript', stack: 'at Dashboard.tsx:24:5', diagnosis: 'ThemeContext type definition is missing the theme property', fixSuggestion: 'Add theme property to ThemeContext interface', resolved: false },
          { id: 'rec-14', type: 'file_save', timestamp: new Date(Date.now() - 1200000).toISOString(), filePath: 'src/context/ThemeContext.ts', language: 'typescript', linesAdded: 3, linesRemoved: 1, explanation: 'Fixed ThemeContext type definition' },
          { id: 'rec-15', type: 'terminal_command', timestamp: new Date(Date.now() - 900000).toISOString(), command: 'npm run build', exitCode: 0, duration: 8200, explanation: 'Build succeeded after fix', category: 'build', tags: ['build'] },
        ],
      },
    ],
  };
}
