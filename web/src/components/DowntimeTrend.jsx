import { useEffect, useRef, useState } from 'react';

export default function DowntimeTrend({ days }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const wrapRef = useRef(null);
  const [, forceResize] = useState(0);

  useEffect(() => {
    const onResize = () => forceResize((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!days?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.parentElement.offsetWidth || 360;
    canvas.width = W; canvas.height = 110;
    const ctx = canvas.getContext('2d');
    const pad = { t: 8, b: 4, l: 4, r: 4 }, iW = W - pad.l - pad.r, iH = 110 - pad.t - pad.b;
    const vals = days.map((d) => d.hrs), maxV = Math.max(...vals, 1);
    const n = days.length;
    const slot = iW / n, barW = Math.max(2, slot * 0.55);
    const xOf = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;
    ctx.clearRect(0, 0, W, 110);
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, pad.t, 0, 110);
    g.addColorStop(0, '#4488ff'); g.addColorStop(1, 'rgba(68,136,255,.35)');
    vals.forEach((v, i) => {
      const x = xOf(i), y = yOf(v), h = (pad.t + iH) - y;
      ctx.fillStyle = g;
      const r = Math.min(4, barW / 2);
      ctx.beginPath();
      if (h > 0) {
        ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, pad.t + iH); ctx.lineTo(x, pad.t + iH); ctx.closePath(); ctx.fill();
      }
    });

    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      const cl = Math.floor((mx - pad.l) / slot);
      if (cl < 0 || cl >= n) { tip.style.display = 'none'; return; }
      tip.style.display = 'block';
      tip.style.left = Math.min(xOf(cl), W - 80) + 'px';
      tip.style.top = (yOf(vals[cl]) - 30) + 'px';
      tip.textContent = `${days[cl].day}: ${vals[cl].toFixed(1)} jam`;
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [days]);

  return (
    <div className="card">
      <div className="card-header"><div><div className="card-title">Downtime Trend</div><div className="card-sub">Mengikuti periode di atas (Harian/Mingguan/Bulanan)</div></div></div>
      <div className="trend-wrap" ref={wrapRef}>
        <canvas ref={canvasRef}></canvas>
        <div className="trend-tooltip" ref={tipRef}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 5, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        {(days || []).map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  );
}
