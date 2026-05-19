import { LogOut } from 'lucide-react';

const roleLabels = {
  camper: 'Family Portal',
  counselor: 'Counselor',
  admin: 'Admin',
};

const roleIcons = {
  camper: '👪',
  counselor: '🛰️',
  admin: '⭐',
};

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">O</div>
        <div className="navbar-title">
          ORBIT <span>Camp</span>
        </div>
      </div>
      <div className="navbar-right">
        <span className={`role-badge ${user.role}`}>
          {roleIcons[user.role]} {roleLabels[user.role]}
        </span>
        <span className="navbar-user">{user.name}</span>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
}
