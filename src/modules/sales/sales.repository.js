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
  const rows = await query(
    `SELECT
      s.*,
      tr.status AS table_status,
      u.name AS waiter_name
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
    LIMIT 1`,
    [id],
    conn
  );
  return rows[0] || null;
}

async function findOpenSaleByTable(tableId, conn) {
  const rows = await query(
    `SELECT
      s.*,
      tr.status AS table_status,
      u.name AS waiter_name
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    JOIN users u ON u.id = s.user_id
    WHERE s.table_id = ? AND s.status = "ABIERTA"
    ORDER BY s.opened_at DESC
    LIMIT 1`,
    [tableId],
    conn
  );
  return rows[0] || null;
}

async function listWaitersByBranch(branchId) {
  return query(
    `SELECT id, name, role
     FROM users
     WHERE branch_id = ? AND role = 'MOZO' AND active = 1
     ORDER BY name ASC`,
    [branchId]
  );
}

async function findWaiterById(branchId, waiterId, conn) {
  const rows = await query(
    `SELECT id, name
     FROM users
     WHERE branch_id = ? AND id = ? AND role = 'MOZO' AND active = 1
     LIMIT 1`,
    [branchId, waiterId],
    conn
  );
  return rows[0] || null;
}

async function updateSaleWaiter(saleId, waiterId, conn) {
  await query('UPDATE sales SET user_id = ? WHERE id = ?', [waiterId, saleId], conn);
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

async function addSaleItem({ saleId, articleId, quantity, unitPrice, notes }, conn) {
  const result = await query(
    'INSERT INTO sale_items (sale_id, article_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)',
    [saleId, articleId, quantity, unitPrice, notes || null],
    conn
  );
  return { id: result.insertId };
}

async function listItemsBySale(saleId, conn) {
  return query(
    `SELECT
      si.id,
      si.sale_id,
      si.article_id,
      si.quantity,
      si.unit_price,
      si.notes,
      si.created_at,
      p.name AS article_name,
      p.manages_stock AS has_stock,
      p.is_product,
      p.category_id,
      CASE WHEN p.is_product = 1 THEN si.kitchen_status ELSE 'SIN_COMANDA' END AS kitchen_status
     FROM sale_items si
     JOIN articles p ON p.id = si.article_id
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

async function deleteItemsBySaleId(saleId, conn) {
  await query('DELETE FROM sale_items WHERE sale_id = ?', [saleId], conn);
}

async function deleteKitchenOrdersBySaleId(saleId, conn) {
  await query('DELETE FROM kitchen_orders WHERE sale_id = ?', [saleId], conn);
}

async function cancelSaleById(saleId, conn) {
  await query('UPDATE sales SET status = "CANCELADA", total = 0, paid_at = NULL WHERE id = ?', [saleId], conn);
}

async function updateSaleTotalsAndStatus(saleId, total, status, conn) {
  await query('UPDATE sales SET total = ?, status = ?, paid_at = NOW() WHERE id = ?', [total, status, saleId], conn);
}

async function updateSalePaymentMethod(saleId, paymentMethodId, conn) {
  await query('UPDATE sales SET payment_method_id = ? WHERE id = ?', [paymentMethodId, saleId], conn);
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
    conditions.push('pm.code = ?');
    values.push(filters.paymentMethod);
  }
  if (filters.search) {
    conditions.push('(CAST(s.id AS CHAR) LIKE ? OR u.name LIKE ? OR tr.table_number LIKE ?)');
    const like = `%${filters.search}%`;
    values.push(like, like, like);
  }

  const baseFrom = `
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
  `;

  const groupedSelect = `
    SELECT
      s.id,
      s.status,
      s.total,
      s.opened_at AS openedAt,
      s.paid_at AS paidAt,
      tr.table_number AS tableNumber,
      u.id AS userId,
      u.name AS userName,
      COALESCE(pm.code, '-') AS paymentMethod,
      COUNT(si.id) AS itemsCount,
      COALESCE(SUM(si.quantity), 0) AS itemsQty
    ${baseFrom}
    GROUP BY s.id, s.status, s.total, s.opened_at, s.paid_at, tr.table_number, u.id, u.name, pm.code
  `;

  const countRows = await query(
    `SELECT COUNT(*) AS totalRecords FROM (${groupedSelect}) report_rows`,
    values
  );

  const sortColumnMap = {
    id: 'id',
    date: 'COALESCE(paidAt, openedAt)',
    table: 'tableNumber',
    user: 'userName',
    items: 'itemsQty',
    paymentMethod: 'paymentMethod',
    status: 'status',
    total: 'total',
  };
  const sortBy = sortColumnMap[filters.sortBy] || 'COALESCE(paidAt, openedAt)';
  const sortDirection = String(filters.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const pageSize = Number(filters.pageSize || 50);
  const page = Number(filters.page || 1);
  const offset = (page - 1) * pageSize;

  const rows = await query(
    `SELECT
      report_rows.*
    FROM (${groupedSelect}) report_rows
    ORDER BY ${sortBy} ${sortDirection}
    LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return {
    rows,
    totalRecords: Number(countRows[0]?.totalRecords || 0),
  };
}

async function getSalesTotalsByBranch(branchId, filters = {}) {
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
    conditions.push('pm.code = ?');
    values.push(filters.paymentMethod);
  }
  if (filters.search) {
    conditions.push('(CAST(s.id AS CHAR) LIKE ? OR u.name LIKE ? OR tr.table_number LIKE ?)');
    const like = `%${filters.search}%`;
    values.push(like, like, like);
  }

  const baseFrom = `
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
  `;

  const rows = await query(
    `SELECT
      s.id,
      s.status,
      s.total,
      COALESCE(SUM(si.quantity), 0) AS itemsQty
    ${baseFrom}
    GROUP BY s.id, s.status, s.total`,
    values
  );

  return rows;
}

async function getVatSalesBookByBranch(branchId, filters = {}) {
  const conditions = ['i.branch_id = ?'];
  const values = [branchId];

  if (filters.from) {
    conditions.push('DATE(i.created_at) >= ?');
    values.push(filters.from);
  }
  if (filters.to) {
    conditions.push('DATE(i.created_at) <= ?');
    values.push(filters.to);
  }
  if (filters.invoiceType) {
    conditions.push('i.invoice_type = ?');
    values.push(filters.invoiceType);
  }

  return query(
    `SELECT
      i.id,
      i.created_at AS issueDate,
      i.invoice_type AS invoiceType,
      i.authorization_type AS authorizationType,
      i.authorization_code AS authorizationCode,
      i.voucher_number AS voucherNumber,
      i.total,
      u.name AS customer,
      COALESCE(pm.code, '-') AS paymentMethod,
      CASE
        WHEN i.invoice_type = 'C' THEN ROUND(i.total, 2)
        ELSE ROUND(i.total / 1.21, 2)
      END AS netAmount,
      CASE
        WHEN i.invoice_type = 'C' THEN 0
        ELSE ROUND(i.total - (i.total / 1.21), 2)
      END AS vat21
    FROM invoices i
    JOIN sales s ON s.id = i.sale_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.created_at DESC`,
    values
  );
}

function buildSalesReportConditions(branchId, filters = {}) {
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
  if (filters.paymentMethod) {
    conditions.push('pm.code = ?');
    values.push(filters.paymentMethod);
  }
  if (filters.waiterId) {
    conditions.push('s.user_id = ?');
    values.push(filters.waiterId);
  }

  return { conditions, values };
}

async function getTopDishesByBranch(branchId, filters = {}) {
  const { conditions, values } = buildSalesReportConditions(branchId, filters);
  return query(
    `SELECT
      a.id,
      a.name,
      SUM(si.quantity) AS totalQty,
      ROUND(SUM(si.quantity * si.unit_price), 2) AS totalAmount,
      COUNT(DISTINCT s.id) AS tickets
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN articles a ON a.id = si.article_id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
      AND a.is_product = 1
    GROUP BY a.id, a.name
    ORDER BY totalQty DESC, totalAmount DESC
    LIMIT ?`,
    [...values, Number(filters.limit || 20)]
  );
}

async function getTopArticlesByBranch(branchId, filters = {}) {
  const { conditions, values } = buildSalesReportConditions(branchId, filters);
  return query(
    `SELECT
      a.id,
      a.name,
      SUM(si.quantity) AS totalQty,
      ROUND(SUM(si.quantity * si.unit_price), 2) AS totalAmount,
      COUNT(DISTINCT s.id) AS tickets
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN articles a ON a.id = si.article_id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY a.id, a.name
    ORDER BY totalQty DESC, totalAmount DESC
    LIMIT ?`,
    [...values, Number(filters.limit || 20)]
  );
}

async function getTopWaitersByBranch(branchId, filters = {}) {
  const { conditions, values } = buildSalesReportConditions(branchId, filters);
  return query(
    `SELECT
      u.id,
      u.name,
      COUNT(DISTINCT s.id) AS tickets,
      ROUND(SUM(COALESCE(s.total, 0)), 2) AS totalAmount,
      COALESCE(SUM(si.quantity), 0) AS totalQty
    FROM sales s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN cash_movements cm ON cm.sale_id = s.id AND cm.type = 'VENTA'
    LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
    WHERE ${conditions.join(' AND ')}
      AND u.role = 'MOZO'
    GROUP BY u.id, u.name
    ORDER BY totalAmount DESC, tickets DESC
    LIMIT ?`,
    [...values, Number(filters.limit || 20)]
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
  deleteItemsBySaleId,
  deleteKitchenOrdersBySaleId,
  cancelSaleById,
  updateSalePaymentMethod,
  updateSaleTotalsAndStatus,
  markTableOccupied,
  getSalesReportByBranch,
  getSalesTotalsByBranch,
  getVatSalesBookByBranch,
  getTopDishesByBranch,
  getTopArticlesByBranch,
  getTopWaitersByBranch,
  listWaitersByBranch,
  findWaiterById,
  updateSaleWaiter,
};
