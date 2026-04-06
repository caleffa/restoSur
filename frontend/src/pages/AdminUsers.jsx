import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { createUser, deleteUser, getUsers, updateUser } from '../services/adminService';

const ROLE_OPTIONS = ['ADMIN', 'CAJERO', 'MOZO', 'COCINA'];
const initialUser = { name: '', email: '', password: '', role: 'MOZO', branchId: 1, active: true };

function AdminUsers() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(initialUser);
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de usuarios.');
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      await loadUsers();
    } catch {
      setError('No se pudo guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Administración de usuarios</h2>

        <div className="admin-actions-row">
          <Link className={`touch-btn ${location.pathname.includes('/users') ? 'active' : ''}`} to="/admin/management/users">Usuarios</Link>
          <Link className="touch-btn" to="/admin/management/categories">Categorías</Link>
          <Link className="touch-btn" to="/admin/management/products">Productos</Link>
        </div>

        {error && <p className="error-text">{error}</p>}

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
                      await loadUsers();
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
      </main>
    </div>
  );
}

export default AdminUsers;
