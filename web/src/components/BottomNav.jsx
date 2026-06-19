import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';

export default function BottomNav() {
  const { page, navigate, openModal } = useUI();
  const { kpi } = useApp();
  const hasAlert = (kpi.breakdowns ?? 0) > 0;

  return (
    <nav className="bottom-nav">
      <div className={'bn-item' + (page === 'dashboard' ? ' active' : '')} onClick={() => navigate('dashboard')}>
        <div className="bn-dot"></div><span className="bn-icon">📊</span><span className="bn-label">Dashboard</span>
      </div>
      <div className={'bn-item' + (page === 'machines' ? ' active' : '')} onClick={() => navigate('machines')}>
        <span className="bn-icon">⚙️</span><span className="bn-label">Mesin</span>
      </div>
      <div className={'bn-item' + (hasAlert ? ' has-alert' : '') + (page === 'maintenance' ? ' active' : '')} onClick={() => navigate('maintenance')}>
        <div className="bn-dot"></div><span className="bn-icon">🔧</span><span className="bn-label">Maintenance</span>
      </div>
      <div className="bn-item" onClick={() => openModal('addBreakdown')}>
        <span className="bn-icon">➕</span><span className="bn-label">RMO</span>
      </div>
      <div className={'bn-item' + (page === 'reports' ? ' active' : '')} onClick={() => navigate('reports')}>
        <span className="bn-icon">📈</span><span className="bn-label">Laporan</span>
      </div>
    </nav>
  );
}
