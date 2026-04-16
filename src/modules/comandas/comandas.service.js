const repo = require('./comandas.repository');
const salesRepo = require('../sales/sales.repository');
const recipesRepo = require('../recipes/recipes.repository');
const AppError = require('../../utils/appError');

const ALLOWED_STATUS = ['PENDIENTE', 'PREPARANDO', 'LISTO'];

function parseId(id, label) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(`${label} inválido`, 400);
  }
  return value;
}

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (!ALLOWED_STATUS.includes(normalized)) {
    throw new AppError(`Estado inválido. Debe ser: ${ALLOWED_STATUS.join(', ')}`, 400);
  }
  return normalized;
}

function mapComanda(row) {
  return {
    id: row.id,
    saleId: row.sale_id,
    saleItemId: row.sale_item_id,
    branchId: row.branch_id,
    tableId: row.table_id,
    articleName: row.article_name,
    kitchenId: row.kitchen_id ? Number(row.kitchen_id) : null,
    kitchenName: row.kitchen_name || null,
    quantity: Number(row.quantity),
    status: row.status,
    userId: row.user_id ? Number(row.user_id) : null,
    updatedByName: row.user_name || null,
    createdAt: row.sent_at,
    updatedAt: row.updated_at,
  };
}

async function listComandas({ branchId, status, tableId }) {
  const filters = {
    branchId: branchId ? parseId(branchId, 'branchId') : null,
    status: status ? normalizeStatus(status) : null,
    tableId: tableId ? parseId(tableId, 'tableId') : null,
  };

  const rows = await repo.list(filters);
  return rows.map(mapComanda);
}

async function getComandaById(id) {
  const comandaId = parseId(id, 'ID de comanda');
  const row = await repo.findById(comandaId);
  if (!row) throw new AppError('Comanda no encontrada', 404);
  return mapComanda(row);
}

async function createComanda({ saleId, saleItemId, quantity, status }) {
  const normalizedSaleId = parseId(saleId, 'saleId');
  const normalizedSaleItemId = parseId(saleItemId, 'saleItemId');
  const sale = await salesRepo.findSaleById(normalizedSaleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  const saleItems = await salesRepo.listItemsBySale(normalizedSaleId);
  const targetItem = saleItems.find((item) => Number(item.id) === normalizedSaleItemId);
  if (!targetItem || !targetItem.is_product) throw new AppError('saleItemId inválido para comanda', 400);
  const recipe = await recipesRepo.findByProductId(targetItem.article_id);
  if (!recipe || !recipe.kitchen_id) {
    throw new AppError(`El producto "${targetItem.article_name}" no tiene receta con cocina asignada`, 400);
  }

  const created = await repo.create({
    saleId: normalizedSaleId,
    saleItemId: normalizedSaleItemId,
    branchId: sale.branch_id,
    quantity: Number(quantity) > 0 ? quantity : targetItem.quantity,
    kitchenId: recipe.kitchen_id,
  });

  if (status) {
    await repo.updateStatus(created.id, normalizeStatus(status));
  }

  const row = await repo.findById(created.id);
  return mapComanda(row);
}

async function updateComandaStatus(id, status, userId) {
  const comandaId = parseId(id, 'ID de comanda');
  const existing = await repo.findById(comandaId);
  if (!existing) throw new AppError('Comanda no encontrada', 404);

  await repo.updateStatus(comandaId, normalizeStatus(status), userId);
  return getComandaById(comandaId);
}

async function removeComanda(id) {
  const comandaId = parseId(id, 'ID de comanda');
  const existing = await repo.findById(comandaId);
  if (!existing) throw new AppError('Comanda no encontrada', 404);

  await repo.remove(comandaId);
}

module.exports = {
  listComandas,
  getComandaById,
  createComanda,
  updateComandaStatus,
  removeComanda,
};
