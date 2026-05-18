import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import CamperDashboard from './pages/CamperDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';

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
    const routes = { camper: '/camper', counselor: '/counselor', admin: '/admin' };
    navigate(routes[userData.role] || '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('cm2_token');
    localStorage.removeItem('cm2_user');
    setUser(null);
    navigate('/');
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
    const routes = { camper: '/camper', counselor: '/counselor', admin: '/admin' };
    return routes[user.role] || '/';
  };

  return (
    <div className="app">
      {user && <Navbar user={user} onLogout={handleLogout} />}
      {user && <Chatbot user={user} />}
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to={getDashboardRoute()} replace /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/camper"
          element={
            user?.role === 'camper' ? <CamperDashboard user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/counselor"
          element={
            user?.role === 'counselor' ? <CounselorDashboard user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/admin"
          element={
            user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
