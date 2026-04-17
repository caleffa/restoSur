import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createCustomer, deleteCustomer, getCustomers, getVatTypes, updateCustomer } from '../services/adminService';

const initialForm = {
  firstName: '', lastName: '', documentType: 'DNI', documentNumber: '', cuit: '', vatTypeId: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', active: true,
};

function AdminCustomers() {
  const [rows, setRows] = useState([]);
  const [vatTypes, setVatTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [customerData, vatData] = await Promise.all([getCustomers(), getVatTypes()]);
      setRows(customerData);
      setVatTypes(vatData.filter((item) => Number(item.active) === 1));
      setError('');
    } catch {
      setError('No se pudieron cargar clientes.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, vatTypeId: form.vatTypeId ? Number(form.vatTypeId) : null };
      if (editingId) await updateCustomer(editingId, payload);
      else await createCustomer(payload);
      setIsFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar cliente.');
    }
  };

  return (
    <div className="app-layout"><Navbar /><main className="content admin-management-screen">
      <div className="d-flex justify-content-between align-items-center mb-3"><h2>Clientes</h2><button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setEditingId(null); setIsFormOpen(true); }}>Nuevo cliente</button></div>
      {error && <p className="error-text">{error}</p>}
      <SimpleDataTable title="Listado" rows={rows} columns={[
        { key: 'name', label: 'Nombre', accessor: (row) => `${row.last_name}, ${row.first_name}`, sortable: true },
        { key: 'document', label: 'Documento', accessor: (row) => `${row.document_type || 'DNI'} ${row.document_number || '-'}` },
        { key: 'vat', label: 'Condición IVA', accessor: (row) => row.vat_type_name || '-' },
        { key: 'phone', label: 'Teléfono', accessor: (row) => row.phone || '-' },
        { key: 'actions', label: 'Acciones', accessor: () => '', render: (row) => <div className="admin-actions-row"><button type="button" className="touch-btn" onClick={() => { setEditingId(row.id); setForm({ firstName: row.first_name || '', lastName: row.last_name || '', documentType: row.document_type || 'DNI', documentNumber: row.document_number || '', cuit: row.cuit || '', vatTypeId: row.vat_type_id || '', email: row.email || '', phone: row.phone || '', address: row.address || '', city: row.city || '', province: row.province || '', postalCode: row.postal_code || '', active: Number(row.active) === 1 }); setIsFormOpen(true); }}>Editar</button><button type="button" className="touch-btn btn-danger" onClick={async () => { await deleteCustomer(row.id); await loadData(); }}>Eliminar</button></div> },
      ]} />

      {isFormOpen && <Modal title={editingId ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setIsFormOpen(false)}><form className="admin-table-form modal-form" onSubmit={save}><div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}><input placeholder="Nombre" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required /><input placeholder="Apellido" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required /><select value={form.documentType} onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}><option value="DNI">DNI</option><option value="CUIT">CUIT</option><option value="PASAPORTE">PASAPORTE</option></select><input placeholder="N° documento" value={form.documentNumber} onChange={(e) => setForm((p) => ({ ...p, documentNumber: e.target.value }))} /><input placeholder="CUIT" value={form.cuit} onChange={(e) => setForm((p) => ({ ...p, cuit: e.target.value }))} /><select value={form.vatTypeId} onChange={(e) => setForm((p) => ({ ...p, vatTypeId: e.target.value }))}><option value="">Condición de IVA</option>{vatTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /><input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /><input placeholder="Dirección" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /><div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}><input placeholder="Ciudad" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /><input placeholder="Provincia" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} /><input placeholder="CP" value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} /></div><label><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Activo</label><div className="admin-actions-row"><button className="touch-btn btn-primary" type="submit">{editingId ? 'Actualizar' : 'Crear'}</button><button type="button" className="touch-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button></div></form></Modal>}
    </main></div>
  );
}

export default AdminCustomers;
