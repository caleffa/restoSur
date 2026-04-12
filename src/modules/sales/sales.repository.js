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

async function findOpenSaleByTable(tableId, conn) {
  const rows = await query(
    'SELECT * FROM sales WHERE table_id = ? AND status = "ABIERTA" ORDER BY opened_at DESC LIMIT 1',
    [tableId],
    conn
  );
  return rows[0] || null;
}

async function listOpenSalesByBranch(branchId) {
  return query(
    `SELECT
      s.id,
      s.table_id AS tableId,
      tr.table_number AS tableName,
      (SELECT SUM(unit_price*quantity) AS total FROM sale_items WHERE sale_id = s.id) AS total,
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
    `SELECT si.*, p.name AS product_name, p.manages_stock AS has_stock
     FROM sale_items si
     JOIN articles p ON p.id = si.product_id
     WHERE si.sale_id = ?`,
    [saleId],
    conn
  );
}

async function findSaleItemById(itemId, conn) {
  const rows = await query(
    `SELECT
      si.*,
      s.status AS sale_status,
      s.table_id,
      s.branch_id
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.id = ?
    LIMIT 1`,
    [itemId],
    conn
  );
  return rows[0] || null;
}

async function updateSaleItemQuantity(itemId, quantity, conn) {
  await query('UPDATE sale_items SET quantity = ? WHERE id = ?', [quantity, itemId], conn);
}

async function deleteSaleItemById(itemId, conn) {
  await query('DELETE FROM sale_items WHERE id = ?', [itemId], conn);
}

async function updateSaleTotalsAndStatus(saleId, total, status, conn) {
  await query('UPDATE sales SET total = ?, status = ?, paid_at = NOW() WHERE id = ?', [total, status, saleId], conn);
}

async function markTableOccupied(tableId, status, conn) {
  await query('UPDATE tables_restaurant SET status = ? WHERE id = ?', [status, tableId], conn);
}

async function getSalesReportByBranch(branchId, filters = {}) {
  const conditions = ['s.branch_id = ?'];
  const values = [branchId];

  if (filters.from) {
    conditions.push('DATE(COALESCE(s.paid_at, s.opened_at)) >= ?');
    values.push(filters.from);
  }
  if (filters.to) {
    conditions.push('DATE(COALESCE(s.paid_at, s.opened_at)) <= ?');
    values.push(filters.to);
  }
  if (filters.status) {
    conditions.push('s.status = ?');
    values.push(filters.status);
  }
  if (filters.userId) {
    conditions.push('s.user_id = ?');
    values.push(filters.userId);
  }
  if (filters.tableId) {
    conditions.push('s.table_id = ?');
    values.push(filters.tableId);
  }
  if (filters.paymentMethod) {
    conditions.push('cm.payment_method = ?');
    values.push(filters.paymentMethod);
  }

  return query(
    `SELECT
      s.id,
      s.status,
      s.total,
      s.opened_at AS openedAt,
      s.paid_at AS paidAt,
      tr.table_number AS tableNumber,
      u.id AS userId,
      u.name AS userName,
      COALESCE(cm.payment_method, '-') AS paymentMethod,
      COUNT(si.id) AS itemsCount,
      COALESCE(SUM(si.quantity), 0) AS itemsQty
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    WHERE ${conditions.join(' AND ')}
    GROUP BY s.id, s.status, s.total, s.opened_at, s.paid_at, tr.table_number, u.id, u.name, cm.payment_method
    ORDER BY COALESCE(s.paid_at, s.opened_at) DESC`,
    values
  );
}

module.exports = {
  createSale,
  findSaleById,
  findOpenSaleByTable,
  listOpenSalesByBranch,
  addSaleItem,
  listItemsBySale,
  findSaleItemById,
  updateSaleItemQuantity,
  deleteSaleItemById,
  updateSaleTotalsAndStatus,
  markTableOccupied,
  getSalesReportByBranch,
};
