import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createCashReason, deleteCashReason, getCashReasons, updateCashReason } from '../services/adminService';

const initialForm = { description: '', type: 'EGRESO', active: true };

function AdminCashReasons() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await getCashReasons();
      setRows(data);
      setError('');
    } catch {
      setError('No se pudieron cargar los motivos de caja.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      if (editingId) {
        await updateCashReason(editingId, form);
      } else {
        await createCashReason(form);
      }
      setIsFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el motivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Motivos de caja</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setEditingId(null); setIsFormOpen(true); }}>
            Nuevo motivo
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Motivos"
          rows={rows}
          columns={[
            { key: 'description', label: 'Descripción', accessor: (row) => row.description, sortable: true },
            { key: 'type', label: 'Tipo', accessor: (row) => row.type, sortable: true },
            { key: 'active', label: 'Activo', accessor: (row) => (Number(row.active) === 1 ? 'Sí' : 'No') },
            {
              key: 'actions', label: 'Acciones', accessor: () => '', render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => { setEditingId(row.id); setForm({ description: row.description || '', type: row.type || 'EGRESO', active: Number(row.active) === 1 }); setIsFormOpen(true); }}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDelete(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormOpen && (
          <Modal title={editingId ? 'Editar motivo' : 'Nuevo motivo'} onClose={() => !loading && setIsFormOpen(false)} size="sm">
            <form className="admin-table-form modal-form" onSubmit={onSubmit}>
              <input placeholder="Descripción" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} required />
              <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="INGRESO">INGRESO</option>
                <option value="EGRESO">EGRESO</option>
              </select>
              <label><input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} /> Activo</label>
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDelete && (
          <Modal title="Confirmar eliminación" onClose={() => !loading && setPendingDelete(null)} size="sm" actions={<><button type="button" className="touch-btn" onClick={() => setPendingDelete(null)}>Cancelar</button><button type="button" className="touch-btn btn-danger" onClick={async () => { setLoading(true); try { await deleteCashReason(pendingDelete.id); setPendingDelete(null); await loadData(); } finally { setLoading(false); } }}>Eliminar</button></>}>
            <p>¿Desea eliminar este motivo?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminCashReasons;
