import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../services/adminService';

const initialCategory = { name: '' };

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de categorías.');
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const onCreateOrUpdateCategory = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, { name: categoryForm.name });
      } else {
        await createCategory({ name: categoryForm.name });
      }
      setCategoryForm(initialCategory);
      setEditingCategoryId(null);
      setIsFormModalOpen(false);
      await loadCategories();
    } catch {
      setError('No se pudo guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategoryId(null);
    setCategoryForm(initialCategory);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingCategoryId(row.id);
    setCategoryForm({ name: row.name });
    setIsFormModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory || loading) return;
    setLoading(true);
    try {
      await deleteCategory(pendingDeleteCategory.id);
      setPendingDeleteCategory(null);
      await loadCategories();
    } catch {
      setError('No se pudo eliminar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de categorías</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nueva categoría
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Categorías"
          rows={categories}
          columns={[
            { key: 'id', label: 'ID', accessor: (row) => row.id, sortable: true },
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteCategory(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingCategoryId(null);
              setCategoryForm(initialCategory);
            }}
            size="sm"
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdateCategory}>
              <input placeholder="Nombre de categoría" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} required />
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingCategoryId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingCategoryId(null);
                  setCategoryForm(initialCategory);
                }}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDeleteCategory && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDeleteCategory(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDeleteCategory(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDeleteCategory} disabled={loading}>Sí, eliminar</button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar esta categoría?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminCategories;
