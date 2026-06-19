import { useEffect, useRef } from 'react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';

function relTime(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago';
}

export default function NotifPanel() {
  const { notifOpen, setNotifOpen } = useUI();
  const { notifications, markAllRead, clearNotifs } = useApp();
  const ref = useRef(null);

  useEffect(() => {
    if (notifOpen) markAllRead();
  }, [notifOpen, markAllRead]);

  useEffect(() => {
    function onClick(e) {
      if (notifOpen && ref.current && !ref.current.contains(e.target) && !e.target.closest('.notif-btn')) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [notifOpen, setNotifOpen]);

  return (
    <div className={'notif-panel' + (notifOpen ? ' show' : '')} ref={ref}>
      <div className="notif-header">
        <span className="notif-title">Notifikasi</span>
        <span className="notif-clear" onClick={clearNotifs}>Clear all</span>
      </div>
      <div className="notif-list">
        {!notifications.length ? (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No notifications</div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <div key={n.id} className={'notif-item' + (n.unread ? ' unread' : '')}>
              <div className={'notif-dot ' + n.color}></div>
              <div><div className="notif-text">{n.text}</div><div className="notif-time">{relTime(n.time)}</div></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
