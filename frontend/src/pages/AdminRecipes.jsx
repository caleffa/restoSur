import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createRecipe,
  deleteRecipe,
  getArticles,
  getRecipes,
  updateRecipe,
  getRecipeById,
} from '../services/adminService';

const initialForm = {
  productId: '',
  notes: '',
  active: true,
  items: [{ articleId: '', quantity: '' }],
};

function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [recipesData, productsData, articlesData] = await Promise.all([
        getRecipes(),
        getArticles({ isProduct: true }),
        getArticles({ isSupply: true }),
      ]);
      setRecipes(recipesData);
      setProducts(productsData);
      setArticles(articlesData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de recetas.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productMap = useMemo(
    () => Object.fromEntries(products.map((product) => [Number(product.id), product.name])),
    [products]
  );

  const articleMap = useMemo(
    () => Object.fromEntries(articles.map((article) => [Number(article.id), article])),
    [articles]
  );

  const resetAndCloseModal = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormModalOpen(false);
  };

  const openCreateModal = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = async (row) => {
    try {
      setLoading(true);
      const fullRecipe = await getRecipeById(row.id);
      setEditingId(fullRecipe.id);
      setForm({
        productId: fullRecipe.product_id,
        notes: fullRecipe.notes || '',
        active: fullRecipe.active === 1 || fullRecipe.active === true,
        items: (fullRecipe.items || []).map((item) => ({
          articleId: item.article_id,
          quantity: item.quantity,
        })),
      });
      setIsFormModalOpen(true);
    } catch {
      setError('No se pudo cargar la receta seleccionada.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { articleId: '', quantity: '' }] }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');

      const payload = {
        productId: Number(form.productId),
        notes: form.notes,
        active: Boolean(form.active),
        items: form.items
          .filter((item) => item.articleId && item.quantity)
          .map((item) => ({
            articleId: Number(item.articleId),
            quantity: Number(item.quantity),
          })),
      };

      if (editingId) {
        await updateRecipe(editingId, payload);
      } else {
        await createRecipe(payload);
      }

      resetAndCloseModal();
      await loadData();
    } catch (apiError) {
      const message = apiError?.response?.data?.message || 'No se pudo guardar la receta.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || loading) return;
    setLoading(true);
    try {
      await deleteRecipe(pendingDelete.id);
      setPendingDelete(null);
      await loadData();
    } catch {
      setError('No se pudo eliminar la receta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de recetas</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nueva receta
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Recetas"
          rows={recipes}
          columns={[
            { key: 'id', label: 'ID', accessor: (row) => row.id, sortable: true },
            { key: 'product', label: 'Producto', accessor: (row) => row.article_name || productMap[Number(row.product_id)] || '-', sortable: true },
            { key: 'itemsCount', label: 'Artículos', accessor: (row) => row.items_count || row.items?.length || 0, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => ((row.active === 1 || row.active === true) ? 'Activa' : 'Inactiva') },
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
          <Modal title={editingId ? 'Editar receta' : 'Nueva receta'} onClose={() => !loading && resetAndCloseModal()}>
            <form className="admin-table-form modal-form" onSubmit={submitForm}>
              <select value={form.productId} onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))} required>
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>

              <textarea
                placeholder="Notas (opcional)"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />

              <div>
                <strong>Insumos</strong>
                {form.items.map((item, index) => {
                  const selectedArticle = articleMap[Number(item.articleId)];
                  const unitLabel = selectedArticle ? `${selectedArticle.unit_name} (${selectedArticle.unit_code})` : '-';
                  return (
                    <div key={`recipe-item-${index}`} className="admin-actions-row" style={{ marginTop: 8 }}>
                      <select
                        value={item.articleId}
                        onChange={(e) => handleItemChange(index, 'articleId', e.target.value)}
                        required
                      >
                        <option value="">Seleccionar artículo</option>
                        {articles.map((article) => (
                          <option key={article.id} value={article.id}>{article.name} ({article.sku})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Cantidad"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                      <span className="text-muted" style={{ alignSelf: 'center' }}>{unitLabel}</span>
                      <button type="button" className="touch-btn btn-danger" onClick={() => removeItemRow(index)} disabled={form.items.length <= 1}>
                        Quitar
                      </button>
                    </div>
                  );
                })}
                <button type="button" className="touch-btn" onClick={addItemRow} style={{ marginTop: 8 }}>
                  Agregar insumo
                </button>
              </div>

              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                />{' '}
                Activa
              </label>

              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" className="touch-btn" onClick={resetAndCloseModal} disabled={loading}>
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
            <p>¿Está seguro que desea eliminar esta receta?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminRecipes;
