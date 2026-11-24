import React, { useState } from 'react';
import type { SebSettings, PermittedProcess } from '../../types';
import {
  IconAlert,
  IconCalculator,
  IconCheck,
  IconCode,
  IconFileText,
  IconLock,
  IconMonitor,
  IconPlus,
  IconTable,
  IconTerminal,
  IconX,
} from '../ui/Icons';

type AppIconKey = 'code' | 'doc' | 'sheet' | 'ide' | 'python' | 'notes' | 'calc';

function renderPresetIcon(iconKey: AppIconKey) {
  switch (iconKey) {
    case 'code':
      return <IconCode size={16} />;
    case 'doc':
      return <IconFileText size={16} />;
    case 'sheet':
      return <IconTable size={16} />;
    case 'ide':
    case 'python':
      return <IconTerminal size={16} />;
    case 'notes':
      return <IconFileText size={16} />;
    case 'calc':
      return <IconCalculator size={16} />;
  }
}

export const APP_PRESETS: Array<{
  title: string;
  executable: string;
  path: string;
  category: string;
  iconKey: AppIconKey;
}> = [
  {
    title: 'VS Code',
    executable: 'Code.exe',
    path: '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\',
    category: 'Development',
    iconKey: 'code',
  },
  {
    title: 'Word',
    executable: 'WINWORD.EXE',
    path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\',
    category: 'Office',
    iconKey: 'doc',
  },
  {
    title: 'Excel',
    executable: 'EXCEL.EXE',
    path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\',
    category: 'Office',
    iconKey: 'sheet',
  },
  {
    title: 'IntelliJ IDEA',
    executable: 'idea64.exe',
    path: 'C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\',
    category: 'Development',
    iconKey: 'ide',
  },
  {
    title: 'PyCharm',
    executable: 'pycharm64.exe',
    path: 'C:\\Program Files\\JetBrains\\PyCharm\\bin\\',
    category: 'Development',
    iconKey: 'python',
  },
  {
    title: 'Notepad',
    executable: 'notepad.exe',
    path: 'C:\\Windows\\System32\\',
    category: 'Utilities',
    iconKey: 'notes',
  },
  {
    title: 'Calculator',
    executable: 'calc.exe',
    path: 'C:\\Windows\\System32\\',
    category: 'Utilities',
    iconKey: 'calc',
  },
];

interface SebSettingsConfigProps {
  sebSettings: SebSettings;
  allowFileUpload: boolean;
  onChangeSettings: (settings: SebSettings) => void;
  onChangeFileUpload: (allow: boolean) => void;
  disabled?: boolean;
}

export function SebSettingsConfig({
  sebSettings,
  allowFileUpload,
  onChangeSettings,
  onChangeFileUpload,
  disabled = false,
}: SebSettingsConfigProps) {
  const [customTitle, setCustomTitle] = useState('');
  const [customExe, setCustomExe] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [customError, setCustomError] = useState('');

  const permitted = sebSettings.permittedProcesses ?? [];
  const allowedDisplays = sebSettings.allowedDisplays ?? 1;
  const internalDisplayOnly = sebSettings.internalDisplayOnly ?? true;
  const allowSpellCheck = sebSettings.allowSpellCheck ?? false;
  const allowDictionaryLookup = sebSettings.allowDictionaryLookup ?? false;

  const isPresetActive = (exe: string) =>
    permitted.some((p) => p.executable.toLowerCase() === exe.toLowerCase());

  const togglePreset = (preset: (typeof APP_PRESETS)[0]) => {
    if (disabled) return;
    const exists = isPresetActive(preset.executable);
    let next: PermittedProcess[];

    if (exists) {
      next = permitted.filter(
        (p) => p.executable.toLowerCase() !== preset.executable.toLowerCase(),
      );
    } else {
      next = [
        ...permitted,
        {
          executable: preset.executable,
          path: preset.path,
          title: preset.title,
          allowUserToChooseApp: true,
          autostart: true,
          os: 1, // 1 = Windows in Safe Exam Browser
        },
      ];
      if (!allowFileUpload) {
        onChangeFileUpload(true);
      }
    }
    onChangeSettings({
      ...sebSettings,
      permittedProcesses: next,
    });
  };

  const removeProcess = (executable: string) => {
    if (disabled) return;
    const next = permitted.filter(
      (p) => p.executable.toLowerCase() !== executable.toLowerCase(),
    );
    onChangeSettings({
      ...sebSettings,
      permittedProcesses: next,
    });
  };

  const updateProcessPath = (executable: string, newPath: string) => {
    if (disabled) return;
    const next = permitted.map((p) =>
      p.executable.toLowerCase() === executable.toLowerCase()
        ? { ...p, path: newPath }
        : p,
    );
    onChangeSettings({
      ...sebSettings,
      permittedProcesses: next,
    });
  };

  const addCustomProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setCustomError('');

    const cleanTitle = customTitle.trim();
    let cleanExe = customExe.trim();
    const cleanPath = customPath.trim();

    if (!cleanExe) {
      setCustomError('Executable name is required (e.g., Code.exe)');
      return;
    }

    if (!cleanExe.includes('.')) {
      cleanExe += '.exe';
    }

    if (isPresetActive(cleanExe)) {
      setCustomError(`${cleanExe} is already enabled`);
      return;
    }

    const next: PermittedProcess[] = [
      ...permitted,
      {
        executable: cleanExe,
        path: cleanPath || undefined,
        title: cleanTitle || cleanExe,
        allowUserToChooseApp: true,
        autostart: true,
        os: 1,
      },
    ];

    onChangeSettings({
      ...sebSettings,
      permittedProcesses: next,
    });

    if (!allowFileUpload) {
      onChangeFileUpload(true);
    }

    setCustomTitle('');
    setCustomExe('');
    setCustomPath('');
  };

  const setDisplayPolicy = (single: boolean) => {
    if (disabled) return;
    onChangeSettings({
      ...sebSettings,
      allowedDisplays: single ? 1 : 2,
      internalDisplayOnly: single,
    });
  };

  return (
    <div className="seb-config-stack">
      {/* 1. External Applications */}
      <div className="seb-config-group">
        <div className="seb-group-header">
          <div>
            <h4 className="seb-group-title">Permitted Applications</h4>
            <p className="seb-group-desc">
              Select local applications students may launch alongside Safe Exam Browser.
            </p>
          </div>
          {permitted.length > 0 && (
            <span className="status-pill status-pill--highlight">
              {permitted.length} Selected
            </span>
          )}
        </div>

        <div className="seb-presets-grid">
          {APP_PRESETS.map((preset) => {
            const active = isPresetActive(preset.executable);
            return (
              <button
                key={preset.executable}
                type="button"
                disabled={disabled}
                onClick={() => togglePreset(preset)}
                className={`seb-preset-tile ${active ? 'is-selected' : ''}`}
              >
                <span className={`seb-preset-icon ${active ? 'is-selected' : ''}`}>
                  {renderPresetIcon(preset.iconKey)}
                </span>
                <div className="seb-preset-meta">
                  <span className="seb-preset-name">{preset.title}</span>
                  <span className="seb-preset-exe">{preset.executable}</span>
                </div>
                <span className={`seb-preset-check ${active ? 'is-selected' : ''}`}>
                  {active ? <IconCheck size={12} /> : <IconPlus size={12} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Application Entry */}
        <div className="seb-custom-box">
          <div className="seb-custom-row">
            <input
              type="text"
              placeholder="Display title (e.g. Dev-C++)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={disabled}
              className="form-input seb-custom-input"
            />
            <input
              type="text"
              placeholder="Executable (e.g. devcpp.exe)"
              value={customExe}
              onChange={(e) => setCustomExe(e.target.value)}
              disabled={disabled}
              className="form-input seb-custom-input"
            />
            <input
              type="text"
              placeholder="Install path (optional)"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              disabled={disabled}
              className="form-input seb-custom-input"
            />
            <button
              type="button"
              disabled={disabled || !customExe.trim()}
              onClick={addCustomProcess}
              className="button button--secondary button--sm"
            >
              <IconPlus size={14} />
              <span>Add</span>
            </button>
          </div>
          {customError && (
            <p className="seb-error-inline">
              <IconAlert size={13} />
              <span>{customError}</span>
            </p>
          )}
        </div>

        {/* Active process overrides */}
        {permitted.length > 0 && (
          <div className="seb-active-list">
            {permitted.map((p) => (
              <div key={p.executable} className="seb-active-row">
                <span className="seb-active-title">{p.title || p.executable}</span>
                <code className="seb-active-code">{p.executable}</code>
                <input
                  type="text"
                  value={p.path ?? ''}
                  disabled={disabled}
                  placeholder="Executable folder path..."
                  onChange={(e) => updateProcessPath(p.executable, e.target.value)}
                  className="seb-active-path"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeProcess(p.executable)}
                    className="seb-remove-btn"
                    title="Remove application"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. File Upload Permission */}
      <label className={`seb-toggle-card ${allowFileUpload ? 'is-selected' : ''}`}>
        <div className="seb-toggle-text">
          <span className="seb-toggle-title">Allow Student File Uploads</span>
          <span className="seb-toggle-desc">
            Permits examinees to browse and attach project files, documents, or archives (.py, .docx, .xlsx, .zip) inside Safe Exam Browser.
          </span>
        </div>
        <span className="apple-switch">
          <input
            type="checkbox"
            checked={allowFileUpload}
            disabled={disabled}
            onChange={(e) => onChangeFileUpload(e.target.checked)}
          />
          <span className="apple-switch-track" />
        </span>
      </label>

      {/* 3. Screen Policy */}
      <div className="seb-config-group">
        <h4 className="seb-group-title" style={{ marginBottom: '0.5rem' }}>
          Display Policy
        </h4>
        <div className="seb-two-col">
          <label
            className={`option-card ${
              allowedDisplays === 1 && internalDisplayOnly ? 'option-card-selected' : ''
            }`}
          >
            <div className="option-card-top">
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays === 1 && internalDisplayOnly}
                onChange={() => setDisplayPolicy(true)}
              />
              <IconLock size={15} className="option-card-icon" />
              <span className="option-card-label">Single Screen</span>
            </div>
            <p className="option-card-desc">
              Restricts session to the built-in display and blocks external monitors.
            </p>
          </label>

          <label
            className={`option-card ${
              allowedDisplays > 1 || !internalDisplayOnly ? 'option-card-selected' : ''
            }`}
          >
            <div className="option-card-top">
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays > 1 || !internalDisplayOnly}
                onChange={() => setDisplayPolicy(false)}
              />
              <IconMonitor size={15} className="option-card-icon" />
              <span className="option-card-label">Dual Monitors</span>
            </div>
            <p className="option-card-desc">
              Allows a secondary display for reference code or documentation viewing.
            </p>
          </label>
        </div>
      </div>

      {/* 4. Assistance Tools */}
      <div className="seb-two-col">
        <label className={`seb-toggle-card ${allowSpellCheck ? 'is-selected' : ''}`}>
          <span className="seb-toggle-title" style={{ fontSize: '0.84rem' }}>
            Spell Check in Essays
          </span>
          <span className="apple-switch">
            <input
              type="checkbox"
              disabled={disabled}
              checked={allowSpellCheck}
              onChange={(e) =>
                onChangeSettings({ ...sebSettings, allowSpellCheck: e.target.checked })
              }
            />
            <span className="apple-switch-track" />
          </span>
        </label>

        <label className={`seb-toggle-card ${allowDictionaryLookup ? 'is-selected' : ''}`}>
          <span className="seb-toggle-title" style={{ fontSize: '0.84rem' }}>
            Dictionary Lookup
          </span>
          <span className="apple-switch">
            <input
              type="checkbox"
              disabled={disabled}
              checked={allowDictionaryLookup}
              onChange={(e) =>
                onChangeSettings({ ...sebSettings, allowDictionaryLookup: e.target.checked })
              }
            />
            <span className="apple-switch-track" />
          </span>
        </label>
      </div>
    </div>
  );
}
