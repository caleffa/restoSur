const { pool } = require('../../config/database');
const salesRepo = require('../sales/sales.repository');
const recipesRepo = require('../recipes/recipes.repository');
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
    const items = await salesRepo.listItemsBySale(saleId, conn);
    const pendingItems = items.filter((item) => item.is_product && item.kitchen_status === 'PENDIENTE');
    const recipes = await recipesRepo.findByProductIds(pendingItems.map((item) => item.article_id), conn);
    const recipeMap = new Map(recipes.map((recipe) => [Number(recipe.product_id), recipe]));

    for (const item of pendingItems) {
      const recipe = recipeMap.get(Number(item.article_id));
      if (!recipe || !recipe.kitchen_id) {
        throw new AppError(`El producto "${item.article_name}" no tiene receta con cocina asignada`, 400);
      }
      await repo.createKitchenOrder({
        saleId,
        saleItemId: item.id,
        branchId: sale.branch_id,
        quantity: item.quantity,
        kitchenId: recipe.kitchen_id,
      }, conn);
      await repo.updateSaleItemAsSent(item.id, conn);
    }
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
      saleItemId: row.sale_item_id,
      branchId: row.branch_id,
      tableId: row.table_id,
      tableNumber: row.table_number || null,
      articleName: row.article_name,
      quantity: Number(row.quantity),
      kitchenId: row.kitchen_id ? Number(row.kitchen_id) : null,
      kitchenName: row.kitchen_name || null,
      status: row.status,
      userId: row.user_id ? Number(row.user_id) : null,
      updatedByName: row.user_name || null,
      waiterName: row.waiter_name || null,
      createdAt: row.sent_at,
      updatedAt: row.updated_at,
    }));
  },
  updateStatus: async (id, status, userId) => {
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

      await repo.updateKitchenStatus(kitchenOrderId, normalizedStatus, userId, conn);
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
      saleItemId: row.sale_item_id,
      branchId: row.branch_id,
      tableId: row.table_id,
      articleName: row.article_name,
      quantity: Number(row.quantity),
      kitchenId: row.kitchen_id ? Number(row.kitchen_id) : null,
      kitchenName: row.kitchen_name || null,
      status: row.status,
      userId: row.user_id ? Number(row.user_id) : null,
      updatedByName: row.user_name || null,
      createdAt: row.sent_at,
      updatedAt: row.updated_at,
    }));
  },
  createByTable: async ({ tableId, branchId, saleItemId, quantity, status = 'PENDIENTE' }) => {
    const sale = await salesRepo.findOpenSaleByTable(tableId);
    if (!sale) throw new AppError('Venta abierta no encontrada para la mesa', 404);
    const items = await salesRepo.listItemsBySale(sale.id);
    const targetItem = items.find((item) => Number(item.id) === Number(saleItemId));
    if (!targetItem || !targetItem.is_product) throw new AppError('Item de venta inválido para cocina', 400);
    if (targetItem.kitchen_status !== 'PENDIENTE') throw new AppError('El item ya fue enviado a cocina', 400);
    const recipe = await recipesRepo.findByProductId(targetItem.article_id);
    if (!recipe || !recipe.kitchen_id) {
      throw new AppError(`El producto "${targetItem.article_name}" no tiene receta con cocina asignada`, 400);
    }

    const created = await repo.createKitchenOrder({
      saleId: sale.id,
      saleItemId: targetItem.id,
      branchId: sale.branch_id || branchId,
      quantity: Number(quantity) > 0 ? quantity : targetItem.quantity,
      kitchenId: recipe.kitchen_id,
    });
    await repo.updateSaleItemAsSent(targetItem.id);
    if (status && status !== 'PENDIENTE') {
      await repo.updateKitchenStatus(created.id, status);
    }
    const order = await repo.findById(created.id);

    return {
      id: order.id,
      saleId: order.sale_id,
      saleItemId: order.sale_item_id,
      branchId: order.branch_id,
      tableId: order.table_id,
      articleName: order.article_name,
      quantity: Number(order.quantity),
      kitchenId: order.kitchen_id ? Number(order.kitchen_id) : null,
      kitchenName: order.kitchen_name || null,
      status: status || order.status,
      userId: order.user_id ? Number(order.user_id) : null,
      updatedByName: order.user_name || null,
      createdAt: order.sent_at,
      updatedAt: order.updated_at,
    };
  },
};
