const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const repo = require('./cash.repository');

async function open(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const current = await repo.getOpenCashboxByBranch(data.branchId, conn);
    if (current) throw new AppError('Solo se permite una caja abierta por sucursal', 400);
    const created = await repo.openCashbox({ branchId: data.branchId, userId: user.id, openingAmount: data.openingAmount }, conn);
    await conn.commit();
    return created;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function close(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const current = await repo.getOpenCashboxByBranch(data.branchId, conn);
    if (!current) throw new AppError('No hay caja abierta', 400);
    await repo.closeCashbox({ id: current.id, userId: user.id, closingAmount: data.closingAmount }, conn);
    await conn.commit();
    return { id: current.id, status: 'CERRADA' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  open,
  close,
  current: (branchId) => repo.getOpenCashboxByBranch(branchId),
  movements: (id) => repo.getMovements(id),
};
