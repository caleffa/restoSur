import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createArticleType,
  deleteArticleType,
  getArticleTypes,
  updateArticleType,
} from '../services/adminService';

const initialForm = { name: '', description: '' };

function AdminArticleTypes() {
  const [articleTypes, setArticleTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadArticleTypes = useCallback(async () => {
    try {
      const data = await getArticleTypes();
      setArticleTypes(data);
      setError('');
    } catch {
      setError('No se pudo cargar la información de tipos de artículos.');
    }
  }, []);

  useEffect(() => {
    loadArticleTypes();
  }, [loadArticleTypes]);

  const onCreateOrUpdate = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: form.name,
        description: form.description || null,
      };

      if (editingId) {
        await updateArticleType(editingId, payload);
      } else {
        await createArticleType(payload);
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormModalOpen(false);
      await loadArticleTypes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el tipo de artículo.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name || '', description: row.description || '' });
    setIsFormModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || loading) return;

    try {
      setLoading(true);
      await deleteArticleType(pendingDelete.id);
      setPendingDelete(null);
      await loadArticleTypes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar el tipo de artículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de tipos de artículos</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nuevo tipo
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Tipos de artículos"
          rows={articleTypes}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'description', label: 'Descripción', accessor: (row) => row.description || '-' },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDelete(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingId ? 'Editar tipo de artículo' : 'Nuevo tipo de artículo'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingId(null);
              setForm(initialForm);
            }}
            size="sm"
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdate}>
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <textarea
                placeholder="Descripción"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancelar
                </button>
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
            <p>¿Está seguro que desea eliminar este tipo de artículo?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminArticleTypes;
