import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { getSaleDetail } from '../services/kitchenService';
import { exportSalesReport, getSalesReport, getVatSalesBook } from '../services/salesService';
import { createInvoice, getAfipConfig, getInvoices } from '../services/adminService';
import { formatCurrency, formatNumber } from '../utils/formatters';

const initialFilters = {
  from: '',
  to: '',
  status: '',
  paymentMethod: '',
};
const initialPagination = { page: 1, pageSize: 25 };
const initialSort = { sortBy: 'date', sortDirection: 'DESC' };

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
  const [report, setReport] = useState({ totals: {}, rows: [], pagination: initialPagination });
  const [vatBook, setVatBook] = useState({ totals: {}, rows: [] });
  const [showVatBook, setShowVatBook] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState(initialPagination);
  const [sort, setSort] = useState(initialSort);
  const [afipConfig, setAfipConfig] = useState(null);
  const [invoiceModalSale, setInvoiceModalSale] = useState(null);
  const [selectedInvoiceType, setSelectedInvoiceType] = useState('B');
  const [invoicedSaleIds, setInvoicedSaleIds] = useState(new Set());
  const [invoicesBySaleId, setInvoicesBySaleId] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({
    nextFilters = filters,
    nextPagination = pagination,
    nextSort = sort,
    nextSearch = search,
  } = {}) => {
    setLoading(true);
    try {
      const [data, invoices, afipConfigData] = await Promise.all([
        getSalesReport({
          ...nextFilters,
          page: nextPagination.page,
          pageSize: nextPagination.pageSize,
          search: nextSearch,
          sortBy: nextSort.sortBy,
          sortDirection: nextSort.sortDirection,
        }),
        getInvoices(),
        getAfipConfig(),
      ]);
      setReport(data);
      const vatBookData = await getVatSalesBook(nextFilters);
      setVatBook(vatBookData);
      setInvoicedSaleIds(new Set((invoices || []).map((invoice) => Number(invoice.sale_id))));
      setInvoicesBySaleId(new Map((invoices || []).map((invoice) => [Number(invoice.sale_id), invoice])));
      setAfipConfig(afipConfigData || null);
      setError('');
    } catch {
      setError('No se pudo cargar el reporte de ventas.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, search, sort]);

  useEffect(() => {
    load({
      nextFilters: initialFilters,
      nextPagination: initialPagination,
      nextSort: initialSort,
      nextSearch: '',
    });
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
console.table(saleData);
    const itemsHtml = (saleData?.items || [])
      .map((item) => `
        <tr>
          <td colspan="4" style="text-align:left;">${Number(item.quantity)} x ${formatCurrency(item.unitPrice)}</td>          

        </tr>
        <tr>
          <td colspan="3">${item.articleName}</td>
          <td style="text-align:right;">${formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</td>
        </tr>
      `)
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

  const loadSaleAndPrint = useCallback(async (saleId, invoiceData, paymentMethod) => {
    const saleDetail = await getSaleDetail(saleId);
    const normalizedSale = {
      ...saleDetail,
      tableId: saleDetail?.tableId || saleDetail?.table_id,
      total: saleDetail?.total ?? invoiceData?.total,
      items: (saleDetail?.items || []).map((item) => ({
        ...item,
        articleName: item.articleName || item.article_name || item.name,
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
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo facturar la venta.');
    } finally {
      setLoading(false);
    }
  }, [invoiceModalSale, load, loadSaleAndPrint, loading, selectedInvoiceType]);

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

  const handleExportExcel = useCallback(async () => {
    try {
      setLoading(true);
      const blob = await exportSalesReport({
        ...filters,
        search,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `reporte_ventas_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [filters, search, sort.sortBy, sort.sortDirection]);

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
            <button
              type="button"
              className="touch-btn btn-primary"
              onClick={() => {
                const nextPagination = { ...pagination, page: 1 };
                setPagination(nextPagination);
                load({ nextFilters: filters, nextPagination });
              }}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Aplicar filtros'}
            </button>
            <button
              type="button"
              className="touch-btn"
              onClick={() => {
                setFilters(initialFilters);
                setSearch('');
                setSort(initialSort);
                setPagination(initialPagination);
                load({
                  nextFilters: initialFilters,
                  nextPagination: initialPagination,
                  nextSort: initialSort,
                  nextSearch: '',
                });
              }}
              disabled={loading}
            >
              Limpiar
            </button>
            <button type="button" className="touch-btn" onClick={handleExportExcel} disabled={loading}>
              Exportar a Excel (CSV)
            </button>
            <button type="button" className="touch-btn" onClick={() => setShowVatBook((prev) => !prev)}>
              {showVatBook ? 'Ocultar libro IVA' : 'Ver libro IVA ventas'}
            </button>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-actions-row">
            <label className="mb-0 d-grid">
              Búsqueda rápida
              <input
                type="search"
                className="form-control"
                placeholder="ID venta, vendedor o mesa"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="touch-btn btn-primary"
              onClick={() => {
                const nextPagination = { ...pagination, page: 1 };
                setPagination(nextPagination);
                load({ nextSearch: search, nextPagination });
              }}
              disabled={loading}
            >
              Buscar
            </button>
            <label className="mb-0">
              Orden
              <select
                className="form-select"
                value={`${sort.sortBy}:${sort.sortDirection}`}
                onChange={(event) => {
                  const [sortBy, sortDirection] = event.target.value.split(':');
                  const nextSort = { sortBy, sortDirection };
                  setSort(nextSort);
                  const nextPagination = { ...pagination, page: 1 };
                  setPagination(nextPagination);
                  load({ nextSort, nextPagination });
                }}
              >
                <option value="date:DESC">Fecha desc</option>
                <option value="date:ASC">Fecha asc</option>
                <option value="total:DESC">Mayor total</option>
                <option value="total:ASC">Menor total</option>
                <option value="id:DESC">ID desc</option>
                <option value="id:ASC">ID asc</option>
              </select>
            </label>
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
          pageSize={report.pagination?.pageSize || pagination.pageSize}
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
        <section className="admin-card">
          <div className="admin-pagination-row">
            <span>
              Página {report.pagination?.page || 1} de {report.pagination?.totalPages || 1} | Registros: {formatNumber(report.pagination?.totalRecords || 0, 0)}
            </span>
            <div className="admin-actions-row">
              <button
                type="button"
                className="touch-btn"
                onClick={() => {
                  const nextPage = Math.max(1, (pagination.page || 1) - 1);
                  const nextPagination = { ...pagination, page: nextPage };
                  setPagination(nextPagination);
                  load({ nextPagination });
                }}
                disabled={loading || (report.pagination?.page || 1) <= 1}
              >
                Anterior
              </button>
              <button
                type="button"
                className="touch-btn"
                onClick={() => {
                  const current = report.pagination?.page || 1;
                  const totalPages = report.pagination?.totalPages || 1;
                  const nextPage = Math.min(totalPages, current + 1);
                  const nextPagination = { ...pagination, page: nextPage };
                  setPagination(nextPagination);
                  load({ nextPagination });
                }}
                disabled={loading || (report.pagination?.page || 1) >= (report.pagination?.totalPages || 1)}
              >
                Siguiente
              </button>
              <select
                className="form-select"
                style={{ width: 140 }}
                value={pagination.pageSize}
                onChange={(event) => {
                  const nextPagination = { page: 1, pageSize: Number(event.target.value) };
                  setPagination(nextPagination);
                  load({ nextPagination });
                }}
              >
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </div>
        </section>

        {showVatBook && (
          <section className="admin-card">
            <h3>Libro IVA Ventas</h3>
            <p className="mb-2">
              Comprobantes: {formatNumber(vatBook.totals?.vouchers || 0, 0)} | Neto: {formatAmount(vatBook.totals?.netAmount || 0)} | IVA 21%: {formatAmount(vatBook.totals?.vat21 || 0)} | Total: {formatAmount(vatBook.totals?.total || 0)}
            </p>
            <div className="admin-table-wrap">
              <table className="table table-striped table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Comprobante</th>
                    <th>Autorización</th>
                    <th>Neto</th>
                    <th>IVA 21%</th>
                    <th>Total</th>
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {(vatBook.rows || []).map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.issueDate)}</td>
                      <td>Factura {row.invoiceType}</td>
                      <td>{row.voucherNumber || '-'}</td>
                      <td>{row.authorizationType} {row.authorizationCode}</td>
                      <td>{formatAmount(row.netAmount)}</td>
                      <td>{formatAmount(row.vat21)}</td>
                      <td>{formatAmount(row.total)}</td>
                      <td>{row.paymentMethod || '-'}</td>
                    </tr>
                  ))}
                  {!(vatBook.rows || []).length && (
                    <tr><td colSpan={8} className="text-center py-3">Sin comprobantes para el período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
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
