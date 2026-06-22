export default function MtbfMttrChart({ kpi }) {
  const mtbf = kpi.mtbf ?? 0;
  const mttr = kpi.mttr ?? 0;
  const max = Math.max(mtbf, mttr, 1);

  return (
    <div className="card">
      <div className="card-header"><div><div className="card-title">MTBF & MTTR</div><div className="card-sub">Mean Time Between/To Repair</div></div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--muted)' }}>MTBF · jam antara problem</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{mtbf.toFixed(1)} jam</span>
          </div>
          <div className="oee-bar" style={{ height: 8 }}>
            <div className="oee-fill" style={{ background: 'var(--purple)', width: `${(mtbf / max) * 100}%` }}></div>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--muted)' }}>MTTR · jam untuk perbaikan</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{mttr.toFixed(1)} jam</span>
          </div>
          <div className="oee-bar" style={{ height: 8 }}>
            <div className="oee-fill" style={{ background: 'var(--green)', width: `${(mttr / max) * 100}%` }}></div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>MTBF</strong> tinggi & <strong style={{ color: 'var(--text)' }}>MTTR</strong> rendah = mesin lebih reliable.
      </div>
    </div>
  );
}
