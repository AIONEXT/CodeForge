import React, { useState, useRef, useEffect } from 'react';
import type { RecordBook, Session, Record as CodeforgeRecord } from '../types';

interface ExportButtonProps {
  recordBook: RecordBook;
}

function generateMarkdown(rb: RecordBook): string {
  const lines: string[] = [];
  lines.push(`# ${rb.project.name} — CodeForge Session Report`);
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Project: ${rb.project.name} (${rb.project.detectedType})`);
  lines.push(`Toolchain: ${rb.project.detectedToolchain}`);
  lines.push(`Total Sessions: ${rb.project.totalSessions}`);
  lines.push(`Total Commands: ${rb.project.totalCommandsRecorded.toLocaleString()}`);
  lines.push('');

  for (const session of rb.sessions) {
    lines.push(`---`);
    lines.push(`## Session: ${new Date(session.startedAt).toLocaleString()}`);
    if (session.endedAt) {
      lines.push(`Duration: ${Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)} minutes`);
    }
    lines.push('');

    for (const record of session.records) {
      lines.push(formatRecordMd(record));
    }
  }

  if (rb.recipes.length > 0) {
    lines.push('---');
    lines.push('## Recipes');
    lines.push('');
    for (const recipe of rb.recipes) {
      lines.push(`### ${recipe.name}`);
      lines.push(`${recipe.description}`);
      lines.push(`Confidence: ${Math.round(recipe.confidence * 100)}%`);
      lines.push('');
      for (const step of recipe.steps) {
        lines.push(`${step.order}. \`${step.command}\` — ${step.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatRecordMd(record: Record): string {
  const time = new Date(record.timestamp).toLocaleTimeString();
  switch (record.type) {
    case 'terminal_command':
      return `- **[${time}] Command:** \`${record.command}\`${record.explanation ? ` — ${record.explanation}` : ''}\n`;
    case 'error':
      return `- **[${time}] Error:** ${record.message}${record.diagnosis ? ` — ${record.diagnosis}` : ''}\n`;
    case 'file_save':
      return `- **[${time}] File Save:** \`${record.filePath}\`${record.explanation ? ` — ${record.explanation}` : ''}\n`;
    case 'file_rename':
      return `- **[${time}] Rename:** \`${record.oldPath}\` → \`${record.newPath}\`\n`;
    case 'ai_prompt':
      return `- **[${time}] AI Prompt:** ${record.prompt.slice(0, 100)}${record.prompt.length > 100 ? '...' : ''}\n`;
    case 'milestone':
      return `- **[${time}] Milestone:** ${record.title}${record.description ? ` — ${record.description}` : ''}\n`;
    case 'git_action':
      return `- **[${time}] Git:** ${record.action}${record.message ? ` — ${record.message}` : ''}\n`;
    default:
      return '';
  }
}

function generateHtml(rb: RecordBook): string {
  const md = generateMarkdown(rb);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${rb.project.name} — CodeForge Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #0d1117; color: #c9d1d9; padding: 2rem; line-height: 1.6; }
    h1, h2, h3 { color: #f0f6fc; }
    code { background: #161b22; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
    pre { background: #161b22; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    hr { border: 0; border-top: 1px solid #21262d; margin: 2rem 0; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
<pre>${escapeHtml(md)}</pre>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const ExportButton: React.FC<ExportButtonProps> = ({ recordBook }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const download = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleExport = (format: 'markdown' | 'html' | 'json') => {
    const name = recordBook.project.name.toLowerCase().replace(/\s+/g, '-');
    switch (format) {
      case 'markdown':
        download(generateMarkdown(recordBook), `${name}-report.md`, 'text/markdown');
        break;
      case 'html':
        download(generateHtml(recordBook), `${name}-report.html`, 'text/html');
        break;
      case 'json':
        download(JSON.stringify(recordBook, null, 2), `${name}-recordbook.json`, 'application/json');
        break;
    }
  };

  return (
    <div className="export" ref={menuRef}>
      <button
        className="export__btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75z"/>
          <path d="M7.25 7.689V2a.75.75 0 011.5 0v5.689l1.97-1.969a.749.749 0 111.06 1.06l-3.25 3.25a.749.749 0 01-1.06 0L4.22 6.78a.749.749 0 111.06-1.06l1.97 1.969z"/>
        </svg>
        Export
        <svg className={`export__chevron ${isOpen ? 'export__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="export__menu" role="menu">
          <button className="export__menu-item" onClick={() => handleExport('markdown')} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14.85 3c.63 0 1.15.52 1.15 1.15v7.7c0 .63-.52 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.85V4.15C0 3.52.52 3 1.15 3h13.7zM9 11V5H7l-2 3 2 3h2zm4 0V5h-2l-2 3 2 3h2z"/>
            </svg>
            <div>
              <span className="export__menu-label">Markdown</span>
              <span className="export__menu-desc">.md file</span>
            </div>
          </button>
          <button className="export__menu-item" onClick={() => handleExport('html')} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"/>
            </svg>
            <div>
              <span className="export__menu-label">HTML</span>
              <span className="export__menu-desc">styled report</span>
            </div>
          </button>
          <button className="export__menu-item" onClick={() => handleExport('json')} role="menuitem">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 1.75a.25.25 0 01.25-.25h3.168a.75.75 0 01.53.22l2.872 2.872a.75.75 0 01.22.53v8.128a.25.25 0 01-.25.25h-6.5a.25.25 0 01-.25-.25V1.75z"/>
            </svg>
            <div>
              <span className="export__menu-label">JSON</span>
              <span className="export__menu-desc">raw data</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
