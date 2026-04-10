import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { getAreas } from '../services/adminService';
import { createTable, deleteTable, getTables, updateTable } from '../services/tableService';

const TABLE_STATUS_OPTIONS = ['LIBRE', 'OCUPADA', 'CUENTA_PEDIDA', 'CERRADA'];

const initialForm = {
  tableNumber: '',
  capacity: '',
  status: 'LIBRE',
  areaId: '',
};

function TableAdmin() {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
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

  const loadAreas = useCallback(async () => {
    try {
      const data = await getAreas();
      setAreas(data);
    } catch {
      setError('No se pudieron cargar las áreas.');
    }
  }, []);

  useEffect(() => {
    loadTables();
    loadAreas();
  }, [loadTables, loadAreas]);

  const areaOptions = useMemo(
    () => areas.map((area) => ({ value: String(area.id), label: area.name })),
    [areas]
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsFormModalOpen(false);
  };

  const onCreateOrUpdateTable = async (event) => {
    event.preventDefault();
    if (loading) return;

    const tableNumber = Number(form.tableNumber);
    const capacity = Number(form.capacity);
    if (!tableNumber || tableNumber <= 0) {
      setError('Ingresá un número de mesa válido.');
      return;
    }
    if (!capacity || capacity <= 0) {
      setError('Ingresá una capacidad válida.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        tableNumber,
        capacity,
        status: form.status,
        areaId: form.areaId ? Number(form.areaId) : null,
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
      capacity: String(table.capacity || ''),
      status: table.status,
      areaId: table.area_id ? String(table.area_id) : '',
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
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de mesas</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nueva mesa
          </button>
        </div>

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
            {
              key: 'area',
              label: 'Área',
              accessor: (row) => String(row.area_id || ''),
              options: areaOptions,
            },
          ]}
          columns={[
            { key: 'tableNumber', label: 'Mesa', accessor: (row) => row.table_number, sortable: true },
            { key: 'area', label: 'Área', accessor: (row) => row.area_name || 'Sin área', sortable: true },
            { key: 'capacity', label: 'Capacidad', accessor: (row) => row.capacity, sortable: true },
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
                id="tableArea"
                value={form.areaId}
                onChange={(event) => setForm((prev) => ({ ...prev, areaId: event.target.value }))}
              >
                <option value="">Sin área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <input
                id="tableCapacity"
                type="number"
                min="1"
                placeholder="Capacidad"
                value={form.capacity}
                onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
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
