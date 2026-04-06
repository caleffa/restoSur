import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import KitchenOrders from '../components/pos/KitchenOrders';
import OrderTable from '../components/pos/OrderTable';
import PaymentModal from '../components/pos/PaymentModal';
import ProductSelector from '../components/pos/ProductSelector';
import TableActions from '../components/pos/TableActions';
import { useAuth } from '../context/AuthContext';
import {
  addSaleItem,
  clearLocalPOS,
  closeSale,
  createKitchenOrder,
  deleteSaleItem,
  getProducts,
  getSaleByTable,
  listKitchenOrders,
  paySale,
  persistLocalSale,
  updateTableStatus,
  updateSaleItem,
} from '../services/posService';

const KITCHEN_CATEGORIES = new Set([4, 5, 6, 7, 8]);

function playKitchenSound() {
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(790, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);

    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.28);
  } catch {
    // Ignorar errores de audio si el navegador bloquea autoplay.
  }
}

function playBillRequestedSound() {
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1046, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.36);
  } catch {
    // Ignorar errores de audio si el navegador bloquea autoplay.
  }
}

function POS() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sale, setSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  const canEditWhenBillRequested = user?.role === 'ADMIN';
  const tableStatus = sale?.tableStatus || 'OCUPADA';
  const isBillRequested = tableStatus === 'CUENTA_PEDIDA';
  const canEdit = !isBillRequested || canEditWhenBillRequested;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [saleData, productsData, kitchenData] = await Promise.all([
        getSaleByTable(tableId),
        getProducts(),
        listKitchenOrders(tableId),
      ]);

      setSale(saleData);
      setProducts(productsData);
      setKitchenOrders(kitchenData);
      setError('');
    } catch {
      setError('No se pudo cargar la información del POS.');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeout = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_KITCHEN_WS_URL;
    if (!wsUrl) return undefined;

    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = () => {
      listKitchenOrders(tableId).then(setKitchenOrders).catch(() => {});
    };

    return () => ws.close();
  }, [tableId]);

  const totals = useMemo(() => {
    const subtotal = (sale?.items || []).reduce((acc, item) => acc + Number(item.unitPrice) * Number(item.quantity), 0);
    return { subtotal, total: subtotal };
  }, [sale]);

  const sendKitchenOrder = useCallback(async (item, quantity) => {
    const order = await createKitchenOrder({
      tableId: Number(tableId),
      productId: item.productId,
      productName: item.productName,
      quantity,
      timestamp: new Date().toISOString(),
      status: 'PENDIENTE',
    });

    setKitchenOrders((prev) => [order, ...prev]);
    playKitchenSound();

    if (import.meta.env.VITE_AUTO_PRINT_KITCHEN === 'true') {
      window.print();
    }
  }, [tableId]);

  const upsertSaleAndPersist = useCallback((updater) => {
    setSale((previous) => {
      const next = updater(previous);
      if (next) persistLocalSale(tableId, next);
      return next;
    });
  }, [tableId]);

  const handleRequestBill = async () => {
    if (!sale || saving) return;
    if (!sale?.items?.length) {
      setError('No se puede pedir cuenta si la venta no tiene productos.');
      return;
    }

    try {
      setSaving(true);
      await updateTableStatus(sale.tableId, "CUENTA_PEDIDA");
      playBillRequestedSound();
      upsertSaleAndPersist((current) => ({
        ...current,
        tableStatus: 'CUENTA_PEDIDA',
      }));
      setToastMessage('Cuenta solicitada');
      setError('');
    } catch {
      setError('No se pudo pedir la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (product, quantity) => {
    if (!sale || saving || !canEdit) return;

    try {
      setSaving(true);
      const parsedQty = Number(quantity || 1);

      await addSaleItem(sale.id, { productId: product.id, quantity: parsedQty });

      const newItem = {
        id: `tmp-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        categoryId: Number(product.category_id ?? product.categoryId ?? 0),
        unitPrice: Number(product.price),
        quantity: parsedQty,
        kitchenStatus: KITCHEN_CATEGORIES.has(Number(product.category_id ?? product.categoryId)) ? 'PENDIENTE' : 'SIN_COMANDA',
      };

      upsertSaleAndPersist((current) => ({
        ...current,
        items: [...(current?.items || []), newItem],
      }));

      if (KITCHEN_CATEGORIES.has(newItem.categoryId)) {
        await sendKitchenOrder(newItem, parsedQty);
      }
    } catch {
      setError('No se pudo agregar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeQuantity = async (item, nextQuantity) => {
    if (saving || !canEdit) return;

    try {
      setSaving(true);
      const normalized = Math.max(1, Number(nextQuantity || 1));
      await updateSaleItem(item.id, { quantity: normalized });

      const diff = normalized - Number(item.quantity);

      upsertSaleAndPersist((current) => ({
        ...current,
        items: current.items.map((row) => (
          row.id === item.id ? { ...row, quantity: normalized } : row
        )),
      }));

      if (diff > 0 && KITCHEN_CATEGORIES.has(item.categoryId)) {
        await sendKitchenOrder(item, diff);
      }
    } catch {
      setError('No se pudo actualizar la cantidad.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (saving || !canEdit) return;

    try {
      setSaving(true);
      await deleteSaleItem(item.id);

      upsertSaleAndPersist((current) => ({
        ...current,
        items: current.items.filter((row) => row.id !== item.id),
      }));
    } catch {
      setError('No se pudo eliminar el item.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSale = async (paymentMethod) => {
    if (!sale || saving) return;
    if (!sale?.items?.length) {
      setError('No se puede cobrar una venta sin productos.');
      return;
    }

    try {
      setSaving(true);
      await paySale(sale.id, { paymentMethod });
      await closeSale(sale.id);
      clearLocalPOS(tableId);
      setShowPaymentModal(false);
      setToastMessage('Pago realizado correctamente');
      navigate('/dashboard');
    } catch {
      setError('No se pudo cerrar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="content"><p>Cargando POS de mesa...</p></main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content pos-screen">
        {toastMessage && <div className="alert alert-success py-2 mb-3">{toastMessage}</div>}

        <section className="card shadow-sm">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h3 className="mb-1">Mesa {sale?.tableId || tableId}</h3>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <span className={`badge ${tableStatus === 'CUENTA_PEDIDA' ? 'text-bg-warning' : 'text-bg-danger'}`}>
                  {tableStatus}
                </span>
                <span className="fw-semibold">Total acumulado: ${totals.total.toFixed(2)}</span>
                {import.meta.env.VITE_KITCHEN_WS_URL && (
                  <small className={wsConnected ? 'text-success' : 'text-muted'}>
                    Cocina WS: {wsConnected ? 'conectado' : 'sin conexión'}
                  </small>
                )}
              </div>
            </div>

            <TableActions
              tableStatus={tableStatus}
              hasItems={(sale?.items || []).length > 0}
              loading={saving}
              canEdit={canEdit}
              onRequestBill={handleRequestBill}
              onOpenPayment={() => setShowPaymentModal(true)}
            />
          </div>
        </section>

        {error && <p className="error-text">{error}</p>}

        <ProductSelector products={products} onAdd={handleAddProduct} disabled={!canEdit} />

        <div className="row g-3">
          <div className="col-lg-8">
            <OrderTable
              items={sale?.items || []}
              onChangeQuantity={handleChangeQuantity}
              onDelete={handleDeleteItem}
              disabled={!canEdit}
            />
          </div>
          <div className="col-lg-4">
            <KitchenOrders orders={kitchenOrders} />
          </div>
        </div>

        <section className="card shadow-sm">
          <div className="card-body d-flex justify-content-end gap-4 fs-5 fw-semibold flex-wrap">
            <span>Subtotal: ${totals.subtotal.toFixed(2)}</span>
            <span>Total: ${totals.total.toFixed(2)}</span>
          </div>
        </section>
      </main>

      {showPaymentModal && (
        <PaymentModal
          total={totals.total}
          hasItems={(sale?.items || []).length > 0}
          loading={saving}
          onClose={() => !saving && setShowPaymentModal(false)}
          onConfirm={handleCloseSale}
        />
      )}
    </div>
  );
}

export default POS;
