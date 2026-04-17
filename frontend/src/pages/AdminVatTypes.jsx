import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createVatType, deleteVatType, getVatTypes, updateVatType } from '../services/adminService';

const initialForm = { name: '', code: '', description: '', active: true };

function AdminVatTypes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setRows(await getVatTypes());
      setError('');
    } catch {
      setError('No se pudieron cargar los tipos de IVA.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (event) => {
    event.preventDefault();
    if (loading) return;
    try {
      setLoading(true);
      if (editingId) await updateVatType(editingId, form);
      else await createVatType(form);
      setIsFormOpen(false);
      setForm(initialForm);
      setEditingId(null);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar el tipo de IVA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout"><Navbar /><main className="content admin-management-screen">
      <div className="d-flex justify-content-between align-items-center mb-3"><h2>Tipos de IVA</h2><button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setEditingId(null); setIsFormOpen(true); }}>Nuevo tipo</button></div>
      {error && <p className="error-text">{error}</p>}
      <SimpleDataTable title="Tipos" rows={rows} columns={[
        { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
        { key: 'code', label: 'Código', accessor: (row) => row.code, sortable: true },
        { key: 'description', label: 'Descripción', accessor: (row) => row.description || '-' },
        { key: 'active', label: 'Activo', accessor: (row) => (Number(row.active) === 1 ? 'Sí' : 'No') },
        { key: 'actions', label: 'Acciones', accessor: () => '', render: (row) => <div className="admin-actions-row"><button type="button" className="touch-btn" onClick={() => { setEditingId(row.id); setForm({ name: row.name || '', code: row.code || '', description: row.description || '', active: Number(row.active) === 1 }); setIsFormOpen(true); }}>Editar</button><button type="button" className="touch-btn btn-danger" onClick={async () => { setLoading(true); try { await deleteVatType(row.id); await loadData(); } finally { setLoading(false); } }}>Eliminar</button></div> },
      ]} />
      {isFormOpen && <Modal title={editingId ? 'Editar tipo de IVA' : 'Nuevo tipo de IVA'} onClose={() => !loading && setIsFormOpen(false)} size="sm"><form className="admin-table-form modal-form" onSubmit={save}><input placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /><input placeholder="Código" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required /><textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /><label><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Activo</label><div className="admin-actions-row"><button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button><button type="button" className="touch-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button></div></form></Modal>}
    </main></div>
  );
}

export default AdminVatTypes;
