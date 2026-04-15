import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import KitchenOrders from '../components/pos/KitchenOrders';
import OrderTable from '../components/pos/OrderTable';
import Modal from '../components/Modal';
import PaymentModal from '../components/pos/PaymentModal';
import ProductSelector from '../components/pos/ProductSelector';
import TableActions from '../components/pos/TableActions';
import { useAuth } from '../context/AuthContext';
import {
  addSaleItem,
  clearLocalPOS,
  closeSale,
  cancelSale,
  createKitchenOrder,
  deleteSaleItem,
  getProducts,
  getSaleByTable,
  getAfipConfig,
  getAfipCaea,
  listKitchenOrders,
  paySale,
  persistLocalSale,
  createInvoice,
  getWaiters,
  updateSaleWaiter,
  updateTableStatus,
  updateSaleItem,
} from '../services/posService';
import { formatCurrency } from '../utils/formatters';

const KITCHEN_CATEGORIES = new Set([4, 5, 6, 7, 8]);
const AFIP_QR_VERIFY_URL = 'https://www.afip.gob.ar/fe/qr/';

const INVOICE_TYPE_TO_AFIP_CODE = {
  A: 1,
  B: 6,
  C: 11,
};

function sanitizeCuit(rawValue) {
  return String(rawValue || '').replace(/\D/g, '');
}

function resolveTaxBreakdown(invoiceType, total) {
  if (invoiceType === 'C') {
    return [{ label: 'IVA 0.00%', net: total, iva: 0 }];
  }

  const ivaRate = 0.21;
  const net = total / (1 + ivaRate);
  const ivaAmount = total - net;
  return [{ label: 'IVA 21.00%', net, iva: ivaAmount }];
}

function buildAfipQrData({ issueDate, cuit, pointOfSale, invoiceType, voucherNumber, total, authorizationType, authorizationCode }) {
  const payload = {
    ver: 1,
    fecha: issueDate,
    cuit: Number(cuit) || 0,
    ptoVta: Number(pointOfSale) || 0,
    tipoCmp: INVOICE_TYPE_TO_AFIP_CODE[invoiceType] || 0,
    nroCmp: Number(voucherNumber) || 0,
    importe: Number(total.toFixed(2)),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: 99,
    nroDocRec: 0,
    tipoCodAut: authorizationType === 'CAEA' ? 'A' : 'E',
    codAut: Number(String(authorizationCode || '').replace(/\D/g, '')) || 0,
  };

  const payloadBase64 = window.btoa(JSON.stringify(payload));
  const qrVerificationUrl = `${AFIP_QR_VERIFY_URL}?p=${payloadBase64}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrVerificationUrl)}`;

  return { qrVerificationUrl, qrImageUrl };
}

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [afipConfig, setAfipConfig] = useState(null);
  const [caeaList, setCaeaList] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [selectedWaiterId, setSelectedWaiterId] = useState(null);

  const canEditWhenBillRequested = user?.role === 'ADMIN';
  const canEmitFiscalTicket = user?.role === 'ADMIN' || user?.role === 'CAJERO';
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
    getWaiters().then(setWaiters).catch(() => setWaiters([]));
  }, []);

  useEffect(() => {
    setSelectedWaiterId(Number(sale?.waiterId || sale?.user_id || 0) || null);
  }, [sale?.waiterId, sale?.user_id]);

  useEffect(() => {
    if (!canEmitFiscalTicket) return;

    Promise.allSettled([getAfipConfig(), getAfipCaea()])
      .then(([configResult, caeaResult]) => {
        if (configResult.status === 'fulfilled') {
          setAfipConfig(configResult.value || null);
        }
        if (caeaResult.status === 'fulfilled') {
          setCaeaList(Array.isArray(caeaResult.value) ? caeaResult.value : []);
        }
      })
      .catch(() => {});
  }, [canEmitFiscalTicket]);

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

  const printFiscalTicket = useCallback(({ saleData, invoiceData, paymentMethod }) => {
    const issueDateDate = new Date(invoiceData?.created_at || new Date());
    const issueDate = issueDateDate.toLocaleString('es-AR');
    const issueDateAfip = issueDateDate.toISOString().slice(0, 10);
    const authorizationLabel = invoiceData?.authorization_type === 'CAEA' || invoiceData?.authorizationType === 'CAEA' ? 'CAEA' : 'CAE';
    const authorizationCode = invoiceData?.authorization_code || invoiceData?.authorizationCode || '-';
    const voucherRaw = invoiceData?.voucher_number || invoiceData?.voucherNumber;
    const voucherNumber = voucherRaw ? String(voucherRaw).padStart(8, '0') : '-';
    const voucherNumberNumeric = voucherRaw ? Number(voucherRaw) : 0;
    const pointOfSale = afipConfig?.point_of_sale || afipConfig?.pointOfSale || '-';
    const caeExpiration = invoiceData?.cae_expiration || invoiceData?.caeExpiration ? String(invoiceData?.cae_expiration || invoiceData?.caeExpiration).slice(0, 10) : '-';
    const issuerCuit = sanitizeCuit(afipConfig?.cuit);
    const issuerName = afipConfig?.issuer_name || afipConfig?.issuerName || 'NO INFORMADO';
    const issuerAddress = afipConfig?.issuer_address || afipConfig?.issuerAddress || 'NO INFORMADO';
    const ticketLogoPath = afipConfig?.ticket_logo_path || afipConfig?.ticketLogoPath || '';
    const ticketTotal = Number(saleData?.total || invoiceData?.total || 0);
    const invoiceType = invoiceData?.invoice_type || invoiceData?.invoiceType || 'B';
    const taxBreakdown = resolveTaxBreakdown(invoiceType, ticketTotal);
    const { qrImageUrl } = buildAfipQrData({
      issueDate: issueDateAfip,
      cuit: issuerCuit,
      pointOfSale,
      invoiceType,
      voucherNumber: voucherNumberNumeric,
      total: ticketTotal,
      authorizationType: invoiceData?.authorization_type || invoiceData?.authorizationType,
      authorizationCode,
    });

    const itemsHtml = (saleData?.items || [])
      .map((item) => {
        const articleName = item.articleName || item.article_name || item.productName || item.name || 'Producto';
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
        return `
          <tr>
            <td colspan="4" style="text-align:left;">${quantity} x ${formatCurrency(unitPrice)}</td>
          </tr>
          <tr>
            <td colspan="3">${articleName}</td>
            <td style="text-align:right;">${formatCurrency(quantity * unitPrice)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>Ticket Fiscal</title>
          <style>
            body{font-family: monospace; width:57mm; margin:0 auto; padding:4px;}
            h1,h2{margin:0; text-align:center;}
            h1{font-size:12px;} h2{font-size:10px; margin-bottom:6px;}
            p{margin:2px 0; font-size:9px;}
            table{width:100%; border-collapse:collapse; font-size:8px;}
            th,td{padding:2px 0;}
            th{text-align:left; border-bottom:1px dashed #333;}
            .line{border-top:1px dashed #333; margin:6px 0;}
            .right{text-align:right;}
            .qr-wrap{text-align:center; margin-top:6px;}
            .logo-wrap{text-align:center; margin-bottom:6px;}
            .logo-wrap img{max-width:46mm; max-height:20mm; object-fit:contain;}
          </style>
        </head>
        <body>
          ${ticketLogoPath ? `<div class="logo-wrap"><img src="${ticketLogoPath}" alt="Logo comercio" /></div>` : ''}
          <h1>${issuerName}</h1>
          <h2>${issuerAddress}</h2>
          <p>CUIT: ${issuerCuit || '-'}</p>
          <p>Fecha: ${issueDate}</p>
          <p>Venta: #${saleData?.id || invoiceData?.sale_id || '-'}</p>
          <p>Mesa: ${saleData?.tableId || saleData?.table_id || invoiceData?.table_id || '-'}</p>
          <p>Comprobante: ${invoiceType} | PV ${pointOfSale} - N° ${voucherNumber}</p>
          <p>Pago: ${paymentMethod || '-'}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr><th colspan="4">Cantidad x Precio unitario</th></tr>
              <tr><th colspan="3">Descripción</th><th class="right">Subtotal</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="line"></div>
          ${taxBreakdown.map((line) => `<p>${line.label} | Neto: ${formatCurrency(line.net)} | Impuesto: ${formatCurrency(line.iva)}</p>`).join('')}
          <p class="right"><strong>TOTAL: ${formatCurrency(ticketTotal)}</strong></p>
          <div class="line"></div>
          <p>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</p>
          <p> IVA contenido: ${taxBreakdown.map((line) => `${formatCurrency(line.iva)}`).join('')}</p>
          <p>Otros Impuestos Nacionales Indirectos: $ 0,00</p>
          <div class="line"></div>
          <p>Referencia electrónica del comprobante.</p>
          <div class="qr-wrap">
            <img src="${qrImageUrl}" alt="QR AFIP" width="140" height="140" />
          </div>
          <p>${authorizationLabel}: ${authorizationCode} | Vto ${authorizationLabel}: ${caeExpiration}</p>
          <p>Gracias por su compra.</p>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'width=430,height=720');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [afipConfig]);

  const handleCloseSale = useCallback(async ({ paymentMethod, emitFiscalTicket, invoiceType, authorizationType, caeaId }) => {
    if (!sale || saving) return;
    if (!sale?.items?.length) {
      setError('No se puede cobrar una venta sin productos.');
      return;
    }

    if (emitFiscalTicket && authorizationType === 'CAEA' && !caeaId) {
      setError('Para emitir ticket con CAEA debés seleccionar un CAEA válido.');
      return;
    }

    try {
      setSaving(true);
      await paySale(sale.id, { paymentMethod });
      await closeSale(sale.id);

      let ticketMessage = 'Pago realizado correctamente';
      if (emitFiscalTicket) {
        const invoice = await createInvoice({
          saleId: Number(sale.id),
          invoiceType,
          authorizationType,
          caeaId: authorizationType === 'CAEA' ? Number(caeaId) : undefined,
        });

        printFiscalTicket({
          saleData: {
            ...sale,
            total: totals.total,
          },
          invoiceData: invoice,
          paymentMethod,
        });
        ticketMessage = `Pago realizado y ticket ${invoice.authorizationType} emitido`;
      }

      clearLocalPOS(tableId);
      setShowPaymentModal(false);
      setToastMessage(ticketMessage);
      navigate('/dashboard');
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setError(apiMessage || 'No se pudo cerrar la cuenta.');
    } finally {
      setSaving(false);
    }
  }, [sale, saving, tableId, navigate, totals.total, printFiscalTicket]);

  const handleOpenCancelModal = useCallback(() => {
    if (!sale || saving) return;
    setShowCancelModal(true);
  }, [sale, saving]);

  const handleCloseCancelModal = useCallback(() => {
    if (saving) return;
    setShowCancelModal(false);
  }, [saving]);

  const handleCancelTable = useCallback(async () => {
    if (!sale || saving) return;

    try {
      setSaving(true);
      await cancelSale(sale.id);
      clearLocalPOS(tableId);
      setShowCancelModal(false);
      setToastMessage('Mesa cancelada correctamente');
      navigate('/dashboard');
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setError(apiMessage || 'No se pudo cancelar la mesa.');
    } finally {
      setSaving(false);
    }
  }, [sale, saving, tableId, navigate]);

  const handleUpdateWaiter = useCallback(async () => {
    if (!sale || !selectedWaiterId || saving) return;

    try {
      setSaving(true);
      const updated = await updateSaleWaiter(sale.id, selectedWaiterId);
      const selected = waiters.find((item) => Number(item.id) === Number(selectedWaiterId));
      upsertSaleAndPersist((current) => ({
        ...current,
        waiterId: Number(updated?.waiterId || selectedWaiterId),
        waiterName: updated?.waiterName || selected?.name || current?.waiterName || null,
      }));
      setShowWaiterModal(false);
      setToastMessage('Mozo actualizado');
      setError('');
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setError(apiMessage || 'No se pudo actualizar el mozo.');
    } finally {
      setSaving(false);
    }
  }, [sale, selectedWaiterId, saving, waiters, upsertSaleAndPersist]);

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
                <span className="badge text-bg-secondary">
                  Mozo: {sale?.waiterName || 'Sin asignar'}
                </span>
                <span className="fw-semibold">Total acumulado: {formatCurrency(totals.total)}</span>
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
              onCancelTable={handleOpenCancelModal}
            />

            <button
              type="button"
              className="touch-btn"
              onClick={() => setShowWaiterModal(true)}
              disabled={saving || tableStatus !== 'OCUPADA'}
            >
              Cambiar mozo
            </button>
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
            <span>Subtotal: {formatCurrency(totals.subtotal)}</span>
            <span>Total: {formatCurrency(totals.total)}</span>
          </div>
        </section>
      </main>

      {showPaymentModal && (
        <PaymentModal
          total={totals.total}
          hasItems={(sale?.items || []).length > 0}
          loading={saving}
          caeaOptions={caeaList}
          canEmitFiscalTicket={canEmitFiscalTicket}
          onClose={() => !saving && setShowPaymentModal(false)}
          onConfirm={handleCloseSale}
        />
      )}

      {showCancelModal && (
        <Modal
          title={`Cancelar mesa ${sale?.tableId || tableId}`}
          onClose={handleCloseCancelModal}
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={handleCloseCancelModal} disabled={saving}>
                Volver
              </button>
              <button type="button" className="touch-btn btn-danger" onClick={handleCancelTable} disabled={saving}>
                {saving ? 'Cancelando...' : 'Sí, cancelar mesa'}
              </button>
            </>
          )}
        >
          <p className="mb-2">
            ¿Seguro que querés cancelar esta mesa?
          </p>
          <p className="mb-0 text-muted">
            Esta acción eliminará los items cargados de la venta actual.
          </p>
        </Modal>
      )}

      {showWaiterModal && (
        <Modal
          title={`Mozo de mesa ${sale?.tableId || tableId}`}
          onClose={() => !saving && setShowWaiterModal(false)}
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={() => setShowWaiterModal(false)} disabled={saving}>
                Volver
              </button>
              <button type="button" className="touch-btn btn-primary" onClick={handleUpdateWaiter} disabled={saving || !selectedWaiterId}>
                {saving ? 'Guardando...' : 'Guardar mozo'}
              </button>
            </>
          )}
        >
          <p className="modal-helper-text">Elegí el mozo asignado para esta venta.</p>
          <div className="waiters-touch-grid">
            {waiters.map((waiter) => (
              <button
                key={waiter.id}
                type="button"
                className={`touch-btn waiter-choice ${Number(selectedWaiterId) === Number(waiter.id) ? 'active' : ''}`}
                onClick={() => setSelectedWaiterId(Number(waiter.id))}
              >
                {waiter.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default POS;
