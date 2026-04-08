const AppError = require('../../utils/appError');
const salesRepo = require('../sales/sales.repository');
const afipRepo = require('../afip/afip.repository');
const repo = require('./invoices.repository');

async function createInvoice(data, user) {
  const sale = await salesRepo.findSaleById(data.saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  if (sale.status !== 'PAGADA') throw new AppError('Solo se puede facturar una venta PAGADA', 400);

  const existingInvoice = await repo.findBySaleId(data.saleId);
  if (existingInvoice) throw new AppError('La venta ya tiene una factura asociada', 409);

  let authorizationCode = data.authorizationCode;

  if (data.authorizationType === 'CAEA') {
    if (!data.caeaId) throw new AppError('caeaId requerido para comprobantes CAEA', 400);
    const caea = await afipRepo.getById(data.caeaId);
    if (!caea) throw new AppError('CAEA inexistente', 400);
    authorizationCode = caea.caea_code;
  }

  if (!authorizationCode) throw new AppError('authorizationCode requerido', 400);

  return repo.createInvoice({
    ...data,
    authorizationCode,
    branchId: sale.branch_id,
    total: sale.total,
    createdBy: user.id,
  });
}

async function listInvoices(branchId) {
  return repo.listByBranch(branchId);
}

module.exports = { createInvoice, listInvoices };
