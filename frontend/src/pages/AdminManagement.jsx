import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createCategory,
  createProduct,
  createUser,
  deleteCategory,
  deleteProduct,
  deleteUser,
  getCategories,
  getProducts,
  getUsers,
  updateCategory,
  updateProduct,
  updateUser,
} from '../services/adminService';

const ROLE_OPTIONS = ['ADMIN', 'CAJERO', 'MOZO', 'COCINA'];

const initialUser = { name: '', email: '', password: '', role: 'MOZO', branchId: 1, active: true };
const initialCategory = { name: '' };
const initialProduct = { name: '', price: '', categoryId: '', hasStock: true, active: true };

function AdminManagement() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [userForm, setUserForm] = useState(initialUser);
  const [categoryForm, setCategoryForm] = useState(initialCategory);
  const [productForm, setProductForm] = useState(initialProduct);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [usersData, categoriesData, productsData] = await Promise.all([
        getUsers(),
        getCategories(),
        getProducts(),
      ]);
      setUsers(usersData);
      setCategories(categoriesData);
      setProducts(productsData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de administración.');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [Number(category.id), category.name])),
    [categories],
  );

  const onCreateOrUpdateUser = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');

      const payload = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        branchId: Number(userForm.branchId || 1),
        active: Boolean(userForm.active),
      };

      if (editingUserId) {
        await updateUser(editingUserId, payload);
      } else {
        await createUser({ ...payload, password: userForm.password });
      }

      setUserForm(initialUser);
      setEditingUserId(null);
      await loadAll();
    } catch {
      setError('No se pudo guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

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
      await loadAll();
    } catch {
      setError('No se pudo guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

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
      await loadAll();
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
        <h2>Panel admin: usuarios, productos y categorías</h2>
        {error && <p className="error-text">{error}</p>}

        <section className="admin-grid">
          <form className="admin-table-form" onSubmit={onCreateOrUpdateUser}>
            <h3>{editingUserId ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <input placeholder="Nombre" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} required />
            <input type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} required />
            {!editingUserId && (
              <input type="password" placeholder="Contraseña" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} required />
            )}
            <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <input type="number" min="1" placeholder="Sucursal" value={userForm.branchId} onChange={(e) => setUserForm((p) => ({ ...p, branchId: e.target.value }))} />
            <label><input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm((p) => ({ ...p, active: e.target.checked }))} /> Activo</label>
            <div className="admin-actions-row">
              <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingUserId ? 'Actualizar' : 'Crear'}</button>
              {editingUserId && <button type="button" className="touch-btn" onClick={() => { setEditingUserId(null); setUserForm(initialUser); }}>Cancelar</button>}
            </div>
          </form>

          <form className="admin-table-form" onSubmit={onCreateOrUpdateCategory}>
            <h3>{editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <input placeholder="Nombre de categoría" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} required />
            <div className="admin-actions-row">
              <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingCategoryId ? 'Actualizar' : 'Crear'}</button>
              {editingCategoryId && <button type="button" className="touch-btn" onClick={() => { setEditingCategoryId(null); setCategoryForm(initialCategory); }}>Cancelar</button>}
            </div>
          </form>

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
        </section>

        <SimpleDataTable
          title="Usuarios"
          rows={users}
          filters={[
            {
              key: 'role',
              label: 'Rol',
              accessor: (row) => row.role,
              options: ROLE_OPTIONS.map((role) => ({ value: role, label: role })),
            },
            {
              key: 'active',
              label: 'Estado',
              accessor: (row) => String(row.active),
              options: [
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ],
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'email', label: 'Email', accessor: (row) => row.email, sortable: true },
            { key: 'role', label: 'Rol', accessor: (row) => row.role, sortable: true },
            { key: 'branchId', label: 'Sucursal', accessor: (row) => row.branchId, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => (row.active ? 'Activo' : 'Inactivo') },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => {
                    setEditingUserId(row.id);
                    setUserForm({
                      name: row.name,
                      email: row.email,
                      password: '',
                      role: row.role,
                      branchId: row.branchId,
                      active: Boolean(row.active),
                    });
                  }}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      await deleteUser(row.id);
                      await loadAll();
                    } catch {
                      setError('No se pudo eliminar el usuario.');
                    } finally {
                      setLoading(false);
                    }
                  }}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

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
                      await loadAll();
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
                      await loadAll();
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

export default AdminManagement;
