import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createKitchen,
  deleteKitchen,
  getKitchenTypes,
  getKitchens,
  updateKitchen,
} from '../services/adminService';

const initialForm = {
  kitchenTypeId: '',
  name: '',
  description: '',
  active: true,
};

function AdminKitchens() {
  const [kitchens, setKitchens] = useState([]);
  const [kitchenTypes, setKitchenTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [kitchensData, kitchenTypesData] = await Promise.all([getKitchens(), getKitchenTypes()]);
      setKitchens(kitchensData);
      setKitchenTypes(kitchenTypesData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de cocinas.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kitchenTypeOptions = useMemo(
    () => kitchenTypes.map((kitchenType) => ({ value: String(kitchenType.id), label: kitchenType.name })),
    [kitchenTypes]
  );

  const onCreateOrUpdate = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      const payload = {
        kitchenTypeId: Number(form.kitchenTypeId),
        name: form.name,
        description: form.description || null,
        active: form.active,
      };

      if (editingId) {
        await updateKitchen(editingId, payload);
      } else {
        await createKitchen(payload);
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar la cocina.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || loading) return;

    try {
      setLoading(true);
      await deleteKitchen(pendingDelete.id);
      setPendingDelete(null);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar la cocina.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de cocinas</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => setIsFormModalOpen(true)}>
            Nueva cocina
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Cocinas"
          rows={kitchens}
          filters={[
            {
              key: 'kitchenType',
              label: 'Tipo de cocina',
              accessor: (row) => String(row.kitchen_type_id),
              options: kitchenTypeOptions,
            },
            {
              key: 'active',
              label: 'Estado',
              accessor: (row) => (row.active === 1 || row.active === true ? '1' : '0'),
              options: [
                { value: '1', label: 'Activas' },
                { value: '0', label: 'Inactivas' },
              ],
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'type', label: 'Tipo', accessor: (row) => row.kitchen_type_name || '-' },
            { key: 'description', label: 'Descripción', accessor: (row) => row.description || '-' },
            { key: 'active', label: 'Estado', accessor: (row) => (row.active === 1 || row.active === true ? 'Activa' : 'Inactiva') },
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
                      setForm({
                        kitchenTypeId: String(row.kitchen_type_id || ''),
                        name: row.name || '',
                        description: row.description || '',
                        active: row.active === 1 || row.active === true,
                      });
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
            title={editingId ? 'Editar cocina' : 'Nueva cocina'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingId(null);
              setForm(initialForm);
            }}
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdate}>
              <select value={form.kitchenTypeId} onChange={(event) => setForm((prev) => ({ ...prev, kitchenTypeId: event.target.value }))} required>
                <option value="">Seleccionar tipo de cocina</option>
                {kitchenTypes.map((kitchenType) => (
                  <option key={kitchenType.id} value={kitchenType.id}>{kitchenType.name}</option>
                ))}
              </select>
              <input placeholder="Nombre" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <textarea
                placeholder="Descripción"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <label>
                <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} /> Activa
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
            <p>¿Está seguro que desea eliminar esta cocina?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminKitchens;
