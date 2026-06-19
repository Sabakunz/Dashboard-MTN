import { useUI } from '../UIContext.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

function trendClass(v, tgt) { return 'kpi-trend ' + (v >= tgt ? 'up' : 'down'); }

export default function KpiRow({ kpi }) {
  const { navigate, openModal } = useUI();
  const breakdowns = useAnimatedNumber(kpi.breakdowns, 0);
  const downtime = useAnimatedNumber(kpi.downtime_hrs, 1);
  const availability = useAnimatedNumber(kpi.availability, 1);
  const performance = useAnimatedNumber(kpi.performance, 1);
  const oee = useAnimatedNumber(kpi.oee, 1);

  return (
    <div className="kpi-row">
      <div className="kpi-card" style={{ '--kpi-color': 'var(--red)' }} onClick={() => navigate('maintenance')}>
        <div className="kpi-label">Breakdown</div>
        <div><span className="kpi-value">{breakdowns}</span><span className="kpi-unit">kasus</span></div>
        <div className="kpi-trend neutral">{kpi.breakdowns} kasus</div>
        <div className="kpi-icon">⚡</div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--accent2)' }}>
        <div className="kpi-label">Downtime</div>
        <div><span className="kpi-value">{downtime}</span><span className="kpi-unit">jam</span></div>
        <div className="kpi-trend neutral">{kpi.downtime_hrs?.toFixed(1)} jam</div>
        <div className="kpi-icon">⏱</div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
        <div className="kpi-label">Availability</div>
        <div><span className="kpi-value">{availability}</span><span className="kpi-unit">%</span></div>
        <div className={trendClass(kpi.availability ?? 0, 90)}>{kpi.availability?.toFixed(1)}% · target 90%</div>
        <div className="kpi-icon">📡</div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--purple)' }}>
        <div className="kpi-label">Performance</div>
        <div><span className="kpi-value">{performance}</span><span className="kpi-unit">%</span></div>
        <div className={trendClass(kpi.performance ?? 0, 95)}>{kpi.performance?.toFixed(1)}% · target 95%</div>
        <div className="kpi-icon">⚙️</div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--green)' }} onClick={() => openModal('oee')}>
        <div className="kpi-label">OEE</div>
        <div><span className="kpi-value">{oee}</span><span className="kpi-unit">%</span></div>
        <div className={trendClass(kpi.oee ?? 0, 85)}>{kpi.oee?.toFixed(1)}% · world class 85%</div>
        <div className="kpi-icon">🏆</div>
      </div>
    </div>
  );
}
