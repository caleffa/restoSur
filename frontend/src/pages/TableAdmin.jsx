import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
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
  };

  const handleSubmit = async (event) => {
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

  const handleEdit = (table) => {
    setEditingId(table.id);
    setForm({
      tableNumber: String(table.table_number),
      status: table.status,
    });
  };

  const handleDelete = async (tableId) => {
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      await deleteTable(tableId);
      await loadTables();

      if (editingId === tableId) {
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
      <main className="content table-admin-screen">
        <h2>Administración de mesas</h2>

        {error && <p className="error-text">{error}</p>}

        <form className="admin-table-form" onSubmit={handleSubmit}>
          <label htmlFor="tableNumber">Número de mesa</label>
          <input
            id="tableNumber"
            type="number"
            min="1"
            value={form.tableNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, tableNumber: event.target.value }))}
          />

          <label htmlFor="tableStatus">Estado</label>
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
              {editingId ? 'Guardar cambios' : 'Crear mesa'}
            </button>
            {editingId && (
              <button type="button" className="touch-btn" onClick={resetForm} disabled={loading}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <section className="admin-table-list">
          {tables.map((table) => (
            <article key={table.id} className="admin-table-item">
              <div>
                <strong>Mesa {table.table_number}</strong>
                <p>Estado: {table.status}</p>
              </div>
              <div className="admin-actions-row">
                <button type="button" className="touch-btn" onClick={() => handleEdit(table)} disabled={loading}>
                  Editar
                </button>
                <button
                  type="button"
                  className="touch-btn btn-danger"
                  onClick={() => handleDelete(table.id)}
                  disabled={loading}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default TableAdmin;
