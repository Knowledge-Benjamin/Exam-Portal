import { useState, useEffect } from 'react';
import { api } from '../../api';

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
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      setFormError(err.error || 'Failed to create user. Check the password complexity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center bg-[var(--color-primary)] p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white mb-2">User Management</h1>
          <p className="text-gray-300">View and manage system administrators, teachers, and students.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 px-6 py-3 bg-[var(--color-action)] text-[var(--color-primary)] rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-[var(--color-primary)] rounded-3xl p-6 overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-secondary)]">
              <th className="py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--color-secondary)] last:border-0 hover:bg-[var(--color-secondary)] transition-colors">
                  <td className="py-4 font-medium text-white">{user.fullName}</td>
                  <td className="py-4 text-gray-300">{user.email}</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'teacher' ? 'bg-[var(--color-action)] text-[var(--color-primary)]' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-primary)] border border-[var(--color-secondary)] rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">Add New User</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[var(--color-secondary)] border-2 border-transparent focus:border-[var(--color-action)] text-white px-4 py-3 rounded-xl transition-colors outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[var(--color-secondary)] border-2 border-transparent focus:border-[var(--color-action)] text-white px-4 py-3 rounded-xl transition-colors outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[var(--color-secondary)] border-2 border-transparent focus:border-[var(--color-action)] text-white px-4 py-3 rounded-xl transition-colors outline-none"
                  placeholder="Must contain 1 uppercase & 1 number"
                />
                <p className="text-xs text-gray-500 mt-2">Min 8 chars, 1 uppercase letter, 1 number.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full bg-[var(--color-secondary)] border-2 border-transparent focus:border-[var(--color-action)] text-white px-4 py-3 rounded-xl transition-colors outline-none appearance-none cursor-pointer"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {formError && (
                <div className="text-red-400 text-sm mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  {formError}
                </div>
              )}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[var(--color-action)] hover:bg-opacity-90 text-[var(--color-primary)] font-black text-lg rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
