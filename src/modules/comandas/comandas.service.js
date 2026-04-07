const repo = require('./comandas.repository');
const salesRepo = require('../sales/sales.repository');
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
    branchId: row.branch_id,
    tableId: row.table_id,
    status: row.status,
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

async function createComanda({ saleId, status }) {
  const normalizedSaleId = parseId(saleId, 'saleId');
  const sale = await salesRepo.findSaleById(normalizedSaleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);

  const created = await repo.create({ saleId: normalizedSaleId, branchId: sale.branch_id });

  if (status) {
    await repo.updateStatus(created.id, normalizeStatus(status));
  }

  const row = await repo.findById(created.id);
  return mapComanda(row);
}

async function updateComandaStatus(id, status) {
  const comandaId = parseId(id, 'ID de comanda');
  const existing = await repo.findById(comandaId);
  if (!existing) throw new AppError('Comanda no encontrada', 404);

  await repo.updateStatus(comandaId, normalizeStatus(status));
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
