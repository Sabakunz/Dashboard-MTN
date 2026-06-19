import { useUI } from '../UIContext.jsx';

export default function Timeline({ items, limit = 999 }) {
  const { openModal } = useUI();
  const data = items.slice(0, limit);

  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: 8 }}>Tidak Ada Kasus</div>;
  }

  return (
    <div className="timeline">
      {data.map((b, i) => (
        <div className="tl-item" key={b.id ?? i}>
          <div className={'tl-dot ' + (b.status === 'open' ? 'critical' : b.severity)}></div>
          <div className="tl-content">
            <div className="tl-title">{b.machine} — {b.cause}</div>
            <div className="tl-meta">
              {b.category ? b.category + ' · ' : ''}{b.date} · {b.start}
              {b.status === 'open' && <span style={{ color: 'var(--red)' }}> ● OPEN</span>}
              {b.pic_gh ? ' · PIC GH: ' + b.pic_gh : ''}
            </div>
            {b.status === 'resolved' && (b.resolution || b.action || b.pic_mtn) && (
              <div className="tl-meta">
                {b.resolution ? 'Penyelesaian: ' + b.resolution + ' · ' : ''}
                {b.action ? 'Action: ' + b.action + ' · ' : ''}
                {b.pic_mtn ? 'PIC MTN: ' + b.pic_mtn : ''}
              </div>
            )}
          </div>
          {b.status === 'open' && b.id ? (
            <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => openModal('closeWO', { id: b.id, machine: b.machine, cause: b.cause })}>Tutup WO</button>
          ) : (
            <div className="tl-duration">{b.duration}</div>
          )}
        </div>
      ))}
    </div>
  );
}
