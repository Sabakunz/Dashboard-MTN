import { Zap, Timer, Activity, RefreshCw, Wrench } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

function trendClass(v, tgt) { return 'kpi-trend ' + (v >= tgt ? 'up' : 'down'); }

export default function KpiRow({ kpi }) {
  const { navigate } = useUI();
  const breakdowns = useAnimatedNumber(kpi.breakdowns, 0);
  const downtime = useAnimatedNumber(kpi.downtime_hrs, 1);
  const availability = useAnimatedNumber(kpi.availability, 1);
  const mtbf = useAnimatedNumber(kpi.mtbf, 1);
  const mttr = useAnimatedNumber(kpi.mttr, 1);

  return (
    <div className="kpi-row">
      <div className="kpi-card" style={{ '--kpi-color': 'var(--red)' }} onClick={() => navigate('maintenance')}>
        <div className="kpi-label">Breakdown</div>
        <div><span className="kpi-value">{breakdowns}</span><span className="kpi-unit">kasus</span></div>
        <div className="kpi-trend neutral">{kpi.breakdowns} kasus</div>
        <div className="kpi-icon"><Zap size={18} /></div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--accent2)' }}>
        <div className="kpi-label">Downtime</div>
        <div><span className="kpi-value">{downtime}</span><span className="kpi-unit">jam</span></div>
        <div className="kpi-trend neutral">{kpi.downtime_hrs?.toFixed(1)} jam</div>
        <div className="kpi-icon"><Timer size={18} /></div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
        <div className="kpi-label">Availability</div>
        <div><span className="kpi-value">{availability}</span><span className="kpi-unit">%</span></div>
        <div className={trendClass(kpi.availability ?? 0, 90)}>{kpi.availability?.toFixed(1)}% · target 90%</div>
        <div className="kpi-icon"><Activity size={18} /></div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--purple)' }}>
        <div className="kpi-label">MTBF</div>
        <div><span className="kpi-value">{mtbf}</span><span className="kpi-unit">jam</span></div>
        <div className="kpi-trend neutral">jam antara problem</div>
        <div className="kpi-icon"><RefreshCw size={18} /></div>
      </div>
      <div className="kpi-card" style={{ '--kpi-color': 'var(--green)' }}>
        <div className="kpi-label">MTTR</div>
        <div><span className="kpi-value">{mttr}</span><span className="kpi-unit">jam</span></div>
        <div className="kpi-trend neutral">jam untuk perbaikan</div>
        <div className="kpi-icon"><Wrench size={18} /></div>
      </div>
    </div>
  );
}
