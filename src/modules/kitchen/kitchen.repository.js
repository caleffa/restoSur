const { query } = require('../../repositories/baseRepository');

async function createKitchenOrder({ saleId, saleItemId, branchId, quantity }, conn) {
  const result = await query(
    'INSERT INTO kitchen_orders (sale_id, sale_item_id, branch_id, quantity, status) VALUES (?, ?, ?, ?, "PENDIENTE")',
    [saleId, saleItemId, branchId, quantity],
    conn
  );
  return { id: result.insertId };
}

async function updateSaleItemAsSent(saleItemId, conn) {
  await query(
    `UPDATE sale_items si
     JOIN articles a ON a.id = si.article_id
     SET si.kitchen_status = "ENVIADO"
     WHERE si.id = ?
       AND si.kitchen_status = "PENDIENTE"
       AND a.is_product = 1`,
    [saleItemId],
    conn
  );
}

async function listPending(branchId) {
  return query(
    `SELECT
      ko.id,
      ko.sale_id,
      ko.sale_item_id,
      ko.branch_id,
      ko.quantity,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id,
      a.name AS article_name
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
    JOIN sale_items si ON si.id = ko.sale_item_id
    JOIN articles a ON a.id = si.article_id
    WHERE ko.branch_id = ?
    ORDER BY ko.id DESC`,
    [branchId]
  );
}

async function updateKitchenStatus(id, status, conn) {
  await query('UPDATE kitchen_orders SET status=? WHERE id=?', [status, id], conn);
}

async function findById(id, conn) {
  const rows = await query(
    `SELECT
      ko.id,
      ko.sale_id,
      ko.sale_item_id,
      ko.branch_id,
      ko.quantity,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id,
      a.name AS article_name
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
    JOIN sale_items si ON si.id = ko.sale_item_id
    JOIN articles a ON a.id = si.article_id
    WHERE ko.id = ?
    LIMIT 1`,
    [id],
    conn
  );
  return rows[0] || null;
}

async function syncSaleItemsKitchenStatusByOrderId(orderId, kitchenOrderStatus, conn) {
  const statusMap = {
    PENDIENTE: 'ENVIADO',
    PREPARANDO: 'PREPARANDO',
    LISTO: 'LISTO',
  };
  const saleItemsStatus = statusMap[kitchenOrderStatus];
  if (!saleItemsStatus) return;

  await query(
    `UPDATE sale_items si
     JOIN kitchen_orders ko ON ko.sale_item_id = si.id
     SET si.kitchen_status = ?
     WHERE ko.id = ?
       AND si.kitchen_status <> "LISTO"`,
    [saleItemsStatus, orderId],
    conn
  );
}

async function listByTable(tableId, branchId) {
  return query(
    `SELECT
      ko.id,
      ko.sale_id,
      ko.sale_item_id,
      ko.branch_id,
      ko.quantity,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id,
      a.name AS article_name
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
    JOIN sale_items si ON si.id = ko.sale_item_id
    JOIN articles a ON a.id = si.article_id
    WHERE s.table_id = ? AND ko.branch_id = ?
    ORDER BY ko.id DESC`,
    [tableId, branchId]
  );
}

module.exports = {
  createKitchenOrder,
  updateSaleItemAsSent,
  listPending,
  updateKitchenStatus,
  syncSaleItemsKitchenStatusByOrderId,
  findById,
  listByTable,
};
