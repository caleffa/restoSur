import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createArea, deleteArea, getAreas, updateArea } from '../services/adminService';

const initialForm = { name: '' };

function AdminAreas() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteArea, setPendingDeleteArea] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAreas = useCallback(async () => {
    try {
      const data = await getAreas();
      setAreas(data);
      setError('');
    } catch {
      setError('No se pudieron cargar las áreas.');
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormModalOpen(false);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (loading) return;

    const name = form.name.trim();
    if (!name) {
      setError('Ingresá un nombre de área válido.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (editingId) {
        await updateArea(editingId, { name });
      } else {
        await createArea({ name });
      }

      await loadAreas();
      resetForm();
    } catch {
      setError('No se pudo guardar el área.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteArea || loading) return;

    try {
      setLoading(true);
      setError('');
      await deleteArea(pendingDeleteArea.id);
      setPendingDeleteArea(null);
      await loadAreas();

      if (editingId === pendingDeleteArea.id) {
        resetForm();
      }
    } catch {
      setError('No se pudo eliminar el área.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de áreas</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => setIsFormModalOpen(true)}>
            Nueva área
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Áreas"
          rows={areas}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
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
                      setForm({ name: row.name });
                      setIsFormModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteArea(row)}>
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal title={editingId ? 'Editar área' : 'Nueva área'} onClose={() => !loading && resetForm()}>
            <form className="admin-table-form modal-form" onSubmit={submitForm}>
              <input
                id="areaName"
                type="text"
                placeholder="Nombre del área"
                value={form.name}
                onChange={(event) => setForm({ name: event.target.value })}
                required
              />

              <div className="admin-actions-row">
                <button type="submit" className="touch-btn btn-primary" disabled={loading}>
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" className="touch-btn" onClick={resetForm} disabled={loading}>
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDeleteArea && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDeleteArea(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDeleteArea(null)} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDelete} disabled={loading}>
                  Sí, eliminar
                </button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar esta área?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminAreas;
