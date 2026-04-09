import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createUser, deleteUser, getUsers, updateUser } from '../services/adminService';

const ROLE_OPTIONS = ['ADMIN', 'CAJERO', 'MOZO', 'COCINA'];
const initialUser = { name: '', email: '', password: '', role: 'MOZO', branchId: 1, active: true };

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(initialUser);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
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
      setIsFormModalOpen(false);
      await loadUsers();
    } catch {
      setError('No se pudo guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    setUserForm(initialUser);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingUserId(row.id);
    setUserForm({
      name: row.name,
      email: row.email,
      password: '',
      role: row.role,
      branchId: row.branchId,
      active: Boolean(row.active),
    });
    setIsFormModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser || loading) return;
    setLoading(true);
    try {
      await deleteUser(pendingDeleteUser.id);
      setPendingDeleteUser(null);
      await loadUsers();
    } catch {
      setError('No se pudo eliminar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de usuarios</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nuevo usuario
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

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
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteUser(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingUserId ? 'Editar usuario' : 'Nuevo usuario'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingUserId(null);
              setUserForm(initialUser);
            }}
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdateUser}>
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
                <button type="button" className="touch-btn" onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingUserId(null);
                  setUserForm(initialUser);
                }}>Cancelar</button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDeleteUser && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDeleteUser(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDeleteUser(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDeleteUser} disabled={loading}>Sí, eliminar</button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar este usuario?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminUsers;
