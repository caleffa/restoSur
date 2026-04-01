const AppError = require('../../utils/appError');
const salesRepo = require('../sales/sales.repository');
const afipRepo = require('../afip/afip.repository');
const repo = require('./invoices.repository');

async function createInvoice(data) {
  const sale = await salesRepo.findSaleById(data.saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  if (sale.status !== 'PAGADA') throw new AppError('Solo se puede facturar una venta PAGADA', 400);

  if (data.authorizationType === 'CAEA') {
    if (!data.caeaId) throw new AppError('caeaId requerido para comprobantes CAEA', 400);
    const caea = await afipRepo.getById(data.caeaId);
    if (!caea) throw new AppError('CAEA inexistente', 400);
    data.authorizationCode = caea.caea_code;
  }

  return repo.createInvoice({ ...data, branchId: sale.branch_id, total: sale.total });
}

module.exports = { createInvoice };
