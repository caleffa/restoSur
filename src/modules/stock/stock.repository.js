const { query } = require('../../repositories/baseRepository');

async function findStock(branchId, productId, conn) {
  const rows = await query('SELECT * FROM stock WHERE branch_id = ? AND product_id = ? LIMIT 1', [branchId, productId], conn);
  return rows[0] || null;
}

async function upsertStock(branchId, productId, delta, conn) {
  await query(
    `INSERT INTO stock (branch_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + VALUES(quantity))`,
    [branchId, productId, delta],
    conn
  );
}

async function decreaseStock(branchId, productId, qty, conn) {
  await query(
    'UPDATE stock SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?',
    [qty, branchId, productId],
    conn
  );
}

async function insertMovement(data, conn) {
  await query(
    'INSERT INTO stock_movements (branch_id, product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [data.branchId, data.productId, data.userId, data.type, data.quantity, data.reason || null],
    conn
  );
}

async function listStock(branchId, onlyManaged = false) {
  const params = [branchId];
  let managedFilter = '';

  if (onlyManaged) {
    managedFilter = ' AND p.has_stock = 1';
  }

  return query(
    `SELECT
      s.id,
      s.branch_id,
      s.product_id,
      s.quantity,
      s.updated_at,
      p.name AS product_name,
      p.has_stock,
      p.active,
      c.name AS category_name
     FROM stock s
     JOIN products p ON p.id = s.product_id
     LEFT JOIN categories c ON c.id = p.category_id
    WHERE s.branch_id = ?${managedFilter}
    ORDER BY p.name ASC`,
    params
  );
}

async function listMovements(branchId, limit = 100) {
  return query(
    `SELECT
      sm.id,
      sm.branch_id,
      sm.product_id,
      sm.user_id,
      sm.type,
      sm.quantity,
      sm.reason,
      sm.created_at,
      p.name AS product_name,
      u.name AS user_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     LEFT JOIN users u ON u.id = sm.user_id
    WHERE sm.branch_id = ?
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT ?`,
    [branchId, limit]
  );
}

module.exports = { findStock, upsertStock, decreaseStock, insertMovement, listStock, listMovements };
