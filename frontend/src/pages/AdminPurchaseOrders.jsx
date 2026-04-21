import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createPurchaseOrder,
  getArticles,
  getPurchaseOrders,
  getSuppliers,
} from '../services/adminService';
import { formatNumber } from '../utils/formatters';

const INITIAL_FORM = {
  supplierId: '',
  notes: '',
  items: [{ articleId: '', quantity: '', unitCost: '' }],
};

function statusLabel(status) {
  switch (status) {
    case 'EMITIDA': return 'Emitida';
    case 'RECEPCION_PARCIAL': return 'Recepción parcial';
    case 'RECIBIDA_TOTAL': return 'Recibida total';
    case 'CERRADA_CON_DIFERENCIAS': return 'Cerrada con diferencias';
    case 'CANCELADA': return 'Cancelada';
    default: return status;
  }
}

function AdminPurchaseOrders() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, suppliersData, articlesData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getArticles(),
      ]);
      setRows(ordersData);
      setSuppliers(suppliersData.filter((supplier) => Number(supplier.active) === 1));
      setArticles(articlesData.filter((article) => Number(article.active) === 1));
      setError('');
    } catch {
      setError('No se pudo cargar la administración de órdenes de compra.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const articleOptions = useMemo(
    () => articles.map((article) => ({
      value: String(article.id),
      label: `${article.name} (${article.sku})`,
    })),
    [articles],
  );

  const addItemRow = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { articleId: '', quantity: '', unitCost: '' }] }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const updateItemRow = (index, changes) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, ...changes } : item)),
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        supplierId: Number(form.supplierId),
        notes: form.notes,
        items: form.items.map((item) => ({
          articleId: Number(item.articleId),
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      };

      await createPurchaseOrder(payload);

      setForm(INITIAL_FORM);
      setSuccess('Orden de compra creada correctamente.');
      await loadData();
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'No se pudo crear la orden de compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Órdenes de compra</h2>

        <section className="admin-card">
          <h3>Nueva orden</h3>
          <form className="admin-table-form purchase-order-form" onSubmit={onSubmit}>
            <select
              value={form.supplierId}
              onChange={(event) => setForm((prev) => ({ ...prev, supplierId: event.target.value }))}
              required
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.business_name}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Observaciones (opcional)"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />

            <div className="purchase-order-items-block">
              {form.items.map((item, index) => (
                <div key={`item-${index + 1}`} className="purchase-order-item-row">
                  <select
                    value={item.articleId}
                    onChange={(event) => updateItemRow(index, { articleId: event.target.value })}
                    required
                  >
                    <option value="">Artículo</option>
                    {articleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="Cantidad"
                    value={item.quantity}
                    onChange={(event) => updateItemRow(index, { quantity: event.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Costo unitario"
                    value={item.unitCost}
                    onChange={(event) => updateItemRow(index, { unitCost: event.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="touch-btn btn-danger"
                    onClick={() => removeItemRow(index)}
                    disabled={form.items.length === 1}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-actions-row">
              <button type="button" className="touch-btn" onClick={addItemRow}>Agregar artículo</button>
              <button type="submit" className="touch-btn btn-primary" disabled={loading}>Crear orden</button>
            </div>
          </form>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </section>

        <SimpleDataTable
          title="Listado de órdenes"
          rows={rows}
          columns={[
            { key: 'id', label: 'N°', accessor: (row) => row.id, sortable: true },
            { key: 'supplier_name', label: 'Proveedor', accessor: (row) => row.supplier_name, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => statusLabel(row.status), sortable: true },
            {
              key: 'ordered',
              label: 'Cant. pedida',
              accessor: (row) => formatNumber(row.total_quantity_ordered || 0, 3),
              sortable: true,
            },
            {
              key: 'received',
              label: 'Cant. recibida',
              accessor: (row) => formatNumber(row.total_quantity_received || 0, 3),
              sortable: true,
            },
            {
              key: 'created_at',
              label: 'Fecha',
              accessor: (row) => new Date(row.created_at).toLocaleString(),
              sortable: true,
            },
            {
              key: 'total_cost',
              label: 'Costo total',
              accessor: (row) => `$ ${formatNumber(row.total_cost || 0, 2)}`,
              sortable: true,
            },
          ]}
        />
      </main>
    </div>
  );
}

export default AdminPurchaseOrders;
