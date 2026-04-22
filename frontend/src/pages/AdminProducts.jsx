import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProductsCostReport,
  getProducts,
  updateProduct,
} from '../services/adminService';
import { formatCurrency } from '../utils/formatters';

const initialProduct = { name: '', price: '', categoryId: '', hasStock: true, active: true };

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [productsCostReport, setProductsCostReport] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productForm, setProductForm] = useState(initialProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [categoriesData, productsData, productsCostReportData] = await Promise.all([
        getCategories(),
        getProducts(),
        getProductsCostReport(),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
      setProductsCostReport(productsCostReportData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de productos.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [Number(category.id), category.name])),
    [categories],
  );

  const onCreateOrUpdateProduct = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: productForm.name,
        price: Number(productForm.price),
        categoryId: Number(productForm.categoryId),
        hasStock: Boolean(productForm.hasStock),
        active: Boolean(productForm.active),
      };

      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        await createProduct(payload);
      }

      setProductForm(initialProduct);
      setEditingProductId(null);
      setIsFormModalOpen(false);
      await loadData();
    } catch {
      setError('No se pudo guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setProductForm(initialProduct);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingProductId(row.id);
    setProductForm({
      name: row.name,
      price: row.price,
      categoryId: row.category_id ?? row.categoryId,
      hasStock: Boolean(row.has_stock ?? row.hasStock),
      active: row.active === 1 || row.active === true,
    });
    setIsFormModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct || loading) return;
    setLoading(true);
    try {
      await deleteProduct(pendingDeleteProduct.id);
      setPendingDeleteProduct(null);
      await loadData();
    } catch {
      setError('No se pudo eliminar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Administración de productos</h2>
        <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
          Nuevo producto
        </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Productos"
          rows={products}
          filters={[
            {
              key: 'active',
              label: 'Estado',
              accessor: (row) => String(row.active),
              options: [
                { value: '1', label: 'Activo' },
                { value: '0', label: 'Inactivo' },
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ],
            },
            {
              key: 'category',
              label: 'Categoría',
              accessor: (row) => String(row.category_id ?? row.categoryId ?? ''),
              options: categories.map((category) => ({ value: String(category.id), label: category.name })),
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'category', label: 'Categoría', accessor: (row) => categoryMap[Number(row.category_id ?? row.categoryId)] || '-', sortable: true },
            { key: 'price', label: 'Precio', accessor: (row) => formatCurrency(row.price), sortable: true },
            { key: 'stock', label: 'Stock', accessor: (row) => ((row.has_stock ?? row.hasStock) ? 'Sí' : 'No') },
            { key: 'status', label: 'Estado', accessor: (row) => ((row.active === 1 || row.active === true) ? 'Activo' : 'Inactivo') },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteProduct(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        <SimpleDataTable
          title="Reporte de costos por receta"
          rows={productsCostReport}
          columns={[
            { key: 'name', label: 'Producto', accessor: (row) => row.name, sortable: true },
            {
              key: 'category',
              label: 'Categoría',
              accessor: (row) => categoryMap[Number(row.category_id ?? row.categoryId)] || row.category_name || '-',
              sortable: true,
            },
            {
              key: 'salePrice',
              label: 'Precio venta',
              accessor: (row) => formatCurrency(row.sale_price ?? 0),
              sortAccessor: (row) => Number(row.sale_price ?? 0),
              sortable: true,
            },
            {
              key: 'recipeCost',
              label: 'Costo receta',
              accessor: (row) => formatCurrency(row.recipe_cost ?? 0),
              sortAccessor: (row) => Number(row.recipe_cost ?? 0),
              sortable: true,
            },
            {
              key: 'grossProfit',
              label: 'Ganancia bruta',
              accessor: (row) => formatCurrency(row.gross_profit ?? 0),
              sortAccessor: (row) => Number(row.gross_profit ?? 0),
              sortable: true,
            },
            {
              key: 'margin',
              label: 'Margen',
              accessor: (row) => `${Number(row.margin_percentage ?? 0).toFixed(2)}%`,
              sortAccessor: (row) => Number(row.margin_percentage ?? 0),
              sortable: true,
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingProductId ? 'Editar producto' : 'Nuevo producto'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingProductId(null);
              setProductForm(initialProduct);
            }}
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdateProduct}>
              <input placeholder="Nombre" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
              <input type="number" min="0" step="0.01" placeholder="Precio" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required />
              <select value={productForm.categoryId} onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))} required>
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <label><input type="checkbox" checked={productForm.hasStock} onChange={(e) => setProductForm((p) => ({ ...p, hasStock: e.target.checked }))} /> Maneja stock</label>
              <label><input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm((p) => ({ ...p, active: e.target.checked }))} /> Activo</label>
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingProductId ? 'Actualizar' : 'Crear'}</button>
                <button type="button" className="touch-btn" onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingProductId(null);
                  setProductForm(initialProduct);
                }}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDeleteProduct && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDeleteProduct(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDeleteProduct(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDeleteProduct} disabled={loading}>Sí, eliminar</button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar este producto?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminProducts;
