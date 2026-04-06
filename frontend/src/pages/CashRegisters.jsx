import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createCashRegister,
  deleteCashRegister,
  getCashRegisters,
  updateCashRegister,
} from '../services/cashService';

const initialForm = { id: null, name: '', active: true };

function CashRegisters() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const data = await getCashRegisters();
    setRows(data);
  };

  useEffect(() => {
    load();
  }, []);

  const isEdit = useMemo(() => Boolean(form.id), [form.id]);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    const duplicate = rows.some((row) => row.name.toLowerCase() === form.name.toLowerCase() && row.id !== form.id);
    if (duplicate) {
      setError('Ya existe una caja con ese nombre.');
      return;
    }

    if (isEdit) {
      await updateCashRegister(form.id, form);
    } else {
      await createCashRegister(form);
    }

    setShowModal(false);
    setForm(initialForm);
    setError('');
    await load();
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`¿Eliminar la caja "${row.name}"?`);
    if (!ok) return;
    try {
      await deleteCashRegister(row.id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se puede eliminar esta caja porque tiene movimientos.');
    }
  };

  const columns = [
    { key: 'id', label: 'ID', accessor: (r) => r.id, sortable: true },
    { key: 'name', label: 'Nombre', accessor: (r) => r.name, sortable: true },
    {
      key: 'status',
      label: 'Estado',
      accessor: (r) => (Number(r.active) ? 'Activa' : 'Inactiva'),
      render: (r) => <span className={`badge ${Number(r.active) ? 'text-bg-success' : 'text-bg-danger'}`}>{Number(r.active) ? 'Activa' : 'Inactiva'}</span>,
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Fecha creación',
      accessor: (r) => new Date(r.created_at).toISOString(),
      render: (r) => new Date(r.created_at).toLocaleString(),
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Acciones',
      accessor: () => '',
      render: (r) => (
        <div className="admin-actions-row">
          <button type="button" className="touch-btn" onClick={() => { setForm({ id: r.id, name: r.name, active: Number(r.active) === 1 }); setShowModal(true); }}>Editar</button>
          <button type="button" className="touch-btn btn-danger" onClick={() => handleDelete(r)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content cash-registers-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Cajas</h2>
          <button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setShowModal(true); }}>Nueva caja</button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable title="Administración de cajas" columns={columns} rows={rows} pageSize={10} />
      </main>

      {showModal && (
        <Modal
          title={isEdit ? 'Editar caja' : 'Crear caja'}
          onClose={() => setShowModal(false)}
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="button" className="touch-btn btn-primary" onClick={submit}>Guardar</button>
            </>
          )}
        >
          <div className="cash-modal-form">
            <label>Nombre
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label>Estado
              <select value={form.active ? '1' : '0'} onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === '1' }))}>
                <option value="1">Activa</option>
                <option value="0">Inactiva</option>
              </select>
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CashRegisters;
