import { useEffect, useState } from 'react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';

function tickLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'machines', label: 'Mesin' },
  { page: 'maintenance', label: 'Maintenance' },
  { page: 'reports', label: 'Laporan' },
];

export default function Topbar() {
  const { page, navigate, toggleDrawer, toggleNotif } = useUI();
  const { connected, notifications } = useApp();
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [clock, setClock] = useState(tickLabel());

  useEffect(() => {
    const t = setInterval(() => setClock(tickLabel()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.filter((n) => n.unread).length;

  function confirmLogout() {
    if (window.confirm('Logout dari dashboard?')) logout();
  }

  return (
    <header className="topbar">
      <button className="hamburger" onClick={toggleDrawer} aria-label="Menu">☰</button>
      <div className="logo" onClick={() => navigate('dashboard')}>Maintenance<span> Dashboard</span></div>
      <nav className="nav-links">
        {NAV_ITEMS.map((n) => (
          <span key={n.page} className={'nav-item' + (page === n.page ? ' active' : '')} onClick={() => navigate(n.page)}>{n.label}</span>
        ))}
      </nav>
      <div className="topbar-right">
        <span><span className={'conn-dot' + (connected ? '' : ' off')}></span><span className="conn-label">{connected ? 'Live' : 'Offline'}</span></span>
        <span className="date-label">{clock}</span>
        <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="notif-btn" onClick={toggleNotif}>
          🔔
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </div>
        <div className="avatar" onClick={confirmLogout} title={username ? `${username} — klik untuk logout` : 'Logout'}>
          {(username || 'OP').slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
