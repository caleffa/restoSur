const { pool } = require('../../config/database');
const salesRepo = require('../sales/sales.repository');
const repo = require('./kitchen.repository');
const AppError = require('../../utils/appError');
const ALLOWED_STATUS = ['PENDIENTE', 'PREPARANDO', 'LISTO'];

function normalizeKitchenStatus(status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (!ALLOWED_STATUS.includes(normalizedStatus)) {
    throw new AppError(`Estado inválido. Debe ser: ${ALLOWED_STATUS.join(', ')}`, 400);
  }
  return normalizedStatus;
}

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
  list: async (branchId) => {
    const rows = await repo.listPending(branchId);
    return rows.map((row) => ({
      id: row.id,
      saleId: row.sale_id,
      branchId: row.branch_id,
      tableId: row.table_id,
      status: row.status,
      createdAt: row.sent_at,
      updatedAt: row.updated_at,
    }));
  },
  updateStatus: async (id, status) => {
    const kitchenOrderId = Number(id);
    if (!Number.isInteger(kitchenOrderId) || kitchenOrderId <= 0) {
      throw new AppError('ID de comanda inválido', 400);
    }

    const normalizedStatus = normalizeKitchenStatus(status);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const existingOrder = await repo.findById(kitchenOrderId, conn);
      if (!existingOrder) throw new AppError('Comanda no encontrada', 404);

      await repo.updateKitchenStatus(kitchenOrderId, normalizedStatus, conn);
      await repo.syncSaleItemsKitchenStatusByOrderId(kitchenOrderId, normalizedStatus, conn);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  listByTable: async (tableId, branchId) => {
    const rows = await repo.listByTable(tableId, branchId);
    return rows.map((row) => ({
      id: row.id,
      saleId: row.sale_id,
      branchId: row.branch_id,
      tableId: row.table_id,
      status: row.status,
      createdAt: row.sent_at,
      updatedAt: row.updated_at,
    }));
  },
  createByTable: async ({ tableId, branchId, status = 'PENDIENTE' }) => {
    const sale = await salesRepo.findOpenSaleByTable(tableId);
    if (!sale) throw new AppError('Venta abierta no encontrada para la mesa', 404);

    const created = await repo.createKitchenOrder({ saleId: sale.id, branchId: sale.branch_id || branchId });
    if (status && status !== 'PENDIENTE') {
      await repo.updateKitchenStatus(created.id, status);
    }
    const order = await repo.findById(created.id);

    return {
      id: order.id,
      saleId: order.sale_id,
      branchId: order.branch_id,
      tableId: order.table_id,
      status: status || order.status,
      createdAt: order.sent_at,
      updatedAt: order.updated_at,
    };
  },
};
