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
import { formatCurrency } from '../utils/formatters';

const INITIAL_AFIP_CONFIG = {
  cuit: '',
  issuerName: '',
  issuerAddress: '',
  pointOfSale: '',
  environment: 'HOMOLOGACION',
  wsMode: 'MOCK',
  certPath: '',
  keyPath: '',
  serviceTaxId: '',
  ticketLogoPath: '',
};

const INITIAL_INVOICE_FORM = {
  saleId: '',
  invoiceType: 'B',
  authorizationType: 'CAE',
  authorizationCode: '',
  caeExpiration: '',
  caeaId: '',
};

const getApiErrorMessage = (error, fallback) => {
  const apiMessage = error?.response?.data?.message;
  const genericMessage = error?.message;
  return apiMessage || (genericMessage && genericMessage !== 'Network Error' ? genericMessage : fallback);
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
  const [ticketLogoData, setTicketLogoData] = useState('');
  const [ticketLogoName, setTicketLogoName] = useState('');
  const [removeTicketLogo, setRemoveTicketLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const loadData = useCallback(async (keepLogoPreview = false) => {
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
          issuerName: config.issuer_name || '',
          issuerAddress: config.issuer_address || '',
          pointOfSale: config.point_of_sale || '',
          environment: config.environment || 'HOMOLOGACION',
          wsMode: config.ws_mode || 'MOCK',
          certPath: config.cert_path || '',
          keyPath: config.key_path || '',
          serviceTaxId: config.service_tax_id || '',
          ticketLogoPath: config.ticket_logo_path || '',
        });
        
        // Solo resetear la previsualización si no estamos guardando
        if (!keepLogoPreview) {
          setTicketLogoData('');
          setTicketLogoName('');
          setRemoveTicketLogo(false);
        }
        setLogoError(false);
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
      // Preparar datos para guardar
      const configToSave = {
        cuit: configForm.cuit,
        issuerName: configForm.issuerName,
        issuerAddress: configForm.issuerAddress,
        pointOfSale: Number(configForm.pointOfSale),
        environment: configForm.environment,
        wsMode: configForm.wsMode,
        certPath: configForm.certPath,
        keyPath: configForm.keyPath,
        serviceTaxId: configForm.serviceTaxId,
        removeTicketLogo,
      };
      
      // Solo enviar logoData si hay una nueva imagen seleccionada
      if (ticketLogoData) {
        configToSave.ticketLogoData = ticketLogoData;
        configToSave.ticketLogoName = ticketLogoName;
      }
      
      await saveAfipConfig(configToSave);
      setMessage('Configuración AFIP guardada.');
      
      // Recargar datos pero mantener la previsualización si existe
      await loadData(true);
      
      // Si se eliminó el logo, limpiar la previsualización
      if (removeTicketLogo) {
        setTicketLogoData('');
        setTicketLogoName('');
        setRemoveTicketLogo(false);
      }
      
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo guardar la configuración AFIP.'));
    } finally {
      setLoading(false);
    }
  };

  const onLogoFileChange = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato de logo no compatible. Use JPG, PNG, WEBP o GIF.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('El logo debe pesar menos de 2 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setTicketLogoData(result);
      setTicketLogoName(file.name);
      setRemoveTicketLogo(false);
      setError('');
      setLogoError(false);
      
      // Limpiar el campo file para permitir seleccionar el mismo archivo nuevamente
      event.target.value = '';
    };
    reader.onerror = () => setError('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo solicitar el CAEA. Revise configuración AFIP.'));
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
    } catch (error) {
      setError(getApiErrorMessage(error, 'No se pudo emitir la factura.'));
    } finally {
      setLoading(false);
    }
  };

  // Determinar la URL de la imagen del logo
  const logoSrc = useMemo(() => {
    if (ticketLogoData) return ticketLogoData;
    if (configForm.ticketLogoPath && !removeTicketLogo) return configForm.ticketLogoPath;
    return null;
  }, [ticketLogoData, configForm.ticketLogoPath, removeTicketLogo]);

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
            <input 
              placeholder="CUIT" 
              value={configForm.cuit} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, cuit: e.target.value }))} 
            />
            <input 
              placeholder="Razón social emisor" 
              value={configForm.issuerName} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, issuerName: e.target.value }))} 
            />
            <input 
              placeholder="Domicilio comercial emisor" 
              value={configForm.issuerAddress} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, issuerAddress: e.target.value }))} 
            />
            <input 
              type="number" 
              min="1" 
              placeholder="Punto de venta" 
              value={configForm.pointOfSale} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, pointOfSale: e.target.value }))} 
              required 
            />
            <select 
              value={configForm.environment} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, environment: e.target.value }))}
            >
              <option value="HOMOLOGACION">Homologación</option>
              <option value="PRODUCCION">Producción</option>
            </select>
            <select 
              value={configForm.wsMode} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, wsMode: e.target.value }))}
            >
              <option value="MOCK">Integración mock (dev)</option>
              <option value="MANUAL">Manual (ingresar CAEA)</option>
              <option value="AFIP">AFIP WSFE (real)</option>
            </select>
            <input 
              placeholder="Ruta certificado (opcional)" 
              value={configForm.certPath} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, certPath: e.target.value }))} 
            />
            <input 
              placeholder="Ruta llave privada (opcional)" 
              value={configForm.keyPath} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, keyPath: e.target.value }))} 
            />
            <input 
              placeholder="CUIT servicio (opcional)" 
              value={configForm.serviceTaxId} 
              onChange={(e) => setConfigForm((prev) => ({ ...prev, serviceTaxId: e.target.value }))} 
            />
            
            <label htmlFor="ticketLogoUpload">Logo para ticket (57mm, opcional)</label>
            <input 
              id="ticketLogoUpload" 
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/gif" 
              onChange={onLogoFileChange} 
            />
            
            {logoSrc && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={logoSrc}
                  alt="Logo del ticket"
                  style={{ 
                    maxWidth: '220px', 
                    maxHeight: '80px', 
                    objectFit: 'contain', 
                    border: '1px solid #ddd', 
                    padding: '4px', 
                    borderRadius: '6px',
                    backgroundColor: '#fff'
                  }}
                  onError={(e) => {
                    console.error('Error cargando logo:', logoSrc);
                    setLogoError(true);
                    e.target.style.display = 'none';
                  }}
                />
                {logoError && (
                  <p style={{ color: '#ff9800', fontSize: '12px', marginTop: '5px' }}>
                    ⚠️ No se pudo cargar la imagen. Verifica la ruta o el formato.
                  </p>
                )}
                <div className="admin-actions-row" style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="touch-btn btn-danger"
                    onClick={() => {
                      setTicketLogoData('');
                      setTicketLogoName('');
                      setRemoveTicketLogo(true);
                      setConfigForm((prev) => ({ ...prev, ticketLogoPath: '' }));
                      setLogoError(false);
                    }}
                  >
                    🗑️ Quitar logo
                  </button>
                </div>
              </div>
            )}
            
            <button className="touch-btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : '💾 Guardar configuración'}
            </button>
          </form>
        </section>

        <section className="admin-table-form">
          <h3>CAEA</h3>
          <div className="admin-actions-row">
            <button type="button" className="touch-btn btn-primary" onClick={onRequestCaea} disabled={loading}>
              {loading ? 'Procesando...' : '📄 Solicitar CAEA'}
            </button>
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
            <select 
              value={invoiceForm.saleId} 
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, saleId: e.target.value }))}
            >
              <option value="">Seleccionar venta pagada</option>
              {createInvoiceOptions.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  Venta #{sale.id} - Mesa {sale.tableNumber || sale.table_number} - {formatCurrency(sale.total)}
                </option>
              ))}
            </select>
            
            <select 
              value={invoiceForm.invoiceType} 
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, invoiceType: e.target.value }))}
            >
              <option value="A">Factura A</option>
              <option value="B">Factura B</option>
              <option value="C">Factura C</option>
            </select>
            
            <select 
              value={invoiceForm.authorizationType} 
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, authorizationType: e.target.value }))}
            >
              <option value="CAE">CAE</option>
              <option value="CAEA">CAEA</option>
            </select>
            
            {invoiceForm.authorizationType === 'CAE' ? (
              <>
                <input 
                  placeholder="Código CAE (opcional: autogenerado AFIP)" 
                  value={invoiceForm.authorizationCode} 
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, authorizationCode: e.target.value }))} 
                />
                <input 
                  type="date" 
                  value={invoiceForm.caeExpiration} 
                  onChange={(e) => setInvoiceForm((prev) => ({ ...prev, caeExpiration: e.target.value }))} 
                />
              </>
            ) : (
              <select 
                value={invoiceForm.caeaId} 
                onChange={(e) => setInvoiceForm((prev) => ({ ...prev, caeaId: e.target.value }))}
              >
                <option value="">Seleccionar CAEA</option>
                {caeaList.map((caea) => (
                  <option key={caea.id} value={caea.id}>
                    {caea.caea_code} - {caea.period_year}/{caea.period_half}
                  </option>
                ))}
              </select>
            )}
            
            <button className="touch-btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Emitiendo...' : '🧾 Emitir factura'}
            </button>
          </form>
        </section>

        <section className="admin-table-form">
          <h3>Facturas emitidas</h3>
          <div className="admin-table-list">
            {invoices.map((invoice) => (
              <article key={invoice.id} className="admin-table-item">
                <div>
                  <strong>Factura #{invoice.id} - Venta #{invoice.sale_id}</strong>
                  <p>{invoice.invoice_type} | {invoice.authorization_type} | Código: {invoice.authorization_code} | Comprobante: {invoice.voucher_number || '-'}</p>
                  <p>Total: {formatCurrency(invoice.total)} | Mesa: {invoice.table_number || '-'} | Usuario: {invoice.created_by_name || '-'}</p>
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