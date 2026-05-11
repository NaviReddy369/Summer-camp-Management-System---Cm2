import { LogOut, TreePine } from 'lucide-react';

const roleLabels = {
  camper: 'Camper',
  counselor: 'Counselor',
  admin: 'Admin',
};

const roleIcons = {
  camper: '🏕️',
  counselor: '🧭',
  admin: '⭐',
};

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <TreePine size={22} />
        </div>
        <div className="navbar-title">
          CM2 <span>Summer Camp</span>
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
