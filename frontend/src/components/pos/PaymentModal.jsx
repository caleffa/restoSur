import { useMemo, useState } from 'react';
import Modal from '../Modal';

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

function PaymentModal({ total, hasItems, onClose, onConfirm, loading }) {
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const formattedTotal = useMemo(() => Number(total || 0).toFixed(2), [total]);

  return (
    <Modal
      title="Cobrar mesa"
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !hasItems || !confirmChecked}
            onClick={() => onConfirm(paymentMethod)}
          >
            Confirmar pago
          </button>
        </>
      )}
      size="sm"
    >
      <div className="d-grid gap-3">
        {!hasItems && <p className="text-danger mb-0">No se puede cobrar una venta sin productos.</p>}

        <p className="mb-0">
          Total a cobrar: <strong>${formattedTotal}</strong>
        </p>

        <div>
          <label className="form-label">Método de pago</label>
          <select className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </div>

        <label className="form-check d-flex align-items-center gap-2 mb-0">
          <input
            type="checkbox"
            className="form-check-input"
            checked={confirmChecked}
            onChange={(event) => setConfirmChecked(event.target.checked)}
          />
          <span className="form-check-label">Confirmo que deseo registrar y cobrar esta venta.</span>
        </label>
      </div>
    </Modal>
  );
}

export default PaymentModal;
