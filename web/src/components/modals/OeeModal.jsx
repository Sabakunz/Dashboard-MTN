import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';

export default function OeeModal() {
  const { closeModal } = useUI();
  const { kpi: d } = useApp();

  return (
    <Modal title="Analisis OEE" onClose={closeModal}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="detail-stat"><div className="detail-stat-val" style={{ color: 'var(--blue)' }}>{d.availability?.toFixed(1)}%</div><div className="detail-stat-lbl">Availability</div></div>
        <div className="detail-stat"><div className="detail-stat-val" style={{ color: 'var(--purple)' }}>{d.performance?.toFixed(1)}%</div><div className="detail-stat-lbl">Performance</div></div>
        <div className="detail-stat"><div className="detail-stat-val" style={{ color: 'var(--green)' }}>{d.quality?.toFixed(1)}%</div><div className="detail-stat-lbl">Quality</div></div>
      </div>
      <div style={{ background: 'var(--s2)', borderRadius: 8, padding: 12, marginBottom: 14, fontFamily: 'var(--mono)', fontSize: 13 }}>
        {d.availability?.toFixed(1)}% × {d.performance?.toFixed(1)}% × {d.quality?.toFixed(1)}% = <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{d.oee?.toFixed(1)}%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div className="detail-stat"><div className="detail-stat-val">{d.mtbf ?? '—'} h</div><div className="detail-stat-lbl">MTBF</div></div>
        <div className="detail-stat"><div className="detail-stat-val">{d.mttr ?? '—'} h</div><div className="detail-stat-lbl">MTTR</div></div>
      </div>
      <div style={{ background: 'var(--s2)', borderRadius: 8, padding: 11, fontSize: 11.5 }}>
        <div style={{ marginBottom: 5, fontWeight: 600 }}>OEE Benchmark</div>
        <span style={{ color: 'var(--green)' }}>● ≥85% World Class &nbsp;</span>
        <span style={{ color: 'var(--yellow)' }}>● 65–84% Good &nbsp;</span>
        <span style={{ color: 'var(--red)' }}>● &lt;65% Needs Work</span>
      </div>
      <div className="modal-footer"><button className="btn" onClick={closeModal}>Close</button></div>
    </Modal>
  );
}
