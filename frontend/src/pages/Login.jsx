import { useState } from 'react';
import { User, Lock, LogIn, TreePine } from 'lucide-react';
import api from '../api';

const tabs = [
  { key: 'camper', label: 'Camper', icon: '🏕️' },
  { key: 'counselor', label: 'Counselor', icon: '🧭' },
  { key: 'admin', label: 'Admin', icon: '⭐' },
];

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('camper');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;

      if (user.role !== activeTab) {
        setError(`This account is not a ${activeTab} account. Try the ${user.role} tab.`);
        setLoading(false);
        return;
      }

      onLogin(user, token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <TreePine size={32} />
          </div>
          <h1>Community Matters 2</h1>
          <p>Summer Camp Management System</p>
        </div>

        <div className="login-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`login-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setError(''); }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={18} />
              <input
                type="text"
                placeholder={`Enter your ${activeTab} username`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In as {tabs.find(t => t.key === activeTab)?.label}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>CM2 Summer Camp &copy; 2026 &middot; Where every day is an adventure!</p>
        </div>
      </div>
    </div>
  );
}
