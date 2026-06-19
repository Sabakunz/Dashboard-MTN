import { useUI } from '../UIContext.jsx';
import AddBreakdownModal from './modals/AddBreakdownModal.jsx';
import CloseWOModal from './modals/CloseWOModal.jsx';
import AddMachineModal from './modals/AddMachineModal.jsx';
import ImportModal from './modals/ImportModal.jsx';
import OeeModal from './modals/OeeModal.jsx';

export default function ModalRoot() {
  const { activeModal, modalPayload } = useUI();

  switch (activeModal) {
    case 'addBreakdown': return <AddBreakdownModal />;
    case 'closeWO': return <CloseWOModal payload={modalPayload} />;
    case 'addMachine': return <AddMachineModal />;
    case 'import': return <ImportModal />;
    case 'oee': return <OeeModal />;
    default: return null;
  }
}
