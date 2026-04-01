const { pool } = require('../../config/database');
const repo = require('./stock.repository');

async function list(branchId) {
  return repo.listStock(branchId);
}

async function movement(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sign = data.type === 'EGRESO' ? -1 : 1;
    await repo.upsertStock(data.branchId, data.productId, sign * Number(data.quantity), conn);
    await repo.insertMovement({ ...data, userId: user.id }, conn);
    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { list, movement };
