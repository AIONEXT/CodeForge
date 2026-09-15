import React from 'react';
import type { EnvironmentInfo, ProjectMetadata } from '../types';

interface ProjectHealthProps {
  environment: EnvironmentInfo;
  project: ProjectMetadata;
}

function formatVersion(version: string | undefined): string {
  if (!version) return '—';
  return version.startsWith('v') ? version : `v${version}`;
}

interface HealthItemProps {
  label: string;
  value: string | undefined;
  icon: React.ReactNode;
}

const HealthItem: React.FC<HealthItemProps> = ({ label, value, icon }) => (
  <div className={`health__item ${value ? 'health__item--ok' : 'health__item--missing'}`}>
    <div className="health__item-icon">{icon}</div>
    <div className="health__item-info">
      <span className="health__item-label">{label}</span>
      <span className="health__item-value">{formatVersion(value)}</span>
    </div>
    <div className={`health__item-status ${value ? 'health__item-status--ok' : 'health__item-status--missing'}`}>
      {value ? 'installed' : 'not detected'}
    </div>
  </div>
);

export const ProjectHealth: React.FC<ProjectHealthProps> = ({ environment, project }) => {
  const allEntries = Object.entries(environment);
  const detectedCount = allEntries.filter(([, v]) => v !== undefined).length;

  return (
    <div className="health">
      <div className="health__section">
        <h3 className="health__section-title">Project Overview</h3>
        <div className="health__project">
          <div className="health__project-row">
            <span className="health__project-label">Name</span>
            <span className="health__project-value">{project.name}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Type</span>
            <span className="health__project-value">{project.detectedType}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Toolchain</span>
            <span className="health__project-value">{project.detectedToolchain}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Root Path</span>
            <span className="health__project-value health__project-value--path">{project.rootPath}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Total Sessions</span>
            <span className="health__project-value">{project.totalSessions}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Commands Recorded</span>
            <span className="health__project-value">{project.totalCommandsRecorded.toLocaleString()}</span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">First Opened</span>
            <span className="health__project-value">
              {new Date(project.firstOpened).toLocaleDateString()}
            </span>
          </div>
          <div className="health__project-row">
            <span className="health__project-label">Last Opened</span>
            <span className="health__project-value">
              {new Date(project.lastOpened).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="health__section">
        <h3 className="health__section-title">
          Environment
          <span className="health__detection-badge">
            {detectedCount}/{allEntries.length} detected
          </span>
        </h3>

        <div className="health__grid">
          <HealthItem
            label="Node.js"
            value={environment.nodeVersion}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#3fb950">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z"/>
                <path d="M8 3l4 3.5H4L8 3z"/>
              </svg>
            }
          />
          <HealthItem
            label="npm"
            value={environment.npmVersion}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#f85149">
                <path d="M1.5 0h13A1.5 1.5 0 0116 1.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 14.5v-13A1.5 1.5 0 011.5 0zM4 11V5h2v6H4zm4 0V5h2v6H8zm4 0V7h-1v4h-1V7h-1v4h-1V5h4v6z"/>
              </svg>
            }
          />
          <HealthItem
            label="Python"
            value={environment.pythonVersion}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#58a6ff">
                <path d="M8 0C3.58 0 3.55 1.98 3.55 1.98v1.94h4.52v.59H2.26S0 4.08 0 7.94s2.1 3.8 2.1 3.8h1.26v-1.82s-.07-2.1 2.08-2.1h3.59s2.02 0 2.02-1.95V1.98S12.45 0 8 0zM5.82 1.15a.76.76 0 110 1.52.76.76 0 010-1.52z"/>
                <path d="M8 16c4.42 0 4.45-1.98 4.45-1.98v-1.94H7.93v-.59h5.81S16 11.92 16 8.06s-2.1-3.8-2.1-3.8h-1.26v1.82s.07 2.1-2.08 2.1H6.87s-2.02 0-2.02 1.95v3.02S3.55 16 8 16zm2.18-1.15a.76.76 0 110-1.52.76.76 0 010 1.52z"/>
              </svg>
            }
          />
          <HealthItem
            label="Git"
            value={environment.gitVersion}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#d2a8ff">
                <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
              </svg>
            }
          />
          <HealthItem
            label="VS Code"
            value={environment.vscodeVersion}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#58a6ff">
                <path d="M14.1 1.5H7.3l-4 3.5v6l4 3.5h6.8a.5.5 0 00.5-.5V2a.5.5 0 00-.5-.5zM7.5 4.2l2.8 2.3-2.8 2.3V4.2zm0 5.6l2.8-2.3 1.3 1.1-1.3 1.2v0zM4.4 5l2.6 2.3L4.4 9.6V5zm8.2 6.5H7.5v-2.3l2.8-2.3 2.3 2v2.6z"/>
              </svg>
            }
          />
          <HealthItem
            label="Shell"
            value={environment.shell}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#79c0ff">
                <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM4.75 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 014.75 4zm4 0a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018.75 4zm-4 4a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 014.75 8z"/>
              </svg>
            }
          />
          <HealthItem
            label="OS"
            value={environment.os}
            icon={
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#d29922">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z"/>
                <circle cx="8" cy="8" r="2"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
};
