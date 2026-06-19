import { useEffect, useRef } from 'react';
import { useUI } from '../UIContext.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

function drawGauge(canvas, f) {
  const ctx = canvas.getContext('2d');
  const cx = 65, cy = 68, r = 50, s = Math.PI * 0.75, e = Math.PI * 2.25;
  ctx.clearRect(0, 0, 130, 130);
  const col = f >= 0.85 ? '#00d084' : f >= 0.65 ? '#f0a500' : '#ff4455';
  ctx.beginPath(); ctx.arc(cx, cy, r, s, e); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, s, s + f * (e - s)); ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = s + (i / 10) * (e - s);
    ctx.beginPath();
    ctx.moveTo(cx + (r - 13) * Math.cos(a), cy + (r - 13) * Math.sin(a));
    ctx.lineTo(cx + (r - 7) * Math.cos(a), cy + (r - 7) * Math.sin(a));
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  }
  return col;
}

export default function OeeCard({ kpi }) {
  const { openModal } = useUI();
  const canvasRef = useRef(null);
  const av = kpi.availability ?? 0, pf = kpi.performance ?? 0, ql = kpi.quality ?? 0, oee = kpi.oee ?? 0;
  const avS = useAnimatedNumber(av, 1), pfS = useAnimatedNumber(pf, 1), qlS = useAnimatedNumber(ql, 1);
  const oeePct = useAnimatedNumber(oee, 0);

  useEffect(() => {
    if (canvasRef.current) drawGauge(canvasRef.current, oee / 100);
  }, [oee]);

  const gaugeColor = oee / 100 >= 0.85 ? '#00d084' : oee / 100 >= 0.65 ? '#f0a500' : '#ff4455';

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">OEE Breakdown</div><div className="card-sub">Availability × Performance × Quality</div></div>
        <button className="card-action" onClick={() => openModal('oee')}>Details ›</button>
      </div>
      <div className="oee-wrap">
        <div className="oee-gauge">
          <canvas ref={canvasRef} width="130" height="130"></canvas>
          <div className="oee-center"><div className="oee-big" style={{ color: gaugeColor }}>{oeePct}%</div><div className="oee-lbl">OEE</div></div>
        </div>
        <div className="oee-breakdown">
          <div className="oee-row"><div className="oee-row-label"><span>Availability</span><span style={{ color: 'var(--blue)' }}>{avS}%</span></div><div className="oee-bar"><div className="oee-fill" style={{ background: 'var(--blue)', width: `${av}%` }}></div></div></div>
          <div className="oee-row"><div className="oee-row-label"><span>Performance</span><span style={{ color: 'var(--purple)' }}>{pfS}%</span></div><div className="oee-bar"><div className="oee-fill" style={{ background: 'var(--purple)', width: `${pf}%` }}></div></div></div>
          <div className="oee-row"><div className="oee-row-label"><span>Quality</span><span style={{ color: 'var(--green)' }}>{qlS}%</span></div><div className="oee-bar"><div className="oee-fill" style={{ background: 'var(--green)', width: `${ql}%` }}></div></div></div>
          <div className="oee-stats">
            <div><div className="oee-stat-val">{kpi.mtbf ?? '—'}</div><div className="oee-stat-lbl">MTBF</div><div className="oee-stat-desc">jam antara problem</div></div>
            <div><div className="oee-stat-val">{kpi.mttr ?? '—'}</div><div className="oee-stat-lbl">MTTR</div><div className="oee-stat-desc">jam untuk perbaikan</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
