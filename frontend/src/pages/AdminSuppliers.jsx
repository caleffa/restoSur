import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import { createSupplier, deleteSupplier, getSuppliers, getVatTypes, updateSupplier } from '../services/adminService';

const initialForm = {
  businessName: '', fantasyName: '', cuit: '', vatTypeId: '', grossIncomeNumber: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', active: true,
};

function AdminSuppliers() {
  const [rows, setRows] = useState([]);
  const [vatTypes, setVatTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [supplierData, vatData] = await Promise.all([getSuppliers(), getVatTypes()]);
      setRows(supplierData);
      setVatTypes(vatData.filter((item) => Number(item.active) === 1));
      setError('');
    } catch {
      setError('No se pudo cargar proveedores.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, vatTypeId: form.vatTypeId ? Number(form.vatTypeId) : null };
      if (editingId) await updateSupplier(editingId, payload);
      else await createSupplier(payload);
      setIsFormOpen(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar proveedor.');
    }
  };

  return (
    <div className="app-layout"><Navbar /><main className="content admin-management-screen">
      <div className="d-flex justify-content-between align-items-center mb-3"><h2>Proveedores</h2><button type="button" className="touch-btn btn-primary" onClick={() => { setForm(initialForm); setEditingId(null); setIsFormOpen(true); }}>Nuevo proveedor</button></div>
      {error && <p className="error-text">{error}</p>}
      <SimpleDataTable title="Listado" rows={rows} columns={[
        { key: 'business_name', label: 'Razón social', accessor: (row) => row.business_name, sortable: true },
        { key: 'cuit', label: 'CUIT', accessor: (row) => row.cuit || '-' },
        { key: 'vat_type_name', label: 'Condición IVA', accessor: (row) => row.vat_type_name || '-' },
        { key: 'phone', label: 'Teléfono', accessor: (row) => row.phone || '-' },
        { key: 'actions', label: 'Acciones', accessor: () => '', render: (row) => <div className="admin-actions-row"><button type="button" className="touch-btn" onClick={() => { setEditingId(row.id); setForm({ businessName: row.business_name || '', fantasyName: row.fantasy_name || '', cuit: row.cuit || '', vatTypeId: row.vat_type_id || '', grossIncomeNumber: row.gross_income_number || '', email: row.email || '', phone: row.phone || '', address: row.address || '', city: row.city || '', province: row.province || '', postalCode: row.postal_code || '', active: Number(row.active) === 1 }); setIsFormOpen(true); }}>Editar</button><button type="button" className="touch-btn btn-danger" onClick={async () => { await deleteSupplier(row.id); await loadData(); }}>Eliminar</button></div> },
      ]} />

      {isFormOpen && <Modal title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setIsFormOpen(false)}><form className="admin-table-form modal-form" onSubmit={save}><input placeholder="Razón social" value={form.businessName} onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))} required /><input placeholder="Nombre de fantasía" value={form.fantasyName} onChange={(e) => setForm((p) => ({ ...p, fantasyName: e.target.value }))} /><input placeholder="CUIT" value={form.cuit} onChange={(e) => setForm((p) => ({ ...p, cuit: e.target.value }))} /><select value={form.vatTypeId} onChange={(e) => setForm((p) => ({ ...p, vatTypeId: e.target.value }))}><option value="">Condición de IVA</option>{vatTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input placeholder="Ingresos Brutos" value={form.grossIncomeNumber} onChange={(e) => setForm((p) => ({ ...p, grossIncomeNumber: e.target.value }))} /><input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /><input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /><input placeholder="Dirección" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /><div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}><input placeholder="Ciudad" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /><input placeholder="Provincia" value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} /><input placeholder="CP" value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} /></div><label><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Activo</label><div className="admin-actions-row"><button className="touch-btn btn-primary" type="submit">{editingId ? 'Actualizar' : 'Crear'}</button><button type="button" className="touch-btn" onClick={() => setIsFormOpen(false)}>Cancelar</button></div></form></Modal>}
    </main></div>
  );
}

export default AdminSuppliers;
