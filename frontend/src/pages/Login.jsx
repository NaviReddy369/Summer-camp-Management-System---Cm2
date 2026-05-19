import { useState } from 'react';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const tabs = [
  { key: 'camper',    label: 'Camper',    icon: '🚀', role: 'Explorer'  },
  { key: 'counselor', label: 'Counselor', icon: '🛰️', role: 'Navigator' },
  { key: 'admin',     label: 'Admin',     icon: '⭐', role: 'Commander' },
];

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab]       = useState('camper');
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

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
    <div className="orbit-page">
      {/* Layered starfield */}
      <div className="orbit-stars" />
      <div className="orbit-stars orbit-stars-2" />
      <div className="orbit-stars orbit-stars-3" />

      {/* Subtle perspective grid */}
      <div className="orbit-grid" />

      {/* Ambient glow blobs */}
      <div className="orbit-glow orbit-glow-tl" />
      <div className="orbit-glow orbit-glow-br" />

      <div className="orbit-wrapper">
        {/* ── Hero logo ── */}
        <div className="orbit-hero">
          <div className="orbit-logo-wrap">
            {/* Rotating ring tracks */}
            <div className="orbit-ring-track orbit-ring-track-1">
              <div className="orbit-dot orbit-dot-cyan" />
            </div>
            <div className="orbit-ring-track orbit-ring-track-2">
              <div className="orbit-dot orbit-dot-purple" />
            </div>
            <div className="orbit-ring-track orbit-ring-track-3">
              <div className="orbit-dot orbit-dot-gold" />
            </div>
            {/* Center planet */}
            <div className="orbit-planet">
              <span>O</span>
            </div>
          </div>

          <h1 className="orbit-brand">ORBIT</h1>
          <p className="orbit-tagline">Camp Management System</p>
        </div>

        {/* ── Login card ── */}
        <div className="orbit-card">
          {/* Role tabs */}
          <div className="orbit-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`orbit-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); setError(''); }}
              >
                <span className="orbit-tab-icon">{tab.icon}</span>
                <span className="orbit-tab-label">{tab.label}</span>
                {activeTab === tab.key && (
                  <span className="orbit-tab-role">{tab.role}</span>
                )}
              </button>
            ))}
          </div>

          <form className="orbit-form" onSubmit={handleSubmit}>
            {error && (
              <div className="orbit-error">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="orbit-field">
              <label>Username</label>
              <div className="orbit-input-wrap">
                <User size={15} className="orbit-input-icon" />
                <input
                  type="text"
                  placeholder={`Enter ${activeTab} username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="orbit-field">
              <label>Password</label>
              <div className="orbit-input-wrap">
                <Lock size={15} className="orbit-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="orbit-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button className="orbit-btn-launch" type="submit" disabled={loading}>
              <span className="orbit-btn-inner">
                {loading ? (
                  <>
                    <span className="orbit-spinner" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <LogIn size={17} />
                    Launch as {tabs.find((t) => t.key === activeTab)?.label}
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="orbit-card-footer">
            ORBIT &copy; 2026 &middot; CM2 Summer Camp
          </div>
        </div>
      </div>
    </div>
  );
}
