export default function AvailabilityCard({ kpi }) {
  const av = kpi.availability ?? 0;
  const planned = kpi.planned_hours ?? 0;
  const downtime = kpi.downtime_hrs ?? 0;
  const uptime = Math.max(0, planned - downtime);
  const col = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">Availability Mesin</div></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 700, color: col }}>{av.toFixed(1)}%</div>
      </div>
      <div className="oee-bar" style={{ height: 8, marginBottom: 18 }}>
        <div className="oee-fill" style={{ background: col, width: `${Math.min(100, av)}%` }}></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="detail-stat"><div className="detail-stat-val" style={{ fontSize: 17 }}>{planned.toFixed(1)}</div><div className="detail-stat-lbl">Jam Kerja Total</div></div>
        <div className="detail-stat"><div className="detail-stat-val" style={{ fontSize: 17, color: 'var(--red)' }}>{downtime.toFixed(1)}</div><div className="detail-stat-lbl">Downtime</div></div>
        <div className="detail-stat"><div className="detail-stat-val" style={{ fontSize: 17, color: 'var(--green)' }}>{uptime.toFixed(1)}</div><div className="detail-stat-lbl">Uptime</div></div>
      </div>
    </div>
  );
}
