const { query } = require('../../repositories/baseRepository');

async function list(branchId, conn) {
  return query(
    `SELECT
      po.id,
      po.branch_id,
      po.supplier_id,
      po.status,
      po.notes,
      po.closed_reason,
      po.created_at,
      po.updated_at,
      po.closed_at,
      s.business_name AS supplier_name,
      COUNT(poi.id) AS item_count,
      COALESCE(SUM(poi.quantity_ordered), 0) AS total_quantity_ordered,
      COALESCE(SUM(poi.quantity_received), 0) AS total_quantity_received
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
    WHERE po.branch_id = ?
    GROUP BY
      po.id,
      po.branch_id,
      po.supplier_id,
      po.status,
      po.notes,
      po.closed_reason,
      po.created_at,
      po.updated_at,
      po.closed_at,
      s.business_name
    ORDER BY po.created_at DESC, po.id DESC`,
    [branchId],
    conn
  );
}

async function findById(id, conn, { forUpdate = false } = {}) {
  const rows = await query(
    `SELECT po.*, s.business_name AS supplier_name
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = ?
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id],
    conn
  );
  return rows[0] || null;
}

async function listItems(orderId, conn, { forUpdate = false } = {}) {
  return query(
    `SELECT
      poi.id,
      poi.purchase_order_id,
      poi.article_id,
      poi.quantity_ordered,
      poi.quantity_received,
      a.name AS article_name,
      a.sku AS article_sku,
      mu.code AS measurement_unit_code
    FROM purchase_order_items poi
    JOIN articles a ON a.id = poi.article_id
    LEFT JOIN measurement_units mu ON mu.id = a.measurement_unit_id
    WHERE poi.purchase_order_id = ?
    ${forUpdate ? 'FOR UPDATE' : ''}
    ORDER BY a.name ASC`,
    [orderId],
    conn
  );
}

async function insertOrder(data, conn) {
  const result = await query(
    `INSERT INTO purchase_orders (branch_id, supplier_id, status, notes)
     VALUES (?, ?, 'EMITIDA', ?)`,
    [data.branchId, data.supplierId, data.notes || null],
    conn
  );
  return result.insertId;
}

async function insertOrderItems(orderId, items, conn) {
  for (const item of items) {
    await query(
      `INSERT INTO purchase_order_items
        (purchase_order_id, article_id, quantity_ordered, quantity_received)
       VALUES (?, ?, ?, 0)`,
      [orderId, item.articleId, item.quantity],
      conn
    );
  }
}

async function insertReceipt(data, conn) {
  const result = await query(
    `INSERT INTO purchase_order_receipts
      (purchase_order_id, branch_id, user_id, notes)
     VALUES (?, ?, ?, ?)`,
    [data.purchaseOrderId, data.branchId, data.userId, data.notes || null],
    conn
  );
  return result.insertId;
}

async function insertReceiptItems(receiptId, items, conn) {
  for (const item of items) {
    await query(
      `INSERT INTO purchase_order_receipt_items
        (purchase_order_receipt_id, purchase_order_item_id, article_id, quantity_received)
       VALUES (?, ?, ?, ?)`,
      [receiptId, item.purchaseOrderItemId, item.articleId, item.quantityReceived],
      conn
    );
  }
}

async function updateOrderItemReceived(purchaseOrderItemId, deltaQty, conn) {
  await query(
    `UPDATE purchase_order_items
     SET quantity_received = quantity_received + ?,
         updated_at = NOW()
     WHERE id = ?`,
    [deltaQty, purchaseOrderItemId],
    conn
  );
}

async function updateOrderStatus(orderId, status, conn, extra = {}) {
  await query(
    `UPDATE purchase_orders
     SET status = ?,
         closed_reason = ?,
         closed_at = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [status, extra.closedReason || null, extra.closedAt || null, orderId],
    conn
  );
}

async function upsertStock(branchId, articleId, delta, conn) {
  await query(
    `INSERT INTO stock (branch_id, article_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + VALUES(quantity))`,
    [branchId, articleId, delta],
    conn
  );
}

async function insertStockMovement(data, conn) {
  await query(
    `INSERT INTO stock_movements (branch_id, article_id, user_id, type, quantity, reason)
     VALUES (?, ?, ?, 'INGRESO', ?, ?)`,
    [data.branchId, data.articleId, data.userId, data.quantity, data.reason || null],
    conn
  );
}

async function listReceipts(purchaseOrderId, conn) {
  return query(
    `SELECT
      r.id,
      r.purchase_order_id,
      r.branch_id,
      r.user_id,
      r.notes,
      r.created_at,
      u.name AS user_name,
      COALESCE(SUM(ri.quantity_received), 0) AS total_received
    FROM purchase_order_receipts r
    LEFT JOIN purchase_order_receipt_items ri ON ri.purchase_order_receipt_id = r.id
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.purchase_order_id = ?
    GROUP BY r.id, r.purchase_order_id, r.branch_id, r.user_id, r.notes, r.created_at, u.name
    ORDER BY r.created_at DESC, r.id DESC`,
    [purchaseOrderId],
    conn
  );
}

module.exports = {
  list,
  findById,
  listItems,
  insertOrder,
  insertOrderItems,
  insertReceipt,
  insertReceiptItems,
  updateOrderItemReceived,
  updateOrderStatus,
  upsertStock,
  insertStockMovement,
  listReceipts,
};
