import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { getKitchenOrders, getSaleDetail, updateKitchenOrderStatus } from '../services/kitchenService';
import { ROLES } from '../utils/roles';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['PENDIENTE', 'PREPARANDO', 'LISTO'];

const STATUS_CLASS = {
  PENDIENTE: 'text-bg-warning',
  PREPARANDO: 'text-bg-info',
  LISTO: 'text-bg-success',
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-AR');
}

function Comandas() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState('');

  const canUpdateStatus = [ROLES.ADMIN, ROLES.COCINA].includes(user?.role);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getKitchenOrders();
      const sorted = [...response].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sorted);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar las comandas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const text = search.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatch = statusFilter === 'TODOS' || order.status === statusFilter;
      if (!statusMatch) return false;

      if (!text) return true;
      return String(order.id).includes(text) || String(order.saleId).includes(text);
    });
  }, [orders, search, statusFilter]);

  const openOrderDetail = async (order) => {
    setSelectedOrder(order);
    setSelectedSale(null);

    try {
      setDetailLoading(true);
      const sale = await getSaleDetail(order.saleId);
      setSelectedSale(sale);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el detalle de la comanda.');
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (status) => {
    if (!selectedOrder || !canUpdateStatus || statusSaving || selectedOrder.status === status) return;

    try {
      setStatusSaving(true);
      await updateKitchenOrderStatus(selectedOrder.id, status);

      setSelectedOrder((previous) => ({ ...previous, status }));
      setOrders((previous) => previous.map((order) => (
        order.id === selectedOrder.id ? { ...order, status } : order
      )));
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado de la comanda.');
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="content commandas-screen">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h2 className="mb-1">Administrar comandas</h2>
            <p className="text-muted mb-0">Monitoreá el estado de cocina y abrí el detalle de cada pedido.</p>
          </div>

          <button type="button" className="touch-btn btn-primary" onClick={loadOrders}>
            Actualizar
          </button>
        </div>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <section className="dashboard-card shadow-sm d-grid gap-3">
          <div className="commandas-toolbar">
            <label>
              Estado
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="TODOS">Todos</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              Buscar por #comanda o #venta
              <input
                className="form-control"
                type="search"
                placeholder="Ej: 32 o 510"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Cargando comandas...
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th># Comanda</th>
                    <th># Venta</th>
                    <th>Creada</th>
                    <th>Última actualización</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">No hay comandas con los filtros actuales.</td>
                    </tr>
                  ) : filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="fw-semibold">#{order.id}</td>
                      <td>#{order.saleId}</td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>{formatDateTime(order.updatedAt || order.createdAt)}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[order.status] || 'text-bg-secondary'}`}>{order.status}</span>
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => openOrderDetail(order)}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedOrder && (
        <Modal
          title={`Comanda #${selectedOrder.id}`}
          onClose={() => setSelectedOrder(null)}
          actions={<button type="button" className="touch-btn" onClick={() => setSelectedOrder(null)}>Cerrar</button>}
        >
          {detailLoading ? (
            <div className="d-flex align-items-center gap-2 text-muted">
              <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Cargando detalle...
            </div>
          ) : (
            <div className="kitchen-modal-content">
              <div className="kitchen-modal-header">
                <div>
                  <p><strong>Venta:</strong> #{selectedOrder.saleId}</p>
                  <p><strong>Mesa:</strong> {selectedSale?.table?.name || selectedSale?.tableName || `Mesa ${selectedSale?.tableId || '-'}`}</p>
                </div>
                <span className={`badge fs-6 ${STATUS_CLASS[selectedOrder.status] || 'text-bg-secondary'}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div className="kitchen-status-actions">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`touch-btn ${selectedOrder.status === status ? 'btn-primary' : ''}`}
                    disabled={!canUpdateStatus || statusSaving}
                    onClick={() => changeStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {!canUpdateStatus && (
                <p className="text-muted mb-0">Solo Admin y Cocina pueden cambiar estados de comanda.</p>
              )}

              <div>
                <h6>Items de la venta</h6>
                {!selectedSale?.items?.length ? (
                  <p className="text-muted mb-0">No hay items asociados.</p>
                ) : (
                  <ul className="dashboard-list kitchen-items-list">
                    {selectedSale.items.map((item) => (
                      <li key={item.id} className="list-row-split">
                        <span>{item.productName || item.name}</span>
                        <strong>x{item.quantity}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default Comandas;
