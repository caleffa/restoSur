import { useState } from 'react';
import Modal from '../Modal';

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

function PaymentModal({ total, onClose, onConfirm, loading }) {
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');

  return (
    <Modal
      title="Cerrar cuenta"
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => onConfirm(paymentMethod)}
          >
            Confirmar cierre
          </button>
        </>
      )}
      size="sm"
    >
      <div className="d-grid gap-3">
        <p className="mb-0">Total a cobrar: <strong>${Number(total).toFixed(2)}</strong></p>
        <div>
          <label className="form-label">Método de pago</label>
          <select className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

export default PaymentModal;
