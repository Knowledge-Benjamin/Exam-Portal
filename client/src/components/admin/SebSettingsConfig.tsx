import React, { useState } from 'react';
import type { SebSettings, PermittedProcess } from '../../types';

export const APP_PRESETS: Array<{
  title: string;
  executable: string;
  category: string;
  icon: string;
  description: string;
}> = [
  {
    title: 'Visual Studio Code',
    executable: 'Code.exe',
    category: 'Development',
    icon: '💻',
    description: 'Code editor for Python, JavaScript, C++, Web, etc.',
  },
  {
    title: 'Microsoft Word',
    executable: 'WINWORD.EXE',
    category: 'Office',
    icon: '📝',
    description: 'Word processor for essays, structured documents, reports',
  },
  {
    title: 'Microsoft Excel',
    executable: 'EXCEL.EXE',
    category: 'Office',
    icon: '📊',
    description: 'Spreadsheet for accounting, finance, statistics, data',
  },
  {
    title: 'IntelliJ IDEA',
    executable: 'idea64.exe',
    category: 'Development',
    icon: '☕',
    description: 'Java & Kotlin development IDE',
  },
  {
    title: 'PyCharm',
    executable: 'pycharm64.exe',
    category: 'Development',
    icon: '🐍',
    description: 'Python IDE for programming & data science',
  },
  {
    title: 'Notepad',
    executable: 'notepad.exe',
    category: 'Utilities',
    icon: '📄',
    description: 'Lightweight plain text scratchpad',
  },
  {
    title: 'Windows Calculator',
    executable: 'calc.exe',
    category: 'Utilities',
    icon: '🧮',
    description: 'Calculator for quantitative & math questions',
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
  const [customError, setCustomError] = useState('');

  const permitted = sebSettings.permittedProcesses ?? [];
  const allowedDisplays = sebSettings.allowedDisplays ?? 1;
  const internalDisplayOnly = sebSettings.internalDisplayOnly ?? true;
  const allowSpellCheck = sebSettings.allowSpellCheck ?? false;
  const allowDictionaryLookup = sebSettings.allowDictionaryLookup ?? false;

  const isPresetActive = (exe: string) =>
    permitted.some((p) => p.executable.toLowerCase() === exe.toLowerCase());

  const togglePreset = (preset: typeof APP_PRESETS[0]) => {
    if (disabled) return;
    const exists = isPresetActive(preset.executable);
    let next: PermittedProcess[];
    if (exists) {
      next = permitted.filter(
        (p) => p.executable.toLowerCase() !== preset.executable.toLowerCase()
      );
    } else {
      next = [
        ...permitted,
        {
          executable: preset.executable,
          title: preset.title,
          allowUserToChooseApp: true,
          os: 0,
        },
      ];
      // Automatically recommend file upload when an IDE or Office app is selected
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
      (p) => p.executable.toLowerCase() !== executable.toLowerCase()
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

    if (!cleanExe) {
      setCustomError('Executable name is required (e.g., Code.exe or devcpp.exe)');
      return;
    }

    if (!cleanExe.includes('.')) {
      cleanExe += '.exe';
    }

    if (isPresetActive(cleanExe)) {
      setCustomError(`${cleanExe} is already in the permitted list`);
      return;
    }

    const next: PermittedProcess[] = [
      ...permitted,
      {
        executable: cleanExe,
        title: cleanTitle || cleanExe,
        allowUserToChooseApp: true,
        os: 0,
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
  };

  const setDisplayPolicy = (single: boolean) => {
    if (disabled) return;
    if (single) {
      onChangeSettings({
        ...sebSettings,
        allowedDisplays: 1,
        internalDisplayOnly: true,
      });
    } else {
      onChangeSettings({
        ...sebSettings,
        allowedDisplays: 2,
        internalDisplayOnly: false,
      });
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* ── 1. External Applications (VS Code, Word, Excel, IDEs) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
              Permitted External Applications (Whitelisted Software)
            </h4>
            <p className="panel-subtitle" style={{ margin: '0.25rem 0 0' }}>
              Select external software students are permitted to use during this exam (e.g. VS Code for programming, MS Word for reports). Safe Exam Browser embeds these in the student's taskbar.
            </p>
          </div>
          {permitted.length > 0 && (
            <span className="status-pill status-pill--info" style={{ whiteSpace: 'nowrap' }}>
              {permitted.length} Allowed
            </span>
          )}
        </div>

        {/* Presets Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '0.65rem',
            marginTop: '0.75rem',
          }}
        >
          {APP_PRESETS.map((preset) => {
            const active = isPresetActive(preset.executable);
            return (
              <button
                key={preset.executable}
                type="button"
                disabled={disabled}
                onClick={() => togglePreset(preset)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.65rem',
                  border: active
                    ? '1.5px solid #38bdf8'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: active
                    ? 'rgba(56, 189, 248, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{preset.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: active ? '#7dd3fc' : '#f1f5f9' }}>
                      {preset.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: active ? '#0284c7' : 'rgba(255,255,255,0.08)',
                        color: active ? '#fff' : '#94a3b8',
                      }}
                    >
                      {active ? '✓ Enabled' : '+ Add'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                    <code>{preset.executable}</code> · {preset.category}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Application Form */}
        <div
          style={{
            marginTop: '0.9rem',
            padding: '0.85rem',
            borderRadius: '0.65rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500 }}>
            + Add Custom Software / IDE
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Application Title (e.g. Eclipse IDE)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={disabled}
              className="form-input"
              style={{ flex: '1 1 180px', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            />
            <input
              type="text"
              placeholder="Executable (e.g. eclipse.exe)"
              value={customExe}
              onChange={(e) => setCustomExe(e.target.value)}
              disabled={disabled}
              className="form-input"
              style={{ flex: '1 1 160px', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            />
            <button
              type="button"
              disabled={disabled || !customExe.trim()}
              onClick={addCustomProcess}
              className="button button--secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              Add App
            </button>
          </div>
          {customError && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#f87171' }}>
              ⚠ {customError}
            </p>
          )}
        </div>

        {/* Current Active List */}
        {permitted.length > 0 && (
          <div style={{ marginTop: '0.85rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configured Allowed Applications ({permitted.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {permitted.map((p) => (
                <div
                  key={p.executable}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.4rem',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    fontSize: '0.8rem',
                    color: '#e0f2fe',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{p.title || p.executable}</span>
                  <code style={{ fontSize: '0.72rem', color: '#93c5fd' }}>({p.executable})</code>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeProcess(p.executable)}
                      title="Remove application"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0 0.2rem',
                        fontSize: '0.9rem',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Student File Attachment Submissions ── */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '0.75rem',
          background: allowFileUpload
            ? 'rgba(16, 185, 129, 0.08)'
            : 'rgba(255, 255, 255, 0.02)',
          border: allowFileUpload
            ? '1px solid rgba(16, 185, 129, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={allowFileUpload}
            disabled={disabled}
            onChange={(e) => onChangeFileUpload(e.target.checked)}
            style={{ marginTop: '0.2rem', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                Allow Student File Submissions / Attachments
              </span>
              {allowFileUpload && (
                <span className="status-pill status-pill--info" style={{ background: '#10b981', color: '#fff', fontSize: '0.68rem' }}>
                  Enabled
                </span>
              )}
            </div>
            <p className="panel-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
              Students can attach files directly to their submission (e.g., Python code <code>.py</code>, Java <code>.java</code>, Word <code>.docx</code>, Excel <code>.xlsx</code>, or <code>.zip</code> projects from VS Code/IDE). Files are stored securely in Google Drive.
            </p>
            {permitted.length > 0 && !allowFileUpload && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 500 }}>
                💡 Recommendation: You have whitelisted external applications. It is recommended to enable file submissions so students can upload their work.
              </p>
            )}
          </div>
        </label>
      </div>

      {/* ── 3. Display Policy (Anti-Cheat) ── */}
      <div>
        <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600 }}>
          Display & Screen Security Policy
        </h4>
        <p className="panel-subtitle" style={{ margin: '0 0 0.75rem' }}>
          Control multi-screen and external monitor behavior inside Safe Exam Browser.
        </p>

        <div className="settings-grid">
          <label
            className={`option-card ${allowedDisplays === 1 && internalDisplayOnly ? 'option-card-selected' : ''}`}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <div className="option-card__header">
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays === 1 && internalDisplayOnly}
                onChange={() => setDisplayPolicy(true)}
              />
              <div className="option-card__title">🔒 Single Internal Screen Only (Strict Anti-Cheat)</div>
            </div>
            <p className="panel-subtitle">
              Strictly restricts the exam to 1 display and blocks external monitors, HDMI cables, and duplicate screens. Recommended for standard exam integrity.
            </p>
          </label>

          <label
            className={`option-card ${allowedDisplays > 1 || !internalDisplayOnly ? 'option-card-selected' : ''}`}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <div className="option-card__header">
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays > 1 || !internalDisplayOnly}
                onChange={() => setDisplayPolicy(false)}
              />
              <div className="option-card__title">🖥️ Allow Secondary / External Displays</div>
            </div>
            <p className="panel-subtitle">
              Allows dual monitors or external screens. Useful if students need one monitor for exam instructions and another for VS Code, Word, or CAD.
            </p>
          </label>
        </div>
      </div>

      {/* ── 4. Assistance & Language Tools ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '0.65rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={allowSpellCheck}
              onChange={(e) =>
                onChangeSettings({
                  ...sebSettings,
                  allowSpellCheck: e.target.checked,
                })
              }
              style={{ width: '1rem', height: '1rem' }}
            />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                Allow Spell Checking
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Enables browser red underline spell-check in essay textboxes
              </p>
            </div>
          </label>
        </div>

        <div
          style={{
            padding: '0.85rem',
            borderRadius: '0.65rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={allowDictionaryLookup}
              onChange={(e) =>
                onChangeSettings({
                  ...sebSettings,
                  allowDictionaryLookup: e.target.checked,
                })
              }
              style={{ width: '1rem', height: '1rem' }}
            />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                Allow Dictionary Lookup
              </span>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Allows definition lookup for unfamiliar words
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
