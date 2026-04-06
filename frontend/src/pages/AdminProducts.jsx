import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from '../services/adminService';

const initialProduct = { name: '', price: '', categoryId: '', hasStock: true, active: true };

function AdminProducts() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productForm, setProductForm] = useState(initialProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([getCategories(), getProducts()]);
      setCategories(categoriesData);
      setProducts(productsData);
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
      await loadData();
    } catch {
      setError('No se pudo guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Administración de productos</h2>

        <div className="admin-actions-row">
          <Link className="touch-btn" to="/admin/management/users">Usuarios</Link>
          <Link className="touch-btn" to="/admin/management/categories">Categorías</Link>
          <Link className={`touch-btn ${location.pathname.includes('/products') ? 'active' : ''}`} to="/admin/management/products">Productos</Link>
        </div>

        {error && <p className="error-text">{error}</p>}

        <form className="admin-table-form" onSubmit={onCreateOrUpdateProduct}>
          <h3>{editingProductId ? 'Editar producto' : 'Nuevo producto'}</h3>
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
            {editingProductId && <button type="button" className="touch-btn" onClick={() => { setEditingProductId(null); setProductForm(initialProduct); }}>Cancelar</button>}
          </div>
        </form>

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
            { key: 'price', label: 'Precio', accessor: (row) => Number(row.price).toFixed(2), sortable: true },
            { key: 'stock', label: 'Stock', accessor: (row) => ((row.has_stock ?? row.hasStock) ? 'Sí' : 'No') },
            { key: 'status', label: 'Estado', accessor: (row) => ((row.active === 1 || row.active === true) ? 'Activo' : 'Inactivo') },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => {
                    setEditingProductId(row.id);
                    setProductForm({
                      name: row.name,
                      price: row.price,
                      categoryId: row.category_id ?? row.categoryId,
                      hasStock: Boolean(row.has_stock ?? row.hasStock),
                      active: row.active === 1 || row.active === true,
                    });
                  }}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      await deleteProduct(row.id);
                      await loadData();
                    } catch {
                      setError('No se pudo eliminar el producto.');
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

export default AdminProducts;
