const { query } = require('../../repositories/baseRepository');

async function createSale({ branchId, tableId, userId }, conn) {
  const result = await query(
    'INSERT INTO sales (branch_id, table_id, user_id, status) VALUES (?, ?, ?, "ABIERTA")',
    [branchId, tableId, userId],
    conn
  );
  return { id: result.insertId, branch_id: branchId, table_id: tableId, user_id: userId, status: 'ABIERTA' };
}

async function findSaleById(id, conn) {
  const rows = await query('SELECT * FROM sales WHERE id = ? LIMIT 1', [id], conn);
  return rows[0] || null;
}

async function listOpenSalesByBranch(branchId) {
  return query(
    `SELECT
      s.id,
      s.table_id AS tableId,
      tr.table_number AS tableName,
      s.total,
      s.status,
      s.opened_at AS openedAt
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    WHERE s.branch_id = ? AND s.status = 'ABIERTA'
    ORDER BY s.opened_at DESC`,
    [branchId]
  );
}

async function addSaleItem({ saleId, productId, quantity, unitPrice, notes }, conn) {
  const result = await query(
    'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)',
    [saleId, productId, quantity, unitPrice, notes || null],
    conn
  );
  return { id: result.insertId };
}

async function listItemsBySale(saleId, conn) {
  return query(
    `SELECT si.*, p.name AS product_name, p.has_stock
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?`,
    [saleId],
    conn
  );
}

async function updateSaleTotalsAndStatus(saleId, total, status, conn) {
  await query('UPDATE sales SET total = ?, status = ?, paid_at = NOW() WHERE id = ?', [total, status, saleId], conn);
}

async function markTableOccupied(tableId, status, conn) {
  await query('UPDATE tables_restaurant SET status = ? WHERE id = ?', [status, tableId], conn);
}

module.exports = {
  createSale,
  findSaleById,
  listOpenSalesByBranch,
  addSaleItem,
  listItemsBySale,
  updateSaleTotalsAndStatus,
  markTableOccupied,
};
