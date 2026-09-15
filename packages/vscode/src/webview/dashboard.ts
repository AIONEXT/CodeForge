// =============================================================================
// @codeforge/vscode — Dashboard Webview Provider
// Provides the Recall Dashboard as a webview panel and sidebar view
// =============================================================================

import * as vscode from "vscode";
import * as path from "node:path";
import { CodeForgeRecorder, RecordBook } from "@codeforge/core";

/**
 * Dashboard webview provider for both the sidebar and the panel.
 */
export class DashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codeforge.dashboard";
  private view?: vscode.WebviewView;
  private panel?: vscode.WebviewPanel;
  private recorder: CodeForgeRecorder;

  constructor(private readonly extensionUri: vscode.Uri, recorder: CodeForgeRecorder) {
    this.recorder = recorder;
  }

  /**
   * Called when the sidebar view is created.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHTML();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
  }

  /**
   * Open the dashboard as a panel (from command).
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "codeforgeDashboard",
      "CodeForge Recall Dashboard",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panel.webview.html = this.getHTML();

    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * Handle messages from the webview.
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case "search":
        const results = this.recorder.search({
          text: message.query,
          limit: 50,
        });
        this.postMessage({ type: "searchResults", results });
        break;

      case "loadRecordBook":
        this.refreshData();
        break;

      case "export":
        const output = this.recorder.export({
          format: message.format,
          includeExplanations: true,
          includeOutputs: true,
          includeErrors: true,
        });
        this.postMessage({ type: "exportData", data: output, format: message.format });
        break;

      case "explainCommand":
        const { explainCommand } = require("@codeforge/core");
        const explanation = explainCommand(message.command);
        this.postMessage({ type: "explanation", command: message.command, explanation });
        break;
    }
  }

  /**
   * Refresh the dashboard data.
   */
  refreshData(): void {
    // Load the recordbook
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const { readRecordBook } = require("@codeforge/core");
    const recordBook: RecordBook | null = readRecordBook(workspaceRoot);

    if (recordBook) {
      this.postMessage({ type: "recordBook", data: recordBook });
    }
  }

  /**
   * Send a message to the webview.
   */
  private postMessage(message: any): void {
    this.view?.webview.postMessage(message);
    this.panel?.webview.postMessage(message);
  }

  /**
   * Generate the HTML for the dashboard webview.
   */
  private getHTML(): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>CodeForge Recall Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #f78166; font-size: 24px; margin-bottom: 5px; }
    .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 20px; }
    .search-box { width: 100%; padding: 12px 16px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; color: #e6edf3; font-size: 15px; margin-bottom: 20px; }
    .search-box:focus { border-color: #f78166; outline: none; }
    .session-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .session-date { color: #f78166; font-weight: 600; }
    .session-stats { display: flex; gap: 12px; }
    .stat { font-size: 13px; color: #8b949e; }
    .stat strong { color: #e6edf3; }
    .timeline { margin-top: 10px; }
    .record { padding: 8px 12px; border-left: 3px solid #30363d; margin-bottom: 6px; border-radius: 0 6px 6px 0; background: #0d1117; }
    .record.command { border-left-color: #58a6ff; }
    .record.error { border-left-color: #f85149; }
    .record.file { border-left-color: #3fb950; }
    .record.ai { border-left-color: #a371f7; }
    .record.milestone { border-left-color: #f78166; }
    .record.git { border-left-color: #d2a8ff; }
    .record-time { font-size: 11px; color: #8b949e; }
    .record-label { font-size: 14px; margin-top: 2px; }
    .record-explanation { font-size: 12px; color: #8b949e; margin-top: 4px; font-style: italic; }
    .record-command { font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #79c0ff; }
    .record-error-msg { font-size: 13px; color: #f85149; }
    .empty-state { text-align: center; padding: 60px 20px; color: #8b949e; }
    .empty-state h2 { color: #e6edf3; margin-bottom: 10px; }
    .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #30363d; background: #21262d; color: #e6edf3; cursor: pointer; font-size: 13px; }
    .btn:hover { background: #30363d; }
    .btn-primary { background: #f78166; color: #0d1117; border-color: #f78166; }
    .btn-primary:hover { background: #ff9a76; }
    .actions { display: flex; gap: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CodeForge Recall</h1>
    <div class="subtitle">Your project command history and learning record</div>
    
    <input type="text" class="search-box" placeholder="Search commands, errors, prompts..." id="search" />
    
    <div class="actions">
      <button class="btn" onclick="refresh()">Refresh</button>
      <button class="btn" onclick="exportAs('markdown')">Export MD</button>
      <button class="btn" onclick="exportAs('html')">Export HTML</button>
    </div>

    <div id="content">
      <div class="empty-state">
        <h2>No Data Yet</h2>
        <p>Start using the terminal and CodeForge will record your commands automatically.</p>
        <p style="margin-top: 10px;">Open a project folder to begin.</p>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let recordBook = null;

    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.length > 0) {
        vscode.postMessage({ type: 'search', query });
      } else {
        renderRecordBook(recordBook);
      }
    });

    function refresh() {
      vscode.postMessage({ type: 'loadRecordBook' });
    }

    function exportAs(format) {
      vscode.postMessage({ type: 'export', format });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'recordBook':
          recordBook = message.data;
          renderRecordBook(recordBook);
          break;
        case 'searchResults':
          renderSearchResults(message.results);
          break;
        case 'explanation':
          alert(message.explanation);
          break;
      }
    });

    function renderRecordBook(rb) {
      const content = document.getElementById('content');
      if (!rb || !rb.sessions || rb.sessions.length === 0) {
        content.innerHTML = '<div class="empty-state"><h2>No Data Yet</h2><p>Start using the terminal and CodeForge will record your commands automatically.</p></div>';
        return;
      }

      let html = '';
      const sessions = [...rb.sessions].reverse();
      
      for (const session of sessions) {
        const date = new Date(session.startedAt).toLocaleString();
        html += '<div class="session-card">';
        html += '<div class="session-header">';
        html += '<span class="session-date">' + date + '</span>';
        html += '<div class="session-stats">';
        html += '<span class="stat"><strong>' + session.summary.commandsRun + '</strong> commands</span>';
        html += '<span class="stat"><strong>' + session.summary.errorsHit + '</strong> errors</span>';
        html += '<span class="stat"><strong>' + session.summary.filesModified + '</strong> files</span>';
        html += '<span class="stat">' + session.summary.duration + '</span>';
        html += '</div></div>';
        
        html += '<div class="timeline">';
        const records = [...session.records].reverse().slice(0, 50);
        for (const record of records) {
          const time = new Date(record.timestamp).toLocaleTimeString();
          const cls = getRecordClass(record.type);
          const content = getRecordContent(record);
          
          html += '<div class="record ' + cls + '">';
          html += '<div class="record-time">' + time + '</div>';
          html += '<div class="record-label">' + content.label + '</div>';
          if (content.explanation) {
            html += '<div class="record-explanation">' + content.explanation + '</div>';
          }
          html += '</div>';
        }
        html += '</div></div>';
      }

      content.innerHTML = html;
    }

    function renderSearchResults(results) {
      const content = document.getElementById('content');
      if (results.length === 0) {
        content.innerHTML = '<div class="empty-state"><h2>No Results</h2><p>Try a different search query.</p></div>';
        return;
      }

      let html = '';
      for (const r of results) {
        const record = r.record;
        const time = new Date(record.timestamp).toLocaleString();
        const cls = getRecordClass(record.type);
        const content = getRecordContent(record);
        
        html += '<div class="record ' + cls + '">';
        html += '<div class="record-time">' + time + '</div>';
        html += '<div class="record-label">' + content.label + '</div>';
        if (content.explanation) {
          html += '<div class="record-explanation">' + content.explanation + '</div>';
        }
        html += '</div>';
      }

      content.innerHTML = html;
    }

    function getRecordClass(type) {
      switch (type) {
        case 'terminal_command': return 'command';
        case 'error': return 'error';
        case 'file_save':
        case 'file_rename': return 'file';
        case 'ai_prompt': return 'ai';
        case 'milestone': return 'milestone';
        case 'git_action': return 'git';
        default: return '';
      }
    }

    function getRecordContent(record) {
      switch (record.type) {
        case 'terminal_command':
          return {
            label: '<span class="record-command">$ ' + escapeHtml(record.command) + '</span>',
            explanation: record.explanation
          };
        case 'error':
          return {
            label: '<span class="record-error-msg">✗ ' + escapeHtml(record.error) + '</span>',
            explanation: record.diagnosis
          };
        case 'file_save':
          return { label: '📄 ' + record.fileName, explanation: record.path };
        case 'file_rename':
          return { label: '📝 ' + record.oldName + ' → ' + record.newName, explanation: '' };
        case 'ai_prompt':
          return { label: '✨ ' + escapeHtml(record.prompt.slice(0, 80)), explanation: 'via ' + record.source };
        case 'milestone':
          return { label: '⭐ ' + record.label, explanation: record.explanation };
        case 'git_action':
          return { label: '🔀 git ' + record.action, explanation: record.explanation };
        default:
          return { label: record.type, explanation: '' };
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Request initial data
    refresh();
  </script>
</body>
</html>`;
  }
}

/**
 * Generate a nonce for CSP.
 */
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
