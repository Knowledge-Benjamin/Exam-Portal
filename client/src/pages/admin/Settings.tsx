import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';

export function Settings() {
  const { user, setUser } = useAuthStore();
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Config state
  const location = useLocation();
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFolderId, setGoogleFolderId] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setGoogleEmail(user.googleServiceAccountEmail || '');
      setGoogleFolderId(user.googleDriveFolderId || '');
      setGoogleKey(user.googlePrivateKey || '');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('drive') === 'connected') {
      setConfigSuccess('Google Drive connection successful.');
      api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => {});
    }
  }, [location.search, setUser]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError('');
    setConfigSuccess('');

    let normalizedPrivateKey = googleKey
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/&#x5C;n/g, '\n')
      .replace(/&#92;n/g, '\n')
      .replace(/&amp;#x5C;n/g, '\n')
      .replace(/&amp;#92;n/g, '\n')
      .trim();

    if (normalizedPrivateKey.startsWith('"') && normalizedPrivateKey.endsWith('"')) {
      normalizedPrivateKey = normalizedPrivateKey.slice(1, -1).trim();
    }

    if (googleKey && !normalizedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      setConfigError('Google Private Key must include a valid PEM block: -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----.');
      return;
    }

    if (googleKey && !/-----BEGIN PRIVATE KEY-----\n/.test(normalizedPrivateKey)) {
      setConfigError('Google Private Key must include a newline immediately after the BEGIN PRIVATE KEY header. Paste it as a multiline PEM block.');
      return;
    }

    if (googleKey && !/\n-----END PRIVATE KEY-----/.test(normalizedPrivateKey)) {
      setConfigError('Google Private Key must include a newline immediately before the END PRIVATE KEY footer. Paste it as a multiline PEM block.');
      return;
    }

    setIsUpdatingConfig(true);

    try {
      const { data } = await api.patch('/auth/config', {
        googleServiceAccountEmail: googleEmail,
        googlePrivateKey: normalizedPrivateKey,
        googleDriveFolderId: googleFolderId,
      });
      setUser(data.user);
      setConfigSuccess('System Configuration updated successfully.');
    } catch (err: any) {
      setConfigError(err.error || 'Failed to update system configuration.');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsUpdatingProfile(true);

    try {
      const { data } = await api.patch('/auth/profile', { fullName, email });
      setUser(data.user);
      setProfileSuccess('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err.error || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.error || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="page-content page-animate">
      <section className="panel-card panel-card--accent">
        <div className="panel-header">
          <div>
            <h1 className="panel-title">Account Settings</h1>
            <p className="panel-subtitle">Manage your profile and security credentials.</p>
          </div>
        </div>
      </section>

      <div className="panel-grid panel-grid--2">
        <section className="panel-card">
          <div className="panel-card__header">
            <p className="panel-card__subtitle">Profile Information</p>
          </div>
          <form onSubmit={handleUpdateProfile} className="form-stack">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            {profileError && <p className="form-status form-status--error">{profileError}</p>}
            {profileSuccess && <p className="form-status form-status--success">{profileSuccess}</p>}

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="button button--primary button--full"
            >
              {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className="panel-card">
          <div className="panel-card__header">
            <p className="panel-card__subtitle panel-card--danger">Change Password</p>
          </div>
          <form onSubmit={handleUpdatePassword} className="form-stack">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
              />
              <p className="field-help">Min 8 chars, 1 uppercase, 1 number.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
              />
            </div>

            {passwordError && <p className="form-status form-status--error">{passwordError}</p>}
            {passwordSuccess && <p className="form-status form-status--success">{passwordSuccess}</p>}

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="button button--danger button--full"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>

      <section className="panel-card panel-card--accent">
        <div className="panel-card__header">
          <p className="panel-card__subtitle">System Configuration</p>
          <p className="panel-note">Configure your Google Drive integration for secure PDF storage and your Safe Exam Browser Config Key for exam enforcement.</p>
        </div>

        <div className="section-panel section-panel--accent">
          <div className="panel-header">
            <div>
              <h3 className="panel-card__subtitle">OAuth Drive Connection</h3>
              <p className="panel-note">Connect your Google account once to enable uploads directly to your Google Drive without needing a service account PEM key.</p>
            </div>
            <div className="panel-actions">
              <span className={`badge ${user?.googleDriveOAuthConnected ? 'badge--highlight' : 'badge--danger'}`}>
                {user?.googleDriveOAuthConnected ? 'Connected' : 'Not connected'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const apiUrl = import.meta.env.VITE_API_URL;
                  const backendOrigin = apiUrl
                    ? apiUrl.replace(/\/api\/?$/, '')
                    : window.location.origin;
                  window.location.href = `${backendOrigin}/api/auth/google-drive/start`;
                }}
                className="button button--highlight"
              >
                Connect Google Drive
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateConfig} className="form-stack">
          <div className="form-row form-row--2">
            <div className="form-group">
              <label className="form-label">Google Service Account Email</label>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="e.g. exam-bot@project.iam.gserviceaccount.com"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Google Drive Folder ID</label>
              <input
                type="text"
                value={googleFolderId}
                onChange={(e) => setGoogleFolderId(e.target.value)}
                placeholder="e.g. 1aBcD2eF... (personal or shared drive folder ID)"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Google Private Key (Service Account)</label>
            <textarea
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----
...\n-----END PRIVATE KEY-----"
              className="form-input"
              rows={8}
            />
            <p className="field-help">Optional: Provide a service account private key (PEM format) for advanced shared drive setups. If you've connected OAuth above, you can leave this blank for most use cases. Do not submit literal backslash-n sequences (\n). Use a shared drive folder ID with service account keys.</p>
          </div>

          {configError && <p className="form-status form-status--error">{configError}</p>}
          {configSuccess && <p className="form-status form-status--success">{configSuccess}</p>}

          <button
            type="submit"
            disabled={isUpdatingConfig}
            className="button button--highlight button--full"
          >
            {isUpdatingConfig ? 'Saving...' : 'Save System Configuration'}
          </button>
        </form>
      </section>
    </div>
  );
}


