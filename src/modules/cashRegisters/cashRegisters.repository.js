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


module.exports = {
  listRegisters,
  findRegisterByName,
  createRegister,
  updateRegister,
  deleteRegister,
  registerHasMovements,
};
