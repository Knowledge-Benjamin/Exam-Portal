import { useState, useEffect } from 'react';
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#1a4478] border border-white/5 p-6 sm:p-8 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#00f2fe] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Account Settings</h2>
          <p className="text-gray-400 text-sm mt-2">Manage your profile and security credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Form */}
        <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2fe] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <h3 className="text-[12px] tracking-widest uppercase text-[#00f2fe] font-bold mb-6 relative z-10">Profile Information</h3>
          
          <form onSubmit={handleUpdateProfile} className="space-y-5 relative z-10">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all text-sm"
              />
            </div>

            {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
            {profileSuccess && <p className="text-[#00ff87] text-xs">{profileSuccess}</p>}

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full mt-4 px-6 py-3 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/50 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(0,242,254,0.1)] disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe0979] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <h3 className="text-[12px] tracking-widest uppercase text-[#fe0979] font-bold mb-6 relative z-10">Change Password</h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-5 relative z-10">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#fe0979] focus:ring-1 focus:ring-[#fe0979] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#fe0979] focus:ring-1 focus:ring-[#fe0979] transition-all text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-2">Min 8 chars, 1 uppercase, 1 number.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#fe0979] focus:ring-1 focus:ring-[#fe0979] transition-all text-sm"
              />
            </div>

            {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
            {passwordSuccess && <p className="text-[#00ff87] text-xs">{passwordSuccess}</p>}

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full mt-4 px-6 py-3 bg-[#fe0979] hover:bg-[#d60665] text-white rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(254,9,121,0.4)] disabled:opacity-50"
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>

      {/* System Configuration Form */}
      <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ff87] rounded-full mix-blend-screen filter blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
        <h3 className="text-[12px] tracking-widest uppercase text-[#00ff87] font-bold mb-6 relative z-10">System Configuration</h3>
        <p className="text-sm text-gray-400 mb-6 relative z-10">Configure your Google Drive integration for secure PDF storage and your Safe Exam Browser Config Key for exam enforcement.</p>
        
        <form onSubmit={handleUpdateConfig} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Google Service Account Email</label>
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="e.g. exam-bot@project.iam.gserviceaccount.com"
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Google Drive Folder ID</label>
              <input
                type="text"
                value={googleFolderId}
                onChange={(e) => setGoogleFolderId(e.target.value)}
                placeholder="e.g. 1aBcD2eF..."
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87] transition-all text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">Google Private Key</label>
            <textarea
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
              className="w-full h-32 bg-[#0f3261] border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87] transition-all text-xs resize-y custom-scrollbar"
            />
            <p className="text-[10px] text-gray-500 mt-2">Paste the key as a multiline PEM block. Do not submit literal backslash-n sequences (\n).</p>
          </div>

          {/* SEB Config Key moved to per-exam settings in the Exam Builder */}

          {configError && <p className="text-red-400 text-xs">{configError}</p>}
          {configSuccess && <p className="text-[#00ff87] text-xs">{configSuccess}</p>}

          <button
            type="submit"
            disabled={isUpdatingConfig}
            className="w-full mt-4 px-6 py-3 bg-[#00ff87]/10 hover:bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/50 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(0,255,135,0.1)] disabled:opacity-50"
          >
            {isUpdatingConfig ? 'Saving...' : 'Save System Configuration'}
          </button>
        </form>
      </div>

    </div>
  );
}
