import React, { useState } from 'react';
import type { SebSettings, PermittedProcess } from '../../types';

export const APP_PRESETS: Array<{
  title: string;
  executable: string;
  path: string;
  category: string;
  icon: string;
}> = [
  {
    title: 'VS Code',
    executable: 'Code.exe',
    path: '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\',
    category: 'Development',
    icon: '💻',
  },
  {
    title: 'Word',
    executable: 'WINWORD.EXE',
    path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\',
    category: 'Office',
    icon: '📝',
  },
  {
    title: 'Excel',
    executable: 'EXCEL.EXE',
    path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\',
    category: 'Office',
    icon: '📊',
  },
  {
    title: 'IntelliJ',
    executable: 'idea64.exe',
    path: 'C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\',
    category: 'Development',
    icon: '☕',
  },
  {
    title: 'PyCharm',
    executable: 'pycharm64.exe',
    path: 'C:\\Program Files\\JetBrains\\PyCharm\\bin\\',
    category: 'Development',
    icon: '🐍',
  },
  {
    title: 'Notepad',
    executable: 'notepad.exe',
    path: 'C:\\Windows\\System32\\',
    category: 'Utilities',
    icon: '📄',
  },
  {
    title: 'Calculator',
    executable: 'calc.exe',
    path: 'C:\\Windows\\System32\\',
    category: 'Utilities',
    icon: '🧮',
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
          path: preset.path,
          title: preset.title,
          allowUserToChooseApp: true,
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
      (p) => p.executable.toLowerCase() !== executable.toLowerCase()
    );
    onChangeSettings({
      ...sebSettings,
      permittedProcesses: next,
    });
  };

  const updateProcessPath = (executable: string, newPath: string) => {
    if (disabled) return;
    const next = permitted.map((p) =>
      p.executable.toLowerCase() === executable.toLowerCase() ? { ...p, path: newPath } : p
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
        os: 1, // 1 = Windows in Safe Exam Browser
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
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* ── 1. External Applications ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-navy)', fontWeight: 700 }}>
              Permitted External Applications
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Enable applications students can run alongside Safe Exam Browser.
            </p>
          </div>
          {permitted.length > 0 && (
            <span className="status-pill status-pill--highlight" style={{ whiteSpace: 'nowrap' }}>
              {permitted.length} Active
            </span>
          )}
        </div>

        {/* Presets Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.5rem',
            marginTop: '0.5rem',
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
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: active ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border)',
                  background: active ? 'rgba(37, 99, 235, 0.06)' : 'var(--color-surface)',
                  color: 'var(--color-text)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 0 0 1px rgba(37,99,235,0.1)' : 'var(--shadow-xs)',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{preset.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? 'var(--color-blue)' : 'var(--color-navy)' }}>
                      {preset.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: active ? 'var(--color-blue)' : 'var(--color-bg-alt)',
                        color: active ? '#fff' : 'var(--color-text-muted)',
                      }}
                    >
                      {active ? '✓' : '+'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '1px' }}>
                    {preset.executable}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Application Form */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'var(--color-bg)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Title (e.g. Dev-C++)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={disabled}
              className="form-input"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            />
            <input
              type="text"
              placeholder="Executable (e.g. devcpp.exe)"
              value={customExe}
              onChange={(e) => setCustomExe(e.target.value)}
              disabled={disabled}
              className="form-input"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            />
            <input
              type="text"
              placeholder="Path (e.g. C:\Program Files\Dev-Cpp\)"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              disabled={disabled}
              className="form-input"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
            />
            <button
              type="button"
              disabled={disabled || !customExe.trim()}
              onClick={addCustomProcess}
              className="button button--secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              + Add
            </button>
          </div>
          {customError && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--color-danger)' }}>
              ⚠ {customError}
            </p>
          )}
        </div>

        {/* Configured App List */}
        {permitted.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {permitted.map((p) => (
              <div
                key={p.executable}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{p.title || p.executable}</span>
                  <code style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--color-bg-alt)', color: 'var(--color-blue)' }}>
                    {p.executable}
                  </code>
                  <input
                    type="text"
                    value={p.path ?? ''}
                    disabled={disabled}
                    placeholder="Path..."
                    onChange={(e) => updateProcessPath(p.executable, e.target.value)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      flex: 1,
                      minWidth: '120px',
                    }}
                  />
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeProcess(p.executable)}
                    className="button button--ghost"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. File Upload Checkbox ── */}
      <div
        style={{
          padding: '0.9rem 1rem',
          borderRadius: '10px',
          background: allowFileUpload ? 'rgba(37,99,235,0.05)' : 'var(--color-surface)',
          border: allowFileUpload ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={allowFileUpload}
            disabled={disabled}
            onChange={(e) => onChangeFileUpload(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--color-blue)' }}
          />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-navy)' }}>
              Allow Student File Uploads
            </span>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Students can attach project files, documents, or spreadsheets (.py, .docx, .xlsx, .zip) to their submission.
            </span>
          </div>
        </label>
      </div>

      {/* ── 3. Screen Policy ── */}
      <div>
        <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: 'var(--color-navy)', fontWeight: 700 }}>
          Screen Security Policy
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
          <label
            className={`option-card ${allowedDisplays === 1 && internalDisplayOnly ? 'option-card-selected' : ''}`}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays === 1 && internalDisplayOnly}
                onChange={() => setDisplayPolicy(true)}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                🔒 Single Screen (Strict)
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Blocks external displays and duplicate monitors.
            </p>
          </label>

          <label
            className={`option-card ${allowedDisplays > 1 || !internalDisplayOnly ? 'option-card-selected' : ''}`}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="displayPolicy"
                disabled={disabled}
                checked={allowedDisplays > 1 || !internalDisplayOnly}
                onChange={() => setDisplayPolicy(false)}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                🖥️ Allow Dual Monitors
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Permits secondary screen for code or document viewing.
            </p>
          </label>
        </div>
      </div>

      {/* ── 4. Language & Assistance Tools ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={allowSpellCheck}
            onChange={(e) => onChangeSettings({ ...sebSettings, allowSpellCheck: e.target.checked })}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-blue)' }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>
            Spell Check in Essays
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={allowDictionaryLookup}
            onChange={(e) => onChangeSettings({ ...sebSettings, allowDictionaryLookup: e.target.checked })}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--color-blue)' }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>
            Dictionary Lookup
          </span>
        </label>
      </div>
    </div>
  );
}
