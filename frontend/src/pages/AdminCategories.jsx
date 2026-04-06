import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../services/adminService';

const initialCategory = { name: '' };

function AdminCategories() {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
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
      await loadCategories();
    } catch {
      setError('No se pudo guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Administración de categorías</h2>

        <div className="admin-actions-row">
          <Link className="touch-btn" to="/admin/management/users">Usuarios</Link>
          <Link className={`touch-btn ${location.pathname.includes('/categories') ? 'active' : ''}`} to="/admin/management/categories">Categorías</Link>
          <Link className="touch-btn" to="/admin/management/products">Productos</Link>
        </div>

        {error && <p className="error-text">{error}</p>}

        <form className="admin-table-form" onSubmit={onCreateOrUpdateCategory}>
          <h3>{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <input placeholder="Nombre de categoría" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} required />
          <div className="admin-actions-row">
            <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingCategoryId ? 'Actualizar' : 'Crear'}</button>
            {editingCategoryId && <button type="button" className="touch-btn" onClick={() => { setEditingCategoryId(null); setCategoryForm(initialCategory); }}>Cancelar</button>}
          </div>
        </form>

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
                  <button type="button" className="touch-btn" onClick={() => {
                    setEditingCategoryId(row.id);
                    setCategoryForm({ name: row.name });
                  }}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      await deleteCategory(row.id);
                      await loadCategories();
                    } catch {
                      setError('No se pudo eliminar la categoría.');
                    } finally {
                      setLoading(false);
                    }
                  }}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />
      </main>
    </div>
  );
}

export default AdminCategories;
