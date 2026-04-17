import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getCashReasonsByType } from '../services/cashService';

function CashMovementModal({ mode, onClose, onSubmit, loading = false }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [observation, setObservation] = useState('');
  const [availableReasons, setAvailableReasons] = useState([]);
  const [error, setError] = useState('');

  const title = mode === 'INGRESO' ? 'Agregar ingreso' : 'Agregar egreso';

  useEffect(() => {
    let mounted = true;

    const loadReasons = async () => {
      const reasons = await getCashReasonsByType(mode);
      if (mounted) setAvailableReasons(reasons.filter((item) => Number(item.active) === 1));
    };

    loadReasons();
    return () => {
      mounted = false;
    };
  }, [mode]);

  const onChangeReason = (value) => {
    setReasonId(value);
    const selected = availableReasons.find((item) => item.id === Number(value));
    if (selected) setReason(selected.description);
  };

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

    onSubmit({ amount: parsed, reason, reasonId: reasonId ? Number(reasonId) : null, observation, type: mode });
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
        <label>Motivo predeterminado
          <select value={reasonId} onChange={(e) => onChangeReason(e.target.value)}>
            <option value="">Seleccionar (opcional)</option>
            {availableReasons.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
          </select>
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
