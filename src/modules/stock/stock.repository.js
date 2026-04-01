const { query } = require('../../repositories/baseRepository');

async function findStock(branchId, productId, conn) {
  const rows = await query('SELECT * FROM stock WHERE branch_id = ? AND product_id = ? LIMIT 1', [branchId, productId], conn);
  return rows[0] || null;
}

async function upsertStock(branchId, productId, delta, conn) {
  await query(
    `INSERT INTO stock (branch_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [branchId, productId, delta],
    conn
  );
}

async function decreaseStock(branchId, productId, qty, conn) {
  await query('UPDATE stock SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?', [qty, branchId, productId], conn);
}

async function insertMovement(data, conn) {
  await query(
    'INSERT INTO stock_movements (branch_id, product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [data.branchId, data.productId, data.userId, data.type, data.quantity, data.reason || null],
    conn
  );
}

async function listStock(branchId) {
  return query(
    `SELECT s.*, p.name AS product_name
       FROM stock s
       JOIN products p ON p.id = s.product_id
      WHERE s.branch_id = ?`,
    [branchId]
  );
}

module.exports = { findStock, upsertStock, decreaseStock, insertMovement, listStock };
