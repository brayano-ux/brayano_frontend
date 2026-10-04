import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getStoredSession } from '../../services/api';

const navItems = [
  { to: '/overview', label: 'Vue d’ensemble' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/agent', label: 'Agent IA' },
  { to: '/settings', label: 'Paramètres' },
  { to: '/whatsapp', label: 'WhatsApp' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const session = getStoredSession();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Brayano</div>
            <div className="brand-subtitle">Pilotage IA</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-card">
            <span className="mini-label">Système</span>
            <strong>Opérationnel</strong>
          </div>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1>Centre de pilotage</h1>
          </div>

          <div className="topbar-aside">
            <div className="status-chip">
              <span className="status-dot" />
              En ligne
            </div>
            <div className="user-pill">
              <span className="user-avatar">{(session?.email || 'AD').slice(0, 2).toUpperCase()}</span>
              {session?.email ? session.email.split('@')[0] : 'Admin'}
            </div>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
