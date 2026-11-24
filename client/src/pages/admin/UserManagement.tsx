import { useState, useEffect } from 'react';
import { api } from '../../api';
import { IconAlert, IconX } from '../../components/ui/Icons';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'teacher' as const,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data.users);
      setError('');
    } catch (err: any) {
      setError(err.error || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    
    try {
      await api.post('/auth/register', formData);
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'teacher' });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.error || 'Failed to create user. Check password complexity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-page">
      {/* Header Strip */}
      <div className="dash-header-strip">
        <div className="dash-header-left">
          <div className="dash-badge-pill">
            <span className="dash-badge-dot" />
            Administration
          </div>
          <h1 className="dash-heading">User Management</h1>
          <p className="dash-subheading">Manage institutional accounts for administrators, lecturers, and staff.</p>
        </div>
        <div className="dash-header-right">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-dash-create"
          >
            <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="dash-alert dash-alert-error">
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</th>
                <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</th>
                <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-navy)' }}>
                      {user.fullName}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`status-pill ${
                        user.role === 'admin' ? 'status-pill--danger' :
                        user.role === 'teacher' ? 'status-pill--highlight' :
                        'status-pill--muted'
                      }`} style={{ fontSize: '0.68rem' }}>
                        {user.role === 'teacher' ? 'Lecturer' : user.role === 'admin' ? 'Administrator' : 'Student'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: 'rgba(16, 43, 78, 0.45)',
          backdropFilter: 'blur(6px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-xl)', position: 'relative' }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-faint)',
                cursor: 'pointer',
                fontSize: '1.25rem',
              }}
              aria-label="Close"
            >
              <IconX size={16} />
            </button>

            <h2 className="page-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Add User</h2>

            <form onSubmit={handleRegister} className="form-stack">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Dr. Jane Smith"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="jane.smith@multitech.ac.ug"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="form-input"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="form-input"
                >
                  <option value="teacher">Lecturer / Teacher</option>
                  <option value="admin">Administrator</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {formError && (
                <div className="dash-alert dash-alert-error" style={{ fontSize: '0.82rem', padding: '0.65rem 0.9rem' }}>
                  <IconAlert size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="button button--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button button--primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
