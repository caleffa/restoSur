const { query } = require('../../repositories/baseRepository');

async function list({ branchId, status, tableId }) {
  const filters = [];
  const params = [];

  if (branchId) {
    filters.push('ko.branch_id = ?');
    params.push(branchId);
  }

  if (status) {
    filters.push('ko.status = ?');
    params.push(status);
  }

  if (tableId) {
    filters.push('s.table_id = ?');
    params.push(tableId);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

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
    ${where}
    ORDER BY ko.id DESC`,
    params
  );
}

async function findById(id) {
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
    [id]
  );

  return rows[0] || null;
}

async function create({ saleId, saleItemId, branchId, quantity }) {
  const result = await query(
    'INSERT INTO kitchen_orders (sale_id, sale_item_id, branch_id, quantity, status) VALUES (?, ?, ?, ?, "PENDIENTE")',
    [saleId, saleItemId, branchId, quantity]
  );
  return { id: result.insertId };
}

async function updateStatus(id, status) {
  await query('UPDATE kitchen_orders SET status = ? WHERE id = ?', [status, id]);
}

async function remove(id) {
  await query('DELETE FROM kitchen_orders WHERE id = ?', [id]);
}

module.exports = {
  list,
  findById,
  create,
  updateStatus,
  remove,
};
