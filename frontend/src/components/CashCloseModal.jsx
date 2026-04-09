import { useMemo, useState } from 'react';
import Modal from './Modal';
import { formatCurrency } from '../utils/formatters';

function CashCloseModal({ data, onClose, onConfirm, loading = false }) {
  const [realBalance, setRealBalance] = useState('');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');

  const expected = Number(data?.totals?.expectedBalance || 0);
  const difference = useMemo(() => {
    const real = Number(realBalance || 0);
    if (!Number.isFinite(real)) return 0;
    return Number((real - expected).toFixed(2));
  }, [realBalance, expected]);

  const handleConfirm = () => {
    if (realBalance === '') {
      setError('Debes ingresar el saldo real contado.');
      return;
    }
    const real = Number(realBalance);
    if (!Number.isFinite(real) || real < 0) {
      setError('Saldo real inválido.');
      return;
    }
    onConfirm({ realBalance: real, observation });
  };

  return (
    <Modal
      title="Cerrar caja"
      onClose={onClose}
      size="lg"
      actions={(
        <>
          <button type="button" className="touch-btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="touch-btn btn-danger" onClick={handleConfirm} disabled={loading}>Confirmar cierre</button>
        </>
      )}
    >
      <div className="cash-close-grid">
        {error && <p className="error-text">{error}</p>}
        <p><strong>Total ventas:</strong> {formatCurrency(data?.totals?.sales || 0)}</p>
        <p><strong>Ingresos manuales:</strong> {formatCurrency(data?.totals?.incomes || 0)}</p>
        <p><strong>Egresos:</strong> {formatCurrency(data?.totals?.expenses || 0)}</p>
        <p><strong>Saldo esperado:</strong> {formatCurrency(expected)}</p>
        <label>Saldo real contado
          <input type="number" min="0" step="0.01" value={realBalance} onChange={(e) => setRealBalance(e.target.value)} />
        </label>
        <p><strong>Diferencia:</strong> <span className={difference < 0 ? 'text-danger' : 'text-success'}>{formatCurrency(difference)}</span></p>
        <label>Observación de cierre
          <textarea rows="2" value={observation} onChange={(e) => setObservation(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

export default CashCloseModal;
