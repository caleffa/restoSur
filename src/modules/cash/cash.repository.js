const { query } = require('../../repositories/baseRepository');

async function getOpenCashboxByBranch(branchId, conn) {
  const rows = await query('SELECT * FROM cashboxes WHERE branch_id=? AND status="ABIERTA" LIMIT 1', [branchId], conn);
  return rows[0] || null;
}

async function openCashbox({ branchId, userId, openingAmount }, conn) {
  const result = await query(
    'INSERT INTO cashboxes (branch_id, opened_by, opening_amount, status) VALUES (?, ?, ?, "ABIERTA")',
    [branchId, userId, openingAmount],
    conn
  );
  return { id: result.insertId };
}

async function closeCashbox({ id, userId, closingAmount }, conn) {
  await query(
    'UPDATE cashboxes SET status="CERRADA", closed_by=?, closing_amount=?, closed_at=NOW() WHERE id=?',
    [userId, closingAmount, id],
    conn
  );
}

async function insertMovement({ cashboxId, saleId, userId, type, amount, description }, conn) {
  await query(
    'INSERT INTO cash_movements (cashbox_id, sale_id, user_id, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
    [cashboxId, saleId || null, userId, type, amount, description || null],
    conn
  );
}

async function getMovements(cashboxId) {
  return query('SELECT * FROM cash_movements WHERE cashbox_id=? ORDER BY id DESC', [cashboxId]);
}

module.exports = { getOpenCashboxByBranch, openCashbox, closeCashbox, insertMovement, getMovements };
