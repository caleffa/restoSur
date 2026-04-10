import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { getSaleDetail } from '../services/kitchenService';
import { getSalesReport } from '../services/salesService';
import { createInvoice, getAfipConfig, getInvoices } from '../services/adminService';
import { formatCurrency, formatNumber } from '../utils/formatters';

const initialFilters = {
  from: '',
  to: '',
  status: '',
  paymentMethod: '',
};

function formatAmount(value) {
  return formatCurrency(value || 0);
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

const AFIP_QR_VERIFY_URL = 'https://www.afip.gob.ar/fe/qr/';
const INVOICE_TYPE_TO_AFIP_CODE = { A: 1, B: 6, C: 11 };

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

function SalesManagement() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState({ totals: {}, rows: [] });
  const [afipConfig, setAfipConfig] = useState(null);
  const [invoiceModalSale, setInvoiceModalSale] = useState(null);
  const [selectedInvoiceType, setSelectedInvoiceType] = useState('B');
  const [invoicedSaleIds, setInvoicedSaleIds] = useState(new Set());
  const [invoicesBySaleId, setInvoicesBySaleId] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const [data, invoices, afipConfigData] = await Promise.all([
        getSalesReport(nextFilters),
        getInvoices(),
        getAfipConfig(),
      ]);
      setReport(data);
      setInvoicedSaleIds(new Set((invoices || []).map((invoice) => Number(invoice.sale_id))));
      setInvoicesBySaleId(new Map((invoices || []).map((invoice) => [Number(invoice.sale_id), invoice])));
      setAfipConfig(afipConfigData || null);
      setError('');
    } catch {
      setError('No se pudo cargar el reporte de ventas.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(initialFilters);
  }, [load]);

  const paymentOptions = useMemo(() => {
    const methods = new Set((report.rows || []).map((row) => row.paymentMethod).filter((item) => item && item !== '-'));
    return Array.from(methods).sort().map((value) => ({ value, label: value }));
  }, [report.rows]);

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
          </style>
        </head>
        <body>
          <h1>${issuerName}</h1>
          <h2>${issuerAddress}</h2>
          <p>CUIT: ${issuerCuit || '-'}</p>
          <p>Fecha: ${issueDate}</p>
          <p>Venta: #${saleData?.id || invoiceData?.sale_id || '-'}</p>
          <p>Mesa: ${saleData?.tableId || saleData?.table_id || invoiceData?.table_id || '-'}</p>
          <p>Comprobante: ${invoiceType} | PV ${pointOfSale} - N° ${voucherNumber}</p>
          <p>${authorizationLabel}: ${authorizationCode}</p>
          <p>Vto ${authorizationLabel}: ${caeExpiration}</p>
          <p>Pago: ${paymentMethod || '-'}</p>
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

  const loadSaleAndPrint = useCallback(async (saleId, invoiceData, paymentMethod) => {
    const saleDetail = await getSaleDetail(saleId);
    const normalizedSale = {
      ...saleDetail,
      tableId: saleDetail?.tableId || saleDetail?.table_id,
      total: saleDetail?.total ?? invoiceData?.total,
      items: (saleDetail?.items || []).map((item) => ({
        ...item,
        productName: item.productName || item.product_name || item.name,
        unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
        quantity: Number(item.quantity ?? 0),
      })),
    };
    printFiscalTicket({
      saleData: normalizedSale,
      invoiceData,
      paymentMethod,
    });
  }, [printFiscalTicket]);

  const handleCreateInvoice = useCallback(async () => {
    if (!invoiceModalSale || loading) return;
    try {
      setLoading(true);
      setError('');
      const invoice = await createInvoice({
        saleId: Number(invoiceModalSale.id),
        invoiceType: selectedInvoiceType,
        authorizationType: 'CAE',
      });

      await loadSaleAndPrint(invoiceModalSale.id, invoice, invoiceModalSale.paymentMethod);
      setInvoiceModalSale(null);
      await load(filters);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo facturar la venta.');
    } finally {
      setLoading(false);
    }
  }, [filters, invoiceModalSale, load, loadSaleAndPrint, loading, selectedInvoiceType]);

  const handleReprint = useCallback(async (row) => {
    const invoice = invoicesBySaleId.get(Number(row.id));
    if (!invoice || loading) return;
    try {
      setLoading(true);
      setError('');
      await loadSaleAndPrint(row.id, invoice, row.paymentMethod);
    } catch {
      setError('No se pudo reimprimir el comprobante.');
    } finally {
      setLoading(false);
    }
  }, [invoicesBySaleId, loadSaleAndPrint, loading]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Gestión de ventas</h2>
        <p>Filtrá por rango de fechas y explorá los tickets generados.</p>

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3">
              <label>Desde
                <input
                  type="date"
                  className="form-control"
                  value={filters.from}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                />
              </label>
            </div>
            <div className="col-md-3">
              <label>Hasta
                <input
                  type="date"
                  className="form-control"
                  value={filters.to}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                />
              </label>
            </div>
            <div className="col-md-3">
              <label>Estado
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="ABIERTA">ABIERTA</option>
                  <option value="PAGADA">PAGADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </label>
            </div>
            <div className="col-md-3">
              <label>Método pago
                <select
                  className="form-select"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-3 admin-actions-row">
            <button type="button" className="touch-btn btn-primary" onClick={() => load(filters)} disabled={loading}>
              {loading ? 'Cargando...' : 'Aplicar filtros'}
            </button>
            <button
              type="button"
              className="touch-btn"
              onClick={() => {
                setFilters(initialFilters);
                load(initialFilters);
              }}
              disabled={loading}
            >
              Limpiar
            </button>
          </div>
        </section>

        {error && <p className="error-text">{error}</p>}

        <section className="cash-info-grid">
          <article className="dashboard-card"><p className="kpi-label">Tickets</p><p className="kpi-value">{formatNumber(report.totals?.tickets || 0, 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Total vendido</p><p className="kpi-value">{formatAmount(report.totals?.totalAmount)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ventas pagadas</p><p className="kpi-value">{formatAmount(report.totals?.totalPaid)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Promedio ticket</p><p className="kpi-value">{formatAmount(report.totals?.averageTicket)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ítems vendidos</p><p className="kpi-value">{formatNumber(report.totals?.totalItems || 0, 2)}</p></article>
        </section>

        <SimpleDataTable
          title="Detalle de ventas"
          rows={report.rows || []}
          pageSize={10}
          filters={[
            {
              key: 'status',
              label: 'Estado',
              accessor: (row) => row.status,
              options: [
                { value: 'ABIERTA', label: 'ABIERTA' },
                { value: 'PAGADA', label: 'PAGADA' },
                { value: 'CANCELADA', label: 'CANCELADA' },
              ],
            },
          ]}
          columns={[
            { key: 'id', label: '#', accessor: (row) => row.id, sortable: true },
            { key: 'date', label: 'Fecha', accessor: (row) => row.paidAt || row.openedAt, sortable: true, render: (row) => formatDate(row.paidAt || row.openedAt) },
            { key: 'table', label: 'Mesa', accessor: (row) => row.tableNumber, sortable: true },
            { key: 'user', label: 'Vendedor', accessor: (row) => row.userName, sortable: true },
            { key: 'items', label: 'Ítems', accessor: (row) => Number(row.itemsQty || 0), sortable: true },
            { key: 'paymentMethod', label: 'Pago', accessor: (row) => row.paymentMethod, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => row.status, sortable: true },
            { key: 'total', label: 'Total', accessor: (row) => Number(row.total || 0), sortable: true, render: (row) => formatAmount(row.total) },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              sortable: false,
              render: (row) => {
                const canInvoice = row.status === 'PAGADA' && !invoicedSaleIds.has(Number(row.id));
                const canReprint = row.status === 'PAGADA' && invoicedSaleIds.has(Number(row.id));
                if (!canInvoice && !canReprint) return '-';
                return (
                  <div className="d-flex gap-2">
                    {canInvoice && (
                      <button
                        type="button"
                        className="touch-btn btn-primary"
                        onClick={() => {
                          setSelectedInvoiceType('B');
                          setInvoiceModalSale(row);
                        }}
                      >
                        Facturar
                      </button>
                    )}
                    {canReprint && (
                      <button
                        type="button"
                        className="touch-btn"
                        onClick={() => handleReprint(row)}
                        disabled={loading}
                      >
                        Reimprimir
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
        {invoiceModalSale && (
          <Modal
            title={`Facturar venta #${invoiceModalSale.id}`}
            onClose={() => setInvoiceModalSale(null)}
            actions={(
              <>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setInvoiceModalSale(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleCreateInvoice} disabled={loading}>
                  {loading ? 'Facturando...' : 'Facturar e imprimir'}
                </button>
              </>
            )}
            size="sm"
          >
            <div className="d-grid gap-3">
              <p className="mb-0">Seleccioná el tipo de comprobante para emitir e imprimir el ticket.</p>
              <div>
                <label className="form-label mb-1">Tipo de comprobante</label>
                <select className="form-select" value={selectedInvoiceType} onChange={(event) => setSelectedInvoiceType(event.target.value)}>
                  <option value="A">Factura A</option>
                  <option value="B">Factura B</option>
                  <option value="C">Factura C</option>
                </select>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default SalesManagement;
