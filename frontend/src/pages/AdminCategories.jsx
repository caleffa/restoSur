import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createCategory, deleteCategory, getCategories, updateCategory } from '../services/adminService';

const initialCategory = { name: '', imageFile: null, imagePreview: '' };
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://localhost:3000/api').replace(/\/api\/?$/, '');

function resolveImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  if (imagePath.startsWith('/')) return `${API_BASE_URL}${imagePath}`;
  return imagePath;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

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
      const payload = { name: categoryForm.name };
      if (categoryForm.imageFile) {
        payload.imageData = await fileToDataUrl(categoryForm.imageFile);
        payload.imageName = categoryForm.imageFile.name;
      }
      if (editingCategoryId) {
        payload.removeImage = removeCurrentImage;
        await updateCategory(editingCategoryId, payload);
      } else {
        await createCategory(payload);
      }
      setCategoryForm(initialCategory);
      setEditingCategoryId(null);
      setRemoveCurrentImage(false);
      setIsFormModalOpen(false);
      await loadCategories();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategoryId(null);
    setCategoryForm(initialCategory);
    setRemoveCurrentImage(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingCategoryId(row.id);
    setCategoryForm({ name: row.name, imageFile: null, imagePreview: row.image || '' });
    setRemoveCurrentImage(false);
    setIsFormModalOpen(true);
  };

  const onImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setCategoryForm((prev) => ({ ...prev, imageFile: null }));
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Formato de imagen no compatible. Use JPG, PNG, WEBP o GIF.');
      event.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 2 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setCategoryForm((prev) => ({ ...prev, imageFile: file }));
    setRemoveCurrentImage(false);
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

        <section className="category-cards-grid">
          {categories.map((category) => (
            <article className="category-card" key={category.id}>
              <div className="category-card-image-wrap">
                {category.image ? (
                  <img src={resolveImageUrl(category.image)} alt={category.name} className="category-card-image" />
                ) : (
                  <div className="category-card-image-placeholder">Sin imagen
                  </div>
                )}
              </div>
              <div className="category-card-content">
                <h3>{category.name}</h3>
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(category)}>Editar​</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteCategory(category)}>X</button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {isFormModalOpen && (
          <Modal
            title={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingCategoryId(null);
              setCategoryForm(initialCategory);
              setRemoveCurrentImage(false);
            }}
            size="sm"
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdateCategory}>
              <input
                placeholder="Nombre de categoría"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImageChange} />
              <small>Formatos compatibles: JPG, PNG, WEBP y GIF. Tamaño máximo: 2 MB.</small>
              {editingCategoryId && categoryForm.imagePreview && !removeCurrentImage && !categoryForm.imageFile && (
                <img src={resolveImageUrl(categoryForm.imagePreview)} alt="Imagen actual" className="category-card-image" />
              )}
              {editingCategoryId && categoryForm.imagePreview && (
                <label className="d-flex align-items-center gap-2">
                  <input
                    type="checkbox"
                    checked={removeCurrentImage}
                    onChange={(e) => setRemoveCurrentImage(e.target.checked)}
                  />
                  Quitar imagen actual
                </label>
              )}
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingCategoryId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingCategoryId(null);
                  setCategoryForm(initialCategory);
                  setRemoveCurrentImage(false);
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
