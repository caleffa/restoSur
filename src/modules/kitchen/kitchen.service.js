const { pool } = require('../../config/database');
const salesRepo = require('../sales/sales.repository');
const repo = require('./kitchen.repository');
const AppError = require('../../utils/appError');

async function sendToKitchen(saleId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    await repo.createKitchenOrder({ saleId, branchId: sale.branch_id }, conn);
    await repo.updateSaleItemsAsSent(saleId, conn);
    await conn.commit();
    return { saleId, status: 'ENVIADO_A_COCINA', wsReady: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  sendToKitchen,
  list: (branchId) => repo.listPending(branchId),
  updateStatus: (id, status) => repo.updateKitchenStatus(id, status),
};
