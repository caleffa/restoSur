const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const repo = require('./stock.repository');

function normalizeBranchId(branchId) {
  const id = Number(branchId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Sucursal inválida', 400);
  return id;
}

function normalizeMovementPayload(data, user) {
  const branchId = normalizeBranchId(data.branchId || user.branchId);
  const productId = Number(data.productId);
  const quantity = Number(data.quantity);
  const type = String(data.type || '').toUpperCase();
  const reason = data.reason ? String(data.reason).trim() : null;

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new AppError('Producto inválido', 400);
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError('Cantidad inválida', 400);
  }
  if (!['INGRESO', 'EGRESO', 'AJUSTE'].includes(type)) {
    throw new AppError('Tipo de movimiento inválido', 400);
  }

  return {
    branchId,
    productId,
    quantity,
    type,
    reason,
    userId: user.id,
  };
}

async function list(branchId, onlyManaged = false) {
  const normalizedBranchId = normalizeBranchId(branchId);
  return repo.listStock(normalizedBranchId, onlyManaged);
}

async function listMovements(branchId, limit = 100) {
  const normalizedBranchId = normalizeBranchId(branchId);
  const normalizedLimit = Number(limit);

  if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0 || normalizedLimit > 500) {
    throw new AppError('Límite inválido. Debe estar entre 1 y 500', 400);
  }

  return repo.listMovements(normalizedBranchId, normalizedLimit);
}

async function movement(data, user) {
  const payload = normalizeMovementPayload(data, user);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const current = await repo.findStock(payload.branchId, payload.productId, conn);
    const currentQty = Number(current?.quantity || 0);
    let delta = payload.quantity;

    if (payload.type === 'EGRESO') {
      if (currentQty < payload.quantity) {
        throw new AppError('Stock insuficiente para registrar el egreso', 400);
      }
      delta = -payload.quantity;
    }

    if (payload.type === 'AJUSTE') {
      delta = payload.quantity - currentQty;
    }

    await repo.upsertStock(payload.branchId, payload.productId, delta, conn);
    await repo.insertMovement(payload, conn);

    const updated = await repo.findStock(payload.branchId, payload.productId, conn);

    await conn.commit();
    return {
      productId: payload.productId,
      branchId: payload.branchId,
      previousQuantity: currentQty,
      quantity: Number(updated?.quantity || 0),
      movement: payload,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { list, movement, listMovements };
