const { query } = require('../../repositories/baseRepository');

function mapBoolean(value) {
  return value ? 1 : 0;
}

async function listRegisters(branchId) {
  return query(
    `SELECT id, branch_id, name, active, created_at
     FROM cash_registers
     WHERE branch_id=?
     ORDER BY id DESC`,
    [branchId]
  );
}

async function findRegisterByName(branchId, name, excludeId = null, conn = null) {
  const params = [branchId, name.trim()];
  let sql = 'SELECT id FROM cash_registers WHERE branch_id=? AND LOWER(name)=LOWER(?)';
  if (excludeId) {
    sql += ' AND id<>?';
    params.push(excludeId);
  }
  const rows = await query(sql, params, conn);
  return rows[0] || null;
}

async function createRegister({ branchId, name, active }, conn = null) {
  const result = await query(
    'INSERT INTO cash_registers (branch_id, name, active) VALUES (?, ?, ?)',
    [branchId, name.trim(), mapBoolean(active)],
    conn
  );
  return { id: result.insertId };
}

async function updateRegister(id, { name, active }, conn = null) {
  await query(
    'UPDATE cash_registers SET name=?, active=?, updated_at=NOW() WHERE id=?',
    [name.trim(), mapBoolean(active), id],
    conn
  );
}

async function deleteRegister(id, conn = null) {
  await query('DELETE FROM cash_registers WHERE id=?', [id], conn);
}

async function registerHasMovements(registerId, conn = null) {
  const rows = await query('SELECT id FROM cash_movements WHERE register_id=? LIMIT 1', [registerId], conn);
  return Boolean(rows[0]);
}

async function getOpenShiftByBranch(branchId, conn = null) {
  const rows = await query(
    `SELECT s.*, r.name AS register_name, u.name AS user_name
     FROM cash_shifts s
     INNER JOIN cash_registers r ON r.id = s.register_id
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.branch_id=? AND s.status="ABIERTA"
     ORDER BY s.id DESC
     LIMIT 1`,
    [branchId],
    conn
  );
  return rows[0] || null;
}

async function getOpenShiftByUser(userId, conn = null) {
  const rows = await query('SELECT id FROM cash_shifts WHERE user_id=? AND status="ABIERTA" LIMIT 1', [userId], conn);
  return rows[0] || null;
}

async function createShift(data, conn) {
  const result = await query(
    `INSERT INTO cash_shifts
      (register_id, branch_id, user_id, status, opened_at, opening_balance, expected_balance, opening_note)
     VALUES (?, ?, ?, "ABIERTA", NOW(), ?, ?, ?)`,
    [data.registerId, data.branchId, data.userId, data.openingBalance, data.openingBalance, data.openingNote || null],
    conn
  );
  return { id: result.insertId };
}

async function updateShiftClose(data, conn) {
  await query(
    `UPDATE cash_shifts
     SET status="CERRADA", closed_at=NOW(), real_balance=?, expected_balance=?, difference=?, closing_note=?
     WHERE id=?`,
    [data.realBalance, data.expectedBalance, data.difference, data.closingNote || null, data.shiftId],
    conn
  );
}

async function insertMovement(data, conn = null) {
  const result = await query(
    `INSERT INTO cash_movements
      (shift_id, register_id, branch_id, user_id, type, payment_method, sale_id, reference, amount, reason, reason_id, observation, affects_balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.shiftId,
      data.registerId,
      data.branchId,
      data.userId,
      data.type,
      data.paymentMethod || null,
      data.saleId || null,
      data.reference || null,
      data.amount,
      data.reason || null,
      data.reasonId || null,
      data.observation || null,
      mapBoolean(data.affectsBalance),
    ],
    conn
  );
  return { id: result.insertId };
}


async function findCashReasonById(id) {
  const rows = await query('SELECT * FROM cash_movement_reasons WHERE id=? LIMIT 1', [id]);
  return rows[0] || null;
}

async function getShiftMovements(shiftId) {
  return query(
    `SELECT m.*, u.name AS user_name, r.description AS reason_description
     FROM cash_movements m
     INNER JOIN users u ON u.id = m.user_id
     LEFT JOIN cash_movement_reasons r ON r.id = m.reason_id
     WHERE m.shift_id=?
     ORDER BY m.id DESC`,
    [shiftId]
  );
}

async function getMovements(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.branchId) {
    conditions.push('m.branch_id=?');
    params.push(filters.branchId);
  }
  if (filters.registerId) {
    conditions.push('m.register_id=?');
    params.push(filters.registerId);
  }
  if (filters.userId) {
    conditions.push('m.user_id=?');
    params.push(filters.userId);
  }
  if (filters.from) {
    conditions.push('DATE(m.created_at) >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('DATE(m.created_at) <= ?');
    params.push(filters.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return query(
    `SELECT m.*, r.name AS register_name, u.name AS user_name, cmr.description AS reason_description
     FROM cash_movements m
     INNER JOIN cash_registers r ON r.id = m.register_id
     INNER JOIN users u ON u.id = m.user_id
     LEFT JOIN cash_movement_reasons cmr ON cmr.id = m.reason_id
     ${where}
     ORDER BY m.id DESC`,
    params
  );
}

async function getShiftById(id) {
  const rows = await query(
    `SELECT s.*, r.name AS register_name, u.name AS user_name
     FROM cash_shifts s
     INNER JOIN cash_registers r ON r.id = s.register_id
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.id=? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getShifts(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.branchId) {
    conditions.push('s.branch_id=?');
    params.push(filters.branchId);
  }
  if (filters.registerId) {
    conditions.push('s.register_id=?');
    params.push(filters.registerId);
  }
  if (filters.userId) {
    conditions.push('s.user_id=?');
    params.push(filters.userId);
  }
  if (filters.from) {
    conditions.push('DATE(s.opened_at) >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push('DATE(COALESCE(s.closed_at, s.opened_at)) <= ?');
    params.push(filters.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return query(
    `SELECT s.*, r.name AS register_name, u.name AS user_name
     FROM cash_shifts s
     INNER JOIN cash_registers r ON r.id = s.register_id
     INNER JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.id DESC`,
    params
  );
}

module.exports = {
  listRegisters,
  findRegisterByName,
  createRegister,
  updateRegister,
  deleteRegister,
  registerHasMovements,
  getOpenShiftByBranch,
  getOpenShiftByUser,
  createShift,
  updateShiftClose,
  insertMovement,
  findCashReasonById,
  getShiftMovements,
  getMovements,
  getShiftById,
  getShifts,
};
