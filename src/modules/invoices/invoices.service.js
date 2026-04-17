const AppError = require('../../utils/appError');
const salesRepo = require('../sales/sales.repository');
const afipRepo = require('../afip/afip.repository');
const { requestCaeForInvoice } = require('../afip/afipWsfe.service');
const repo = require('./invoices.repository');

function getTimeoutMs() {
  const raw = Number(process.env.AFIP_WS_TIMEOUT_MS || 30000);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
}

function generateMockCae() {
  return `${Date.now()}`.slice(-14).padStart(14, '0');
}

const DOCUMENT_TYPE_TO_AFIP = {
  DNI: 96,
  CUIT: 80,
};

function normalizeReceiverDocument(data = {}) {
  const receiverDocumentType = String(data.receiverDocumentType || '').toUpperCase().trim();
  const receiverDocumentNumber = String(data.receiverDocumentNumber || '').replace(/\D/g, '');

  if (!receiverDocumentType && !receiverDocumentNumber) {
    return { receiverDocumentType: null, receiverDocumentNumber: null, afipDocTipo: 99, afipDocNro: 0 };
  }

  if (!DOCUMENT_TYPE_TO_AFIP[receiverDocumentType]) {
    throw new AppError('Tipo de documento inválido. Use DNI o CUIT.', 400);
  }
  if (!receiverDocumentNumber) {
    throw new AppError('Debe informar el número de documento para nominar la venta.', 400);
  }

  return {
    receiverDocumentType,
    receiverDocumentNumber,
    afipDocTipo: DOCUMENT_TYPE_TO_AFIP[receiverDocumentType],
    afipDocNro: Number(receiverDocumentNumber),
  };
}

function resolveIdentificationThreshold(config, paymentMethod) {
  const normalizedMethod = String(paymentMethod || '').toUpperCase().trim();
  const cashThreshold = Number(config?.cash_identification_threshold ?? 191000);
  const nonCashThreshold = Number(config?.non_cash_identification_threshold ?? 344000);

  if (normalizedMethod === 'EFECTIVO') return cashThreshold;
  if (normalizedMethod === 'TARJETA' || normalizedMethod === 'TRANSFERENCIA') return nonCashThreshold;
  return Number.POSITIVE_INFINITY;
}

async function createInvoice(data, user) {
  const sale = await salesRepo.findSaleById(data.saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  if (sale.status !== 'PAGADA') throw new AppError('Solo se puede facturar una venta PAGADA', 400);

  const existingInvoice = await repo.findBySaleId(data.saleId);
  if (existingInvoice) throw new AppError('La venta ya tiene una factura asociada', 409);
  const config = await afipRepo.getConfig(sale.branch_id);
  if (!config) throw new AppError('Primero debe configurar AFIP para esta sucursal', 400);
  const paymentMethod = await salesRepo.findSalePaymentMethod(data.saleId);
  if (!paymentMethod) {
    throw new AppError('No se encontró el medio de pago de la venta cobrada.', 400);
  }
  const receiverDocument = normalizeReceiverDocument(data);
  const identificationThreshold = resolveIdentificationThreshold(config, paymentMethod);
  if (Number(sale.total) > identificationThreshold && !receiverDocument.receiverDocumentNumber) {
    throw new AppError('Para este monto y medio de pago debe informar DNI o CUIT para nominar la venta.', 400);
  }

  let authorizationCode = data.authorizationCode;
  let voucherNumber = data.voucherNumber || null;
  let afipResponse = null;
  let caeExpiration = data.caeExpiration || null;

  if (data.authorizationType === 'CAEA') {
    if (!data.caeaId) throw new AppError('caeaId requerido para comprobantes CAEA', 400);
    const caea = await afipRepo.getById(data.caeaId);
    if (!caea) throw new AppError('CAEA inexistente', 400);
    authorizationCode = caea.caea_code;
  }

  if (data.authorizationType === 'CAE' && !authorizationCode) {
    if (config.ws_mode === 'MANUAL') {
      throw new AppError('En modo MANUAL debe informar authorizationCode para CAE', 400);
    }

    if (config.ws_mode === 'AFIP') {
      const afipResult = await requestCaeForInvoice({
        config,
        invoiceType: data.invoiceType,
        total: sale.total,
        docTipo: receiverDocument.afipDocTipo,
        docNro: receiverDocument.afipDocNro,
        timeoutMs: getTimeoutMs(),
      });

      authorizationCode = afipResult.cae;
      voucherNumber = afipResult.voucherNumber;
      caeExpiration = afipResult.caeExpiration || caeExpiration;
      afipResponse = afipResult.rawResult;
    } else {
      const lastVoucher = await repo.getLastVoucherNumber(sale.branch_id, data.invoiceType);
      authorizationCode = generateMockCae();
      voucherNumber = lastVoucher + 1;
      afipResponse = { mode: 'MOCK', message: 'CAE generado localmente' };
    }
  }

  if (!authorizationCode) throw new AppError('authorizationCode requerido', 400);

  return repo.createInvoice({
    ...data,
    authorizationCode,
    voucherNumber,
    afipResponse,
    caeExpiration,
    receiverDocumentType: receiverDocument.receiverDocumentType,
    receiverDocumentNumber: receiverDocument.receiverDocumentNumber,
    branchId: sale.branch_id,
    total: sale.total,
    createdBy: user.id,
  });
}

async function listInvoices(branchId) {
  return repo.listByBranch(branchId);
}

module.exports = { createInvoice, listInvoices };
