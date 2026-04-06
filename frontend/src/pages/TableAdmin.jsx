import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createTable, deleteTable, getTables, updateTable } from '../services/tableService';

const TABLE_STATUS_OPTIONS = ['LIBRE', 'OCUPADA', 'CUENTA'];

const initialForm = {
  tableNumber: '',
  status: 'LIBRE',
};

function TableAdmin() {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDeleteTable, setPendingDeleteTable] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(data);
      setError('');
    } catch {
      setError('No se pudieron cargar las mesas.');
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormModalOpen(false);
  };

  const onCreateOrUpdateTable = async (event) => {
    event.preventDefault();
    if (loading) return;

    const tableNumber = Number(form.tableNumber);
    if (!tableNumber || tableNumber <= 0) {
      setError('Ingresá un número de mesa válido.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        tableNumber,
        status: form.status,
      };

      if (editingId) {
        await updateTable(editingId, payload);
      } else {
        await createTable(payload);
      }

      await loadTables();
      resetForm();
    } catch {
      setError('No se pudo guardar la mesa.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsFormModalOpen(true);
  };

  const openEditModal = (table) => {
    setEditingId(table.id);
    setForm({
      tableNumber: String(table.table_number),
      status: table.status,
    });
    setIsFormModalOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!pendingDeleteTable || loading) return;

    try {
      setLoading(true);
      setError('');
      await deleteTable(pendingDeleteTable.id);
      setPendingDeleteTable(null);
      await loadTables();

      if (editingId === pendingDeleteTable.id) {
        resetForm();
      }
    } catch {
      setError('No se pudo eliminar la mesa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Administración de mesas</h2>
        <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
          Nueva mesa
        </button>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Mesas"
          rows={tables}
          filters={[
            {
              key: 'status',
              label: 'Estado',
              accessor: (row) => row.status,
              options: TABLE_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
            },
          ]}
          columns={[
            { key: 'tableNumber', label: 'Mesa', accessor: (row) => row.table_number, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => row.status, sortable: true },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>
                    Editar
                  </button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDeleteTable(row)}>
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingId ? 'Editar mesa' : 'Nueva mesa'}
            onClose={() => {
              if (loading) return;
              resetForm();
            }}
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdateTable}>
              <input
                id="tableNumber"
                type="number"
                min="1"
                placeholder="Número de mesa"
                value={form.tableNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, tableNumber: event.target.value }))}
                required
              />

              <select
                id="tableStatus"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {TABLE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <div className="admin-actions-row">
                <button type="submit" className="touch-btn btn-primary" disabled={loading}>
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" className="touch-btn" onClick={resetForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDeleteTable && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDeleteTable(null)}
            actions={(
              <>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => setPendingDeleteTable(null)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="touch-btn btn-danger"
                  onClick={confirmDeleteTable}
                  disabled={loading}
                >
                  Sí, eliminar
                </button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar esta mesa?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default TableAdmin;
