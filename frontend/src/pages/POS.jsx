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
  getAfipConfig,
  getAfipCaea,
  listKitchenOrders,
  paySale,
  persistLocalSale,
  createInvoice,
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
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [afipConfig, setAfipConfig] = useState(null);
  const [caeaList, setCaeaList] = useState([]);

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
    const issueDateDate = new Date();
    const issueDate = issueDateDate.toLocaleString('es-AR');
    const issueDateAfip = issueDateDate.toISOString().slice(0, 10);
    const authorizationLabel = invoiceData?.authorizationType === 'CAEA' ? 'CAEA' : 'CAE';
    const authorizationCode = invoiceData?.authorizationCode || '-';
    const voucherNumber = invoiceData?.voucherNumber ? String(invoiceData.voucherNumber).padStart(8, '0') : '-';
    const voucherNumberNumeric = invoiceData?.voucherNumber ? Number(invoiceData.voucherNumber) : 0;
    const pointOfSale = afipConfig?.point_of_sale || afipConfig?.pointOfSale || '-';
    const caeExpiration = invoiceData?.caeExpiration ? String(invoiceData.caeExpiration).slice(0, 10) : '-';
    const issuerCuit = sanitizeCuit(afipConfig?.cuit);
    const issuerName = afipConfig?.issuer_name || afipConfig?.issuerName || 'NO INFORMADO';
    const issuerAddress = afipConfig?.issuer_address || afipConfig?.issuerAddress || 'NO INFORMADO';
    const ticketTotal = Number(saleData?.total || 0);
    const taxBreakdown = resolveTaxBreakdown(invoiceData?.invoiceType, ticketTotal);
    const { qrVerificationUrl, qrImageUrl } = buildAfipQrData({
      issueDate: issueDateAfip,
      cuit: issuerCuit,
      pointOfSale,
      invoiceType: invoiceData?.invoiceType,
      voucherNumber: voucherNumberNumeric,
      total: ticketTotal,
      authorizationType: invoiceData?.authorizationType,
      authorizationCode,
    });

    const itemsHtml = (saleData?.items || [])
      .map((item) => `
        <tr>
          <td>${item.productName}</td>
          <td style="text-align:center;">${Number(item.quantity)}</td>
          <td style="text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:right;">${formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
        </tr>
      `)
      .join('');

    const html = `
      <html>
        <head>
          <title>Ticket Fiscal</title>
          <style>
            body{font-family: monospace; width:80mm; margin:0 auto; padding:6px;}
            h1,h2{margin:0; text-align:center;}
            h1{font-size:14px;} h2{font-size:12px; margin-bottom:6px;}
            p{margin:3px 0; font-size:11px;}
            table{width:100%; border-collapse:collapse; font-size:10px;}
            th,td{padding:2px 0;}
            th{text-align:left; border-bottom:1px dashed #333;}
            .line{border-top:1px dashed #333; margin:6px 0;}
            .right{text-align:right;}
            .qr-wrap{text-align:center; margin-top:6px;}
            .small{font-size:9px; word-break:break-word;}
          </style>
        </head>
        <body>
          <h1>${issuerName}</h1>
          <h2>${issuerAddress}</h2>
          <p>CUIT: ${issuerCuit || '-'}</p>
          <p>Fecha: ${issueDate}</p>
          <p>Venta: #${saleData?.id || '-'}</p>
          <p>Mesa: ${saleData?.tableId || saleData?.table_id || '-'}</p>
          <p>Comprobante: ${invoiceData?.invoiceType || '-'} | PV ${pointOfSale} - N° ${voucherNumber}</p>
          <p>${authorizationLabel}: ${authorizationCode}</p>
          <p>Vto ${authorizationLabel}: ${caeExpiration}</p>
          <p>Pago: ${paymentMethod}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr><th>Item</th><th>Cant.</th><th>P.Unit</th><th class="right">Subtotal</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="line"></div>
          ${taxBreakdown.map((line) => `<p>${line.label} | Neto: ${formatCurrency(line.net)} | Impuesto: ${formatCurrency(line.iva)}</p>`).join('')}
          <p class="right"><strong>TOTAL: ${formatCurrency(ticketTotal)}</strong></p>
          <div class="line"></div>
          <div class="qr-wrap">
            <img src="${qrImageUrl}" alt="QR AFIP" width="140" height="140" />
          </div>
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
    </div>
  );
}

export default POS;
