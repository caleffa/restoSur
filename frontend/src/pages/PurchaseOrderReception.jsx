import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import {
  closePurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrders,
  receivePurchaseOrder,
} from '../services/adminService';
import { formatNumber } from '../utils/formatters';

const OPEN_STATUSES = new Set(['EMITIDA', 'RECEPCION_PARCIAL']);

function statusLabel(status) {
  switch (status) {
    case 'EMITIDA': return 'Emitida';
    case 'RECEPCION_PARCIAL': return 'Recepción parcial';
    case 'RECIBIDA_TOTAL': return 'Recibida total';
    case 'CERRADA_CON_DIFERENCIAS': return 'Cerrada con diferencias';
    default: return status;
  }
}

function PurchaseOrderReception() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [receiveQtyByArticle, setReceiveQtyByArticle] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const list = await getPurchaseOrders();
      setOrders(list);
      if (!selectedOrderId && list.length > 0) {
        setSelectedOrderId(String(list[0].id));
      }
      setError('');
    } catch {
      setError('No se pudo cargar el listado de órdenes.');
    }
  }, [selectedOrderId]);

  const loadOrderDetail = useCallback(async (orderId) => {
    if (!orderId) {
      setOrderDetail(null);
      return;
    }

    try {
      const detail = await getPurchaseOrderById(orderId);
      setOrderDetail(detail);
      setReceiveQtyByArticle(
        Object.fromEntries(
          (detail.items || []).map((item) => [
            Number(item.article_id),
            item.quantity_pending > 0 ? String(item.quantity_pending) : '',
          ]),
        ),
      );
      setError('');
    } catch (detailError) {
      setError(detailError?.response?.data?.message || 'No se pudo cargar el detalle de la orden.');
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadOrderDetail(selectedOrderId);
  }, [selectedOrderId, loadOrderDetail]);

  const receivableItems = useMemo(
    () => (orderDetail?.items || []).filter((item) => Number(item.quantity_pending) > 0),
    [orderDetail],
  );

  const onReceive = async (event) => {
    event.preventDefault();
    if (!selectedOrderId || loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const items = receivableItems
        .map((item) => ({
          articleId: Number(item.article_id),
          quantityReceived: Number(receiveQtyByArticle[Number(item.article_id)] || 0),
        }))
        .filter((item) => item.quantityReceived > 0);

      if (!items.length) {
        setError('Ingresá al menos una cantidad mayor a cero para recepcionar.');
        return;
      }

      await receivePurchaseOrder(selectedOrderId, {
        notes: receiptNotes,
        items,
      });

      setReceiptNotes('');
      setSuccess('Recepción registrada y stock actualizado correctamente.');
      await Promise.all([loadOrders(), loadOrderDetail(selectedOrderId)]);
    } catch (receiveError) {
      setError(receiveError?.response?.data?.message || 'No se pudo registrar la recepción.');
    } finally {
      setLoading(false);
    }
  };

  const onCloseWithDifferences = async () => {
    if (!selectedOrderId || loading) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await closePurchaseOrder(selectedOrderId, { closedReason: closeReason });
      setCloseReason('');
      setSuccess('Orden cerrada con diferencias.');
      await Promise.all([loadOrders(), loadOrderDetail(selectedOrderId)]);
    } catch (closeError) {
      setError(closeError?.response?.data?.message || 'No se pudo cerrar la orden con diferencias.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Recepción de órdenes de compra</h2>

        <section className="admin-card">
          <label htmlFor="purchase-order-select">Orden</label>
          <select
            id="purchase-order-select"
            value={selectedOrderId}
            onChange={(event) => setSelectedOrderId(event.target.value)}
          >
            <option value="">Seleccionar orden</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                OC #{order.id} - {order.supplier_name} ({statusLabel(order.status)})
              </option>
            ))}
          </select>

          {orderDetail && (
            <>
              <p className="muted-text">
                Estado actual: <strong>{statusLabel(orderDetail.status)}</strong>
              </p>

              <form className="admin-table-form" onSubmit={onReceive}>
                <div className="purchase-order-receive-grid">
                  {receivableItems.map((item) => (
                    <div key={item.id} className="purchase-order-item-row">
                      <div>
                        <strong>{item.article_name}</strong>
                        <p className="muted-text">
                          Pedido: {formatNumber(item.quantity_ordered, 3)} {item.measurement_unit_code || ''} ·
                          Recibido: {formatNumber(item.quantity_received, 3)} ·
                          Pendiente: {formatNumber(item.quantity_pending, 3)}
                        </p>
                      </div>

                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        max={item.quantity_pending}
                        value={receiveQtyByArticle[Number(item.article_id)] || ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setReceiveQtyByArticle((prev) => ({ ...prev, [Number(item.article_id)]: value }));
                        }}
                      />
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Observaciones de recepción (opcional)"
                  value={receiptNotes}
                  onChange={(event) => setReceiptNotes(event.target.value)}
                />

                <button
                  type="submit"
                  className="touch-btn btn-primary"
                  disabled={!OPEN_STATUSES.has(orderDetail.status) || receivableItems.length === 0 || loading}
                >
                  Registrar recepción
                </button>
              </form>

              {orderDetail.status === 'RECEPCION_PARCIAL' && (
                <div className="admin-table-form">
                  <h3>Cerrar con diferencias</h3>
                  <input
                    type="text"
                    placeholder="Motivo de cierre"
                    value={closeReason}
                    onChange={(event) => setCloseReason(event.target.value)}
                  />
                  <button
                    type="button"
                    className="touch-btn btn-danger"
                    onClick={onCloseWithDifferences}
                    disabled={!closeReason.trim() || loading}
                  >
                    Cerrar orden con diferencias
                  </button>
                </div>
              )}
            </>
          )}

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </section>
      </main>
    </div>
  );
}

export default PurchaseOrderReception;
