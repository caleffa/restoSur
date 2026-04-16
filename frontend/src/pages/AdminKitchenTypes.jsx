import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createKitchenType,
  deleteKitchenType,
  getKitchenTypes,
  updateKitchenType,
} from '../services/adminService';

const initialForm = { name: '', description: '', active: true };

function AdminKitchenTypes() {
  const [kitchenTypes, setKitchenTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadKitchenTypes = useCallback(async () => {
    try {
      const data = await getKitchenTypes();
      setKitchenTypes(data);
      setError('');
    } catch {
      setError('No se pudo cargar la información de tipos de cocina.');
    }
  }, []);

  useEffect(() => {
    loadKitchenTypes();
  }, [loadKitchenTypes]);

  const onCreateOrUpdate = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: form.name,
        description: form.description || null,
        active: form.active,
      };

      if (editingId) {
        await updateKitchenType(editingId, payload);
      } else {
        await createKitchenType(payload);
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormModalOpen(false);
      await loadKitchenTypes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el tipo de cocina.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || loading) return;

    try {
      setLoading(true);
      await deleteKitchenType(pendingDelete.id);
      setPendingDelete(null);
      await loadKitchenTypes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar el tipo de cocina.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de tipos de cocina</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => setIsFormModalOpen(true)}>
            Nuevo tipo de cocina
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Tipos de cocina"
          rows={kitchenTypes}
          filters={[
            {
              key: 'active',
              label: 'Estado',
              accessor: (row) => (row.active === 1 || row.active === true ? '1' : '0'),
              options: [
                { value: '1', label: 'Activos' },
                { value: '0', label: 'Inactivos' },
              ],
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'description', label: 'Descripción', accessor: (row) => row.description || '-' },
            { key: 'active', label: 'Estado', accessor: (row) => (row.active === 1 || row.active === true ? 'Activo' : 'Inactivo') },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button
                    type="button"
                    className="touch-btn"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({ name: row.name || '', description: row.description || '', active: row.active === 1 || row.active === true });
                      setIsFormModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDelete(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingId ? 'Editar tipo de cocina' : 'Nuevo tipo de cocina'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingId(null);
              setForm(initialForm);
            }}
            size="sm"
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdate}>
              <input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <textarea
                placeholder="Descripción"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <label>
                <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} /> Activo
              </label>
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => setIsFormModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDelete && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDelete(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDelete(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDelete} disabled={loading}>Sí, eliminar</button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar este tipo de cocina?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminKitchenTypes;
