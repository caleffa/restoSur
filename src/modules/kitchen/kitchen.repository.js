const { query } = require('../../repositories/baseRepository');

async function createKitchenOrder({ saleId, branchId }, conn) {
  const result = await query('INSERT INTO kitchen_orders (sale_id, branch_id, status) VALUES (?, ?, "PENDIENTE")', [saleId, branchId], conn);
  return { id: result.insertId };
}

async function updateSaleItemsAsSent(saleId, conn) {
  await query(
    `UPDATE sale_items si
     JOIN articles a ON a.id = si.article_id
     SET si.kitchen_status = "ENVIADO"
     WHERE si.sale_id = ?
       AND si.kitchen_status = "PENDIENTE"
       AND a.is_product = 1`,
    [saleId],
    conn
  );
}

async function listPending(branchId) {
  return query(
    `SELECT
      ko.id,
      ko.sale_id,
      ko.branch_id,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
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
      ko.branch_id,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
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
     JOIN kitchen_orders ko ON ko.sale_id = si.sale_id
     JOIN articles a ON a.id = si.article_id
     SET si.kitchen_status = ?
     WHERE ko.id = ?
       AND si.kitchen_status <> "LISTO"
       AND a.is_product = 1`,
    [saleItemsStatus, orderId],
    conn
  );
}

async function listByTable(tableId, branchId) {
  return query(
    `SELECT
      ko.id,
      ko.sale_id,
      ko.branch_id,
      ko.status,
      ko.sent_at,
      ko.updated_at,
      s.table_id
    FROM kitchen_orders ko
    JOIN sales s ON s.id = ko.sale_id
    WHERE s.table_id = ? AND ko.branch_id = ?
    ORDER BY ko.id DESC`,
    [tableId, branchId]
  );
}

module.exports = {
  createKitchenOrder,
  updateSaleItemsAsSent,
  listPending,
  updateKitchenStatus,
  syncSaleItemsKitchenStatusByOrderId,
  findById,
  listByTable,
};
