import { useState } from 'react';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const tabs = [
  { key: 'camper',    label: 'Camper',    icon: '👪', role: 'Family Portal' },
  { key: 'counselor', label: 'Counselor', icon: '🛰️', role: 'Navigator'    },
  { key: 'admin',     label: 'Admin',     icon: '⭐', role: 'Commander'    },
];

const features = [
  { icon: '🚀', label: 'Camper Tracking'  },
  { icon: '🛰️', label: 'Counselor Tools' },
  { icon: '⭐', label: 'Admin Control'    },
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
    <div className="lp-page">
      {/* Decorative background rings */}
      <div className="lp-bg-ring lp-bg-ring-tl" />
      <div className="lp-bg-ring lp-bg-ring-br" />
      <div className="lp-bg-ring lp-bg-ring-tr" />

      <div className="lp-container">

        {/* ──── LEFT: Brand Panel ──── */}
        <div className="lp-brand">

          {/* Orbital logo animation with CM2 image */}
          <div className="lp-orbit-wrap">
            <div className="lp-track lp-track-1"><div className="lp-dot lp-dot-blue" /></div>
            <div className="lp-track lp-track-2"><div className="lp-dot lp-dot-green" /></div>
            <div className="lp-track lp-track-3"><div className="lp-dot lp-dot-gold" /></div>
            <div className="lp-planet">
              <img src="/CM2 Logo.png" alt="CM2 Logo" className="lp-cm2-logo" />
            </div>
          </div>

          {/* Brand text */}
          <div className="lp-brand-text">
            <h1 className="lp-app-name">ORBIT</h1>
            <p className="lp-app-subtitle">Camp Management System</p>
            <p className="lp-powered-by">Powered by CM2 &middot; Extraordinary Youth Summer Camp</p>
          </div>

          {/* Feature pills */}
          <div className="lp-features">
            {features.map((f) => (
              <div className="lp-feature-pill" key={f.label}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ──── RIGHT: Login Form ──── */}
        <div className="lp-form-col">
          <div className="lp-card">

            {/* Card header */}
            <div className="lp-card-head">
              <div className="lp-card-icon">O</div>
              <div>
                <h2 className="lp-card-title">Welcome Back</h2>
                <p className="lp-card-desc">Sign in to your ORBIT account</p>
              </div>
            </div>

            {/* Role selector */}
            <div className="lp-tabs-wrap">
              <div className="lp-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`lp-tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => { setActiveTab(tab.key); setError(''); }}
                  >
                    <span className="lp-tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.key && (
                      <span className="lp-tab-badge">{tab.role}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Form body */}
            <form className="lp-form" onSubmit={handleSubmit}>
              {error && (
                <div className="lp-error"><span>⚠</span> {error}</div>
              )}

              <div className="lp-field">
                <label htmlFor="lp-username">Username</label>
                <div className="lp-input-wrap">
                  <User size={16} className="lp-input-icon" />
                  <input
                    id="lp-username"
                    type="text"
                    placeholder={`Enter ${activeTab} username`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="lp-password">Password</label>
                <div className="lp-input-wrap">
                  <Lock size={16} className="lp-input-icon" />
                  <input
                    id="lp-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button className="lp-btn-signin" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="lp-spinner" />Authenticating…</>
                ) : (
                  <><LogIn size={17} />Sign In as {tabs.find((t) => t.key === activeTab)?.label}</>
                )}
              </button>
            </form>

            <div className="lp-card-footer">
              ORBIT &copy; 2026 &middot; CM2 Summer Camp &middot; All rights reserved
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
