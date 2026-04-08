const AppError = require('../../utils/appError');
const salesRepo = require('../sales/sales.repository');
const afipRepo = require('../afip/afip.repository');
const { requestCaeForInvoice } = require('../afip/afipWsfe.service');
const repo = require('./invoices.repository');

function getTimeoutMs() {
  const raw = Number(process.env.AFIP_WS_TIMEOUT_MS || 10000);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
}

async function createInvoice(data, user) {
  const sale = await salesRepo.findSaleById(data.saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  if (sale.status !== 'PAGADA') throw new AppError('Solo se puede facturar una venta PAGADA', 400);

  const existingInvoice = await repo.findBySaleId(data.saleId);
  if (existingInvoice) throw new AppError('La venta ya tiene una factura asociada', 409);

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
    const config = await afipRepo.getConfig(sale.branch_id);
    if (!config) throw new AppError('Primero debe configurar AFIP para esta sucursal', 400);

    const afipResult = await requestCaeForInvoice({
      config,
      invoiceType: data.invoiceType,
      total: sale.total,
      timeoutMs: getTimeoutMs(),
    });

    authorizationCode = afipResult.cae;
    voucherNumber = afipResult.voucherNumber;
    caeExpiration = afipResult.caeExpiration || caeExpiration;
    afipResponse = afipResult.rawResult;
  }

  if (!authorizationCode) throw new AppError('authorizationCode requerido', 400);

  return repo.createInvoice({
    ...data,
    authorizationCode,
    voucherNumber,
    afipResponse,
    caeExpiration,
    branchId: sale.branch_id,
    total: sale.total,
    createdBy: user.id,
  });
}

async function listInvoices(branchId) {
  return repo.listByBranch(branchId);
}

module.exports = { createInvoice, listInvoices };
