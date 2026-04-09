import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import CashMovementModal from '../components/CashMovementModal';
import CashCloseModal from '../components/CashCloseModal';
import PrintTicket from '../components/PrintTicket';
import {
  createExpense,
  createIncome,
  getCashRegisters,
  getCurrentCash,
  openCash,
  closeCash,
} from '../services/cashService';
import { formatCurrency } from '../utils/formatters';

function Cash() {
  const [registers, setRegisters] = useState([]);
  const [current, setCurrent] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [movementMode, setMovementMode] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [openForm, setOpenForm] = useState({ registerId: '', openingAmount: '', observation: '' });

  const load = async () => {
    const [registerData, currentData] = await Promise.all([getCashRegisters(), getCurrentCash()]);
    setRegisters(registerData.filter((row) => Number(row.active) === 1));
    setCurrent(currentData);
  };

  useEffect(() => {
    load();
  }, []);

  const submitOpen = async () => {
    const amount = Number(openForm.openingAmount);
    if (!openForm.registerId) return setError('Selecciona una caja para abrir.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('El monto inicial debe ser positivo.');

    setLoading(true);
    setError('');
    try {
      await openCash({ registerId: Number(openForm.registerId), openingAmount: amount, observation: openForm.observation });
      setShowOpenModal(false);
      setOpenForm({ registerId: '', openingAmount: '', observation: '' });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo abrir la caja.');
    } finally {
      setLoading(false);
    }
  };

  const handleMovement = async (payload) => {
    setLoading(true);
    setError('');
    try {
      if (payload.type === 'INGRESO') {
        await createIncome(payload);
      } else {
        await createExpense(payload);
      }
      setMovementMode('');
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo registrar el movimiento.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (payload) => {
    setLoading(true);
    setError('');
    try {
      const result = await closeCash(payload);
      const shift = current?.shift;
      setTicket({
        registerName: shift?.register_name || '-',
        userName: shift?.user_name || '-',
        openedAt: shift?.opened_at ? new Date(shift.opened_at).toLocaleString() : '-',
        closedAt: new Date().toLocaleString(),
        sales: Number(result?.totals?.sales || current?.totals?.sales || 0),
        incomes: Number(result?.totals?.incomes || current?.totals?.incomes || 0),
        expenses: Number(result?.totals?.expenses || current?.totals?.expenses || 0),
        expected: Number(result?.expectedBalance || current?.totals?.expectedBalance || 0),
        real: Number(result?.realBalance || payload.realBalance),
        difference: Number(result?.difference || 0),
      });
      setShowCloseModal(false);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo cerrar la caja.');
    } finally {
      setLoading(false);
    }
  };

  const shift = current?.shift;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content cash-screen">
        <div className="cash-status-card">
          <div>
            <h2 className="mb-1">Caja diaria</h2>
            <span className={`badge ${current?.status === 'ABIERTA' ? 'text-bg-success' : 'text-bg-danger'}`}>
              {current?.status || 'CERRADA'}
            </span>
          </div>
          {current?.status !== 'ABIERTA' ? (
            <button type="button" className="touch-btn btn-primary" onClick={() => setShowOpenModal(true)}>Abrir caja</button>
          ) : (
            <button type="button" className="touch-btn btn-danger" onClick={() => setShowCloseModal(true)}>Cerrar caja</button>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <section className="cash-info-grid">
          <article className="card shadow-sm"><div className="card-body">
            <h5>Estado actual</h5>
            <p className="mb-1"><strong>Caja:</strong> {shift?.register_name || '-'}</p>
            <p className="mb-1"><strong>Usuario:</strong> {shift?.user_name || '-'}</p>
            <p className="mb-1"><strong>Turno activo:</strong> {shift?.id || '-'}</p>
            <p className="mb-1"><strong>Saldo inicial:</strong> {formatCurrency(current?.totals?.openingBalance || 0)}</p>
            <p className="mb-0"><strong>Saldo actual:</strong> {formatCurrency(current?.totals?.expectedBalance || 0)}</p>
          </div></article>

          <article className="card shadow-sm"><div className="card-body">
            <h5>Acciones</h5>
            <div className="admin-actions-row">
              <button type="button" className="touch-btn" onClick={() => setMovementMode('INGRESO')} disabled={current?.status !== 'ABIERTA'}>Agregar ingreso</button>
              <button type="button" className="touch-btn" onClick={() => setMovementMode('EGRESO')} disabled={current?.status !== 'ABIERTA'}>Agregar egreso</button>
              <PrintTicket ticket={ticket} />
            </div>
          </div></article>
        </section>

        <section className="admin-card">
          <h4>Arqueo del turno</h4>
          <div className="admin-table-wrap">
            <table className="table table-striped align-middle mb-0">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Método</th><th>Motivo</th><th>Usuario</th></tr></thead>
              <tbody>
                {(current?.movements || []).length ? (current.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString()}</td>
                    <td>{m.type}</td>
                    <td>{formatCurrency(m.amount)}</td>
                    <td>{m.payment_method || '-'}</td>
                    <td>{m.reason || '-'}</td>
                    <td>{m.user_name || '-'}</td>
                  </tr>
                ))) : (
                  <tr><td colSpan="6" className="text-center py-4">Sin movimientos en el turno</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showOpenModal && (
        <Modal
          title="Apertura de caja"
          onClose={() => setShowOpenModal(false)}
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={() => setShowOpenModal(false)} disabled={loading}>Cancelar</button>
              <button type="button" className="touch-btn btn-primary" onClick={submitOpen} disabled={loading}>Abrir</button>
            </>
          )}
        >
          <div className="cash-modal-form">
            <label>Caja
              <select value={openForm.registerId} onChange={(e) => setOpenForm((p) => ({ ...p, registerId: e.target.value }))}>
                <option value="">Seleccionar</option>
                {registers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Monto inicial
              <input type="number" min="0" step="0.01" value={openForm.openingAmount} onChange={(e) => setOpenForm((p) => ({ ...p, openingAmount: e.target.value }))} />
            </label>
            <label>Observación
              <textarea rows="2" value={openForm.observation} onChange={(e) => setOpenForm((p) => ({ ...p, observation: e.target.value }))} />
            </label>
            <small>Fecha/hora: {new Date().toLocaleString()}</small>
          </div>
        </Modal>
      )}

      {movementMode && <CashMovementModal mode={movementMode} onClose={() => setMovementMode('')} onSubmit={handleMovement} loading={loading} />}
      {showCloseModal && <CashCloseModal data={current} onClose={() => setShowCloseModal(false)} onConfirm={handleClose} loading={loading} />}
    </div>
  );
}

export default Cash;
