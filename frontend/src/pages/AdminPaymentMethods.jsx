import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
} from '../services/adminService';

const initialForm = { name: '', code: '', displayOrder: 0, active: true };

function AdminPaymentMethods() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await getPaymentMethods();
      setRows(data);
      setError('');
    } catch {
      setError('No se pudieron cargar los medios de pago.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        code: String(form.code || '').toUpperCase().trim(),
        displayOrder: Number(form.displayOrder || 0),
      };
      if (editingId) {
        await updatePaymentMethod(editingId, payload);
      } else {
        await createPaymentMethod(payload);
      }
      setIsFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el medio de pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Medios de pago</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setEditingId(null); setIsFormOpen(true); }}>
            Nuevo medio
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Medios"
          rows={rows}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'code', label: 'Código', accessor: (row) => row.code, sortable: true },
            { key: 'display_order', label: 'Orden', accessor: (row) => Number(row.display_order ?? 0), sortable: true },
            { key: 'active', label: 'Activo', accessor: (row) => (Number(row.active) === 1 ? 'Sí' : 'No') },
            {
              key: 'actions', label: 'Acciones', accessor: () => '', render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => { setEditingId(row.id); setForm({ name: row.name || '', code: row.code || '', displayOrder: Number(row.display_order ?? 0), active: Number(row.active) === 1 }); setIsFormOpen(true); }}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDelete(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormOpen && (
          <Modal title={editingId ? 'Editar medio de pago' : 'Nuevo medio de pago'} onClose={() => !loading && setIsFormOpen(false)} size="sm">
            <form className="admin-table-form modal-form" onSubmit={onSubmit}>
              <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              <input placeholder="Código (ej: EFECTIVO)" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} required />
              <input type="number" min="0" placeholder="Orden" value={form.displayOrder} onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))} />
              <label><input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} /> Activo</label>
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDelete && (
          <Modal title="Confirmar eliminación" onClose={() => !loading && setPendingDelete(null)} size="sm" actions={<><button type="button" className="touch-btn" onClick={() => setPendingDelete(null)}>Cancelar</button><button type="button" className="touch-btn btn-danger" onClick={async () => { setLoading(true); try { await deletePaymentMethod(pendingDelete.id); setPendingDelete(null); await loadData(); } finally { setLoading(false); } }}>Eliminar</button></>}>
            <p>¿Desea eliminar este medio de pago?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminPaymentMethods;
