import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import CamperDashboard from './pages/CamperDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';

const ROLE_ROUTES = {
  camper: '/camper',
  counselor: '/counselor',
  admin: '/admin',
};

function mustChange(u) {
  return Number(u?.must_change_password) === 1;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('cm2_user');
    const token = localStorage.getItem('cm2_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('cm2_token', token);
    localStorage.setItem('cm2_user', JSON.stringify(userData));
    setUser(userData);
    if (mustChange(userData)) {
      navigate('/change-password');
    } else {
      navigate(ROLE_ROUTES[userData.role] || '/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cm2_token');
    localStorage.removeItem('cm2_user');
    setUser(null);
    navigate('/');
  };

  const handlePasswordChanged = () => {
    const updated = { ...user, must_change_password: 0 };
    localStorage.setItem('cm2_user', JSON.stringify(updated));
    setUser(updated);
    navigate(ROLE_ROUTES[updated.role] || '/');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading CM2 Summer Camp...</p>
      </div>
    );
  }

  const getDashboardRoute = () => {
    if (!user) return '/';
    if (mustChange(user)) return '/change-password';
    return ROLE_ROUTES[user.role] || '/';
  };

  const protectedRoute = (role, Component) => {
    if (!user) return <Navigate to="/" replace />;
    if (mustChange(user)) return <Navigate to="/change-password" replace />;
    if (user.role !== role) return <Navigate to="/" replace />;
    return <Component user={user} />;
  };

  const showChrome = user && !mustChange(user);

  return (
    <div className="app">
      {showChrome && <Navbar user={user} onLogout={handleLogout} />}
      {showChrome && <Chatbot user={user} />}
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to={getDashboardRoute()} replace /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/change-password"
          element={
            user ? (
              <ChangePassword
                user={user}
                onPasswordChanged={handlePasswordChanged}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/camper" element={protectedRoute('camper', CamperDashboard)} />
        <Route path="/counselor" element={protectedRoute('counselor', CounselorDashboard)} />
        <Route path="/admin" element={protectedRoute('admin', AdminDashboard)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
