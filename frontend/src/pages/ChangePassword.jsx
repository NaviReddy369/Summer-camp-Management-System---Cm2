import { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, LogOut } from 'lucide-react';
import api from '../api';

export default function ChangePassword({ user, onPasswordChanged, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current one.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => onPasswordChanged && onPasswordChanged(), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const forced = Number(user?.must_change_password) === 1;

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
            <KeyRound size={32} />
          </div>
          <h1>Change Your Password</h1>
          <p>{forced ? 'First-time login — please set a new password' : 'Update your CM2 password'}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {forced && (
            <div className="cred-warning">
              <ShieldCheck size={16} />
              <span>For your security, you must change the temporary password before continuing.</span>
            </div>
          )}

          {error && <div className="login-error">{error}</div>}
          {success && (
            <div style={{
              background: 'rgba(46,204,113,0.15)', color: 'var(--secondary-dark)',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 700, textAlign: 'center',
            }}>
              ✓ Password changed! Redirecting...
            </div>
          )}

          <div className="form-group">
            <label>Current / Temporary Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label>New Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button className="btn-login" type="submit" disabled={loading || success}>
            {loading ? (
              <>
                <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Updating...
              </>
            ) : (
              <>
                <KeyRound size={20} />
                Update Password
              </>
            )}
          </button>

          {forced && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                background: 'none', border: 'none', color: 'var(--gray-500)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4,
              }}
            >
              <LogOut size={14} /> Cancel and sign out
            </button>
          )}
        </form>

        <div className="login-footer">
          <p>CM2 Summer Camp &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}
