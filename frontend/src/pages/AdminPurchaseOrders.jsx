import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createPurchaseOrder,
  getArticles,
  getPurchaseOrderById,
  getPurchaseOrders,
  getSuppliers,
} from '../services/adminService';
import { formatNumber } from '../utils/formatters';

const INITIAL_FORM = {
  supplierId: '',
  notes: '',
  items: [{ articleId: '', quantity: '', unitCost: '' }],
};

function parseArticleIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((id) => Number(id)).filter((id) => id > 0);
  return String(value)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => id > 0);
}

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
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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

  const articleOptions = useMemo(() => {
    if (!form.supplierId) return [];

    const selectedSupplier = suppliers.find((supplier) => Number(supplier.id) === Number(form.supplierId));
    const supplierArticleIds = new Set(parseArticleIds(selectedSupplier?.article_ids));

    return articles
      .filter((article) => supplierArticleIds.has(Number(article.id)))
      .map((article) => ({
        value: String(article.id),
        label: `${article.name} (${article.sku})`,
      }));
  }, [articles, form.supplierId, suppliers]);

  const orderTotalCost = useMemo(() => form.items.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    return total + (quantity * unitCost);
  }, 0), [form.items]);

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

  const openDetailModal = async (orderId) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      setDetailOrder(null);
      const orderDetail = await getPurchaseOrderById(orderId);
      setDetailOrder(orderDetail);
    } catch {
      setDetailError('No se pudo cargar el detalle de la orden.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailOrder(null);
    setDetailError('');
    setDetailLoading(false);
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
              onChange={(event) => setForm((prev) => ({
                ...prev,
                supplierId: event.target.value,
                items: prev.items.map((item) => ({ ...item, articleId: '' })),
              }))}
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

            <div className="purchase-order-total-row">
              <label htmlFor="purchase-order-total">Total estimado</label>
              <input
                id="purchase-order-total"
                type="text"
                value={`$ ${formatNumber(orderTotalCost, 2)}`}
                readOnly
              />
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
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <button type="button" className="touch-btn" onClick={() => openDetailModal(row.id)}>
                  Ver detalle
                </button>
              ),
            },
          ]}
        />

        {(detailLoading || detailOrder || detailError) && (
          <Modal title={detailOrder ? `Orden #${detailOrder.id}` : 'Detalle de orden'} onClose={closeDetailModal}>
            {detailLoading && <p>Cargando detalle...</p>}

            {detailError && <p className="error-text">{detailError}</p>}

            {detailOrder && (
              <div className="purchase-order-detail-modal">
                <div className="purchase-order-detail-grid">
                  <p><strong>Proveedor:</strong> {detailOrder.supplier_name || '-'}</p>
                  <p><strong>Estado:</strong> {statusLabel(detailOrder.status)}</p>
                  <p><strong>Creada:</strong> {new Date(detailOrder.created_at).toLocaleString()}</p>
                  <p><strong>Actualizada:</strong> {new Date(detailOrder.updated_at).toLocaleString()}</p>
                  <p><strong>Cerrada:</strong> {detailOrder.closed_at ? new Date(detailOrder.closed_at).toLocaleString() : '-'}</p>
                  <p><strong>Motivo cierre:</strong> {detailOrder.closed_reason || '-'}</p>
                  <p><strong>Observaciones:</strong> {detailOrder.notes || '-'}</p>
                  <p><strong>Costo total:</strong> $ {formatNumber(detailOrder.total_cost || 0, 2)}</p>
                </div>

                <h4>Artículos</h4>
                <div className="admin-table-wrap">
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>SKU</th>
                        <th>Unidad</th>
                        <th>Pedida</th>
                        <th>Recibida</th>
                        <th>Pendiente</th>
                        <th>Costo unit.</th>
                        <th>Total línea</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items?.length ? (
                        detailOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.article_name}</td>
                            <td>{item.article_sku || '-'}</td>
                            <td>{item.measurement_unit_code || '-'}</td>
                            <td>{formatNumber(item.quantity_ordered || 0, 3)}</td>
                            <td>{formatNumber(item.quantity_received || 0, 3)}</td>
                            <td>{formatNumber(item.quantity_pending || 0, 3)}</td>
                            <td>$ {formatNumber(item.unit_cost || 0, 2)}</td>
                            <td>$ {formatNumber(item.line_total || 0, 2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="text-center py-3">Sin artículos</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h4>Recepciones</h4>
                <div className="admin-table-wrap">
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Usuario</th>
                        <th>Comprobante</th>
                        <th>Notas</th>
                        <th>Total recibido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.receipts?.length ? (
                        detailOrder.receipts.map((receipt) => (
                          <tr key={receipt.id}>
                            <td>{receipt.id}</td>
                            <td>{new Date(receipt.created_at).toLocaleString()}</td>
                            <td>{receipt.user_name || '-'}</td>
                            <td>{receipt.supplier_document_number || '-'}</td>
                            <td>{receipt.notes || '-'}</td>
                            <td>{formatNumber(receipt.total_received || 0, 3)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-3">Sin recepciones registradas</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminPurchaseOrders;
