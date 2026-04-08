import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  createInvoice,
  getAfipCaea,
  getAfipConfig,
  getInvoices,
  getSalesReport,
  requestCaea,
  saveAfipConfig,
} from '../services/adminService';

const INITIAL_AFIP_CONFIG = {
  cuit: '',
  pointOfSale: '',
  environment: 'HOMOLOGACION',
  wsMode: 'MOCK',
  certPath: '',
  keyPath: '',
  serviceTaxId: '',
};

const INITIAL_INVOICE_FORM = {
  saleId: '',
  invoiceType: 'B',
  authorizationType: 'CAE',
  authorizationCode: '',
  caeExpiration: '',
  caeaId: '',
};

function AdminInvoices() {
  const [searchParams] = useSearchParams();
  const [configForm, setConfigForm] = useState(INITIAL_AFIP_CONFIG);
  const [invoiceForm, setInvoiceForm] = useState(INITIAL_INVOICE_FORM);
  const [caeaList, setCaeaList] = useState([]);
  const [paidSales, setPaidSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [config, caea, paid, invoicesData] = await Promise.all([
        getAfipConfig(),
        getAfipCaea(),
        getSalesReport({ status: 'PAGADA' }),
        getInvoices(),
      ]);
      if (config) {
        setConfigForm({
          cuit: config.cuit || '',
          pointOfSale: config.point_of_sale || '',
          environment: config.environment || 'HOMOLOGACION',
          wsMode: config.ws_mode || 'MOCK',
          certPath: config.cert_path || '',
          keyPath: config.key_path || '',
          serviceTaxId: config.service_tax_id || '',
        });
      }
      setCaeaList(caea || []);
      const paidRows = Array.isArray(paid?.rows) ? paid.rows : Array.isArray(paid) ? paid : [];
      setPaidSales(paidRows.filter((sale) => sale.status === 'PAGADA'));
      setInvoices(invoicesData || []);
    } catch {
      setError('No se pudo cargar el módulo de facturación.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const invoicedSaleIds = useMemo(() => new Set(invoices.map((invoice) => Number(invoice.sale_id))), [invoices]);

  const createInvoiceOptions = paidSales.filter((sale) => !invoicedSaleIds.has(Number(sale.id)));

  useEffect(() => {
    const saleIdFromQuery = Number(searchParams.get('saleId'));
    if (!saleIdFromQuery) return;
    const existsInOptions = createInvoiceOptions.some((sale) => Number(sale.id) === saleIdFromQuery);
    if (!existsInOptions) return;
    setInvoiceForm((prev) => ({ ...prev, saleId: String(saleIdFromQuery) }));
  }, [searchParams, createInvoiceOptions]);

  const onSaveConfig = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await saveAfipConfig({
        ...configForm,
        pointOfSale: Number(configForm.pointOfSale),
      });
      setMessage('Configuración AFIP guardada.');
      await loadData();
    } catch {
      setError('No se pudo guardar la configuración AFIP.');
    } finally {
      setLoading(false);
    }
  };

  const onRequestCaea = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await requestCaea({});
      setMessage('CAEA generado/recuperado correctamente.');
      await loadData();
    } catch {
      setError('No se pudo solicitar el CAEA. Revise configuración AFIP.');
    } finally {
      setLoading(false);
    }
  };

  const onCreateInvoice = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!invoiceForm.saleId) {
      setError('Seleccioná una venta pagada para facturar.');
      setMessage('');
      return;
    }

    if (invoiceForm.authorizationType === 'CAE' && !invoiceForm.authorizationCode.trim()) {
      setError('Ingresá el código CAE para emitir la factura.');
      setMessage('');
      return;
    }

    if (invoiceForm.authorizationType === 'CAEA' && !invoiceForm.caeaId) {
      setError('Seleccioná un CAEA válido para emitir la factura.');
      setMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await createInvoice({
        saleId: Number(invoiceForm.saleId),
        invoiceType: invoiceForm.invoiceType,
        authorizationType: invoiceForm.authorizationType,
        authorizationCode: invoiceForm.authorizationType === 'CAE' ? invoiceForm.authorizationCode : undefined,
        caeExpiration: invoiceForm.authorizationType === 'CAE' && invoiceForm.caeExpiration ? invoiceForm.caeExpiration : undefined,
        caeaId: invoiceForm.authorizationType === 'CAEA' ? Number(invoiceForm.caeaId) : undefined,
      });
      setMessage('Factura emitida con éxito.');
      setInvoiceForm(INITIAL_INVOICE_FORM);
      await loadData();
    } catch {
      setError('No se pudo emitir la factura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Administración de facturación AFIP</h2>
        <p>Configuración de AFIP, gestión de CAEA y emisión de facturas para ventas pagadas.</p>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <section className="admin-table-form">
          <h3>Configuración AFIP</h3>
          <form className="modal-form" onSubmit={onSaveConfig}>
            <input placeholder="CUIT" value={configForm.cuit} onChange={(e) => setConfigForm((prev) => ({ ...prev, cuit: e.target.value }))} />
            <input type="number" min="1" placeholder="Punto de venta" value={configForm.pointOfSale} onChange={(e) => setConfigForm((prev) => ({ ...prev, pointOfSale: e.target.value }))} required />
            <select value={configForm.environment} onChange={(e) => setConfigForm((prev) => ({ ...prev, environment: e.target.value }))}>
              <option value="HOMOLOGACION">Homologación</option>
              <option value="PRODUCCION">Producción</option>
            </select>
            <select value={configForm.wsMode} onChange={(e) => setConfigForm((prev) => ({ ...prev, wsMode: e.target.value }))}>
              <option value="MOCK">Integración mock (dev)</option>
              <option value="MANUAL">Manual (ingresar CAEA)</option>
            </select>
            <input placeholder="Ruta certificado (opcional)" value={configForm.certPath} onChange={(e) => setConfigForm((prev) => ({ ...prev, certPath: e.target.value }))} />
            <input placeholder="Ruta llave privada (opcional)" value={configForm.keyPath} onChange={(e) => setConfigForm((prev) => ({ ...prev, keyPath: e.target.value }))} />
            <input placeholder="CUIT servicio (opcional)" value={configForm.serviceTaxId} onChange={(e) => setConfigForm((prev) => ({ ...prev, serviceTaxId: e.target.value }))} />
            <button className="touch-btn btn-primary" type="submit" disabled={loading}>Guardar configuración</button>
          </form>
        </section>

        <section className="admin-table-form">
          <h3>CAEA</h3>
          <div className="admin-actions-row">
            <button type="button" className="touch-btn btn-primary" onClick={onRequestCaea} disabled={loading}>Solicitar CAEA</button>
          </div>
          <div className="admin-table-list">
            {caeaList.map((caea) => (
              <article key={caea.id} className="admin-table-item">
                <div>
                  <strong>{caea.caea_code}</strong>
                  <p>Período: {caea.period_year} / {caea.period_half} - Vto: {String(caea.due_date).slice(0, 10)}</p>
                </div>
              </article>
            ))}
            {!caeaList.length && <p>No hay CAEA cargados.</p>}
          </div>
        </section>

        <section className="admin-table-form">
          <h3>Emitir factura</h3>
          <form className="modal-form" onSubmit={onCreateInvoice} noValidate>
            <select value={invoiceForm.saleId} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, saleId: e.target.value }))}>
              <option value="">Venta pagada</option>
              {createInvoiceOptions.map((sale) => (
                <option key={sale.id} value={sale.id}>Venta #{sale.id} - Mesa {sale.tableNumber || sale.table_number} - ${Number(sale.total).toFixed(2)}</option>
              ))}
            </select>
            <select value={invoiceForm.invoiceType} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, invoiceType: e.target.value }))}>
              <option value="A">Factura A</option>
              <option value="B">Factura B</option>
              <option value="C">Factura C</option>
            </select>
            <select value={invoiceForm.authorizationType} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, authorizationType: e.target.value }))}>
              <option value="CAE">CAE</option>
              <option value="CAEA">CAEA</option>
            </select>
            {invoiceForm.authorizationType === 'CAE' ? (
              <>
                <input placeholder="Código CAE" value={invoiceForm.authorizationCode} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, authorizationCode: e.target.value }))} />
                <input type="date" value={invoiceForm.caeExpiration} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, caeExpiration: e.target.value }))} />
              </>
            ) : (
              <select value={invoiceForm.caeaId} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, caeaId: e.target.value }))}>
                <option value="">Seleccionar CAEA</option>
                {caeaList.map((caea) => (
                  <option key={caea.id} value={caea.id}>{caea.caea_code} - {caea.period_year}/{caea.period_half}</option>
                ))}
              </select>
            )}
            <button className="touch-btn btn-primary" type="submit" disabled={loading}>Emitir factura</button>
          </form>
        </section>

        <section className="admin-table-form">
          <h3>Facturas emitidas</h3>
          <div className="admin-table-list">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="admin-table-item">
                <div>
                  <strong>Factura #{invoice.id} - Venta #{invoice.sale_id}</strong>
                  <p>{invoice.invoice_type} | {invoice.authorization_type} | Código: {invoice.authorization_code}</p>
                  <p>Total: ${Number(invoice.total).toFixed(2)} | Mesa: {invoice.table_number || '-'} | Usuario: {invoice.created_by_name || '-'}</p>
                </div>
              </article>
            ))}
            {!invoices.length && <p>No hay facturas emitidas todavía.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminInvoices;
