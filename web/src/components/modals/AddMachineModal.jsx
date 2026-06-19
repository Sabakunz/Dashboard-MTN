import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

export default function AddMachineModal() {
  const { closeModal } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [name, setName] = useState('');
  const [cluster, setCluster] = useState('');
  const [line, setLine] = useState('');
  const [errName, setErrName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = name.trim();
    setErrName(n ? '' : 'Required');
    if (!n) return;
    setBusy(true);
    try {
      await apiSend('/machines', 'POST', { name: n, cluster: cluster.trim(), line: line.trim() }, logout);
      showToast(`✅ Mesin ${n} ditambahkan`, 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Tambah Mesin" onClose={closeModal}>
      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Nama Mesin *</label>
          <input type="text" className={'form-input' + (errName ? ' error' : '')} placeholder="contoh. CNC-07" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="form-error">{errName}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Cluster</label>
          <input type="text" className="form-input" placeholder="contoh. Cluster A" value={cluster} onChange={(e) => setCluster(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Line</label>
          <input type="text" className="form-input" placeholder="contoh. Line 1" value={line} onChange={(e) => setLine(e.target.value)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Simpan Mesin'}</button>
      </div>
    </Modal>
  );
}
