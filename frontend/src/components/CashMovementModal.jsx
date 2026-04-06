import { useState } from 'react';
import Modal from './Modal';

function CashMovementModal({ mode, onClose, onSubmit, loading = false }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');

  const title = mode === 'INGRESO' ? 'Agregar ingreso' : 'Agregar egreso';

  const handleSubmit = () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('El monto debe ser positivo.');
      return;
    }
    if (!reason.trim()) {
      setError('El motivo es obligatorio.');
      return;
    }

    onSubmit({ amount: parsed, reason, observation, type: mode });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="touch-btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="touch-btn btn-primary" onClick={handleSubmit} disabled={loading}>Guardar</button>
        </>
      )}
    >
      <div className="cash-modal-form">
        {error && <p className="error-text">{error}</p>}
        <label>Monto
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>Motivo
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label>Observación
          <textarea rows="2" value={observation} onChange={(e) => setObservation(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

export default CashMovementModal;
