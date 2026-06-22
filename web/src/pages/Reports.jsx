import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { exportCSV } from '../lib/exportCSV.js';
import { apiDownload } from '../api.js';

const REPORT_NAMES = { availability: 'Rangkuman Availability', breakdown: 'Analisis Breakdown', pm: 'Jadwal Preventive Maintenance' };

export default function Reports() {
  const { machines } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  function genReport(t) {
    const n = REPORT_NAMES[t] || t;
    showToast(`📊 Mengadakan ${n}…`, 'green');
    setTimeout(() => showToast(`✅ ${n} siap — Sambung backend untuk PDF`, 'green'), 1400);
  }

  function doExport() {
    exportCSV(machines);
    showToast('✅ Diekspor ke CSV', 'green');
  }

  async function doExportWorkOrders() {
    try {
      await apiDownload('/export/work-orders', `work-orders-${new Date().toISOString().slice(0, 10)}.csv`, logout);
      showToast('✅ Log Work Order diekspor ke CSV', 'green');
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
  }

  return (
    <div className="page-view active">
      <div className="page-header"><div><div className="page-title">Reports</div></div></div>
      <div className="report-grid">
        <div className="report-card" onClick={() => genReport('availability')}>
          <div className="report-icon">📊</div><div className="report-title">Rangkuman Availability</div>
          <div className="report-desc">Availability per Mesin, MTBF, MTTR</div>
        </div>
        <div className="report-card" onClick={() => genReport('breakdown')}>
          <div className="report-icon">⚡</div><div className="report-title">Analisis Breakdown</div>
          <div className="report-desc">MTBF, MTTR, Penyebab Kerusakan (Pareto)</div>
        </div>
        <div className="report-card" onClick={doExport}>
          <div className="report-icon">📥</div><div className="report-title">Export Mesin (CSV)</div>
          <div className="report-desc">Unduh Data Mesin ke Sheet</div>
        </div>
        <div className="report-card" onClick={doExportWorkOrders}>
          <div className="report-icon">📑</div><div className="report-title">Export Log Work Order (CSV)</div>
          <div className="report-desc">Unduh seluruh riwayat RMO untuk Excel — sama dengan view "work_order_export" di pgAdmin</div>
        </div>
        <div className="report-card" onClick={() => genReport('pm')}>
          <div className="report-icon">🔧</div><div className="report-title">Jadwal Preventive Maintenance</div>
          <div className="report-desc">Rencana Pekerjaan Preventive Maintenance</div>
        </div>
      </div>
    </div>
  );
}
