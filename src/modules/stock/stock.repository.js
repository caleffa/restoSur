const { query } = require('../../repositories/baseRepository');

async function findStock(branchId, articleId, conn) {
  const rows = await query('SELECT * FROM stock WHERE branch_id = ? AND article_id = ? LIMIT 1', [branchId, articleId], conn);
  return rows[0] || null;
}

async function upsertStock(branchId, articleId, delta, conn) {
  await query(
    `INSERT INTO stock (branch_id, article_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + VALUES(quantity))`,
    [branchId, articleId, delta],
    conn
  );
}

async function decreaseStock(branchId, articleId, qty, conn) {
  await query(
    'UPDATE stock SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND article_id = ?',
    [qty, branchId, articleId],
    conn
  );
}

async function insertMovement(data, conn) {
  await query(
    'INSERT INTO stock_movements (branch_id, article_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?, ?)',
    [data.branchId, data.articleId, data.userId, data.type, data.quantity, data.reason || null],
    conn
  );
}

async function listStock(branchId) {
  return query(
    `SELECT
      COALESCE(s.id, 0) AS id,
      ? AS branch_id,
      a.id AS article_id,
      COALESCE(s.quantity, 0) AS quantity,
      s.updated_at,
      a.name AS article_name,
      a.sku AS article_sku,
      a.stock_minimum,
      a.manages_stock,
      a.active,
      mu.code AS measurement_unit_code,
      GROUP_CONCAT(DISTINCT rp.name ORDER BY rp.name SEPARATOR ', ') AS related_products
     FROM articles a
     LEFT JOIN stock s ON s.article_id = a.id AND s.branch_id = ?
     LEFT JOIN measurement_units mu ON mu.id = a.measurement_unit_id
     LEFT JOIN recipe_items ri ON ri.article_id = a.id
     LEFT JOIN recipes r ON r.id = ri.recipe_id AND r.active = 1
     LEFT JOIN articles rp ON rp.id = r.product_id AND rp.active = 1
    WHERE a.active = 1
    GROUP BY
      s.id,
      a.id,
      s.quantity,
      s.updated_at,
      a.name,
      a.sku,
      a.active,
      mu.code
    ORDER BY a.name ASC`,
    [branchId, branchId]
  );
}

async function listMovements(branchId, limit = 100) {
  return query(
    `SELECT
      sm.id,
      sm.branch_id,
      sm.article_id,
      sm.user_id,
      sm.type,
      sm.quantity,
      sm.reason,
      sm.created_at,
      a.name AS article_name,
      u.name AS user_name,
      GROUP_CONCAT(DISTINCT rp.name ORDER BY rp.name SEPARATOR ', ') AS related_products
     FROM stock_movements sm
     JOIN articles a ON a.id = sm.article_id
     LEFT JOIN users u ON u.id = sm.user_id
     LEFT JOIN recipe_items ri ON ri.article_id = a.id
     LEFT JOIN recipes r ON r.id = ri.recipe_id AND r.active = 1
     LEFT JOIN articles rp ON rp.id = r.product_id AND rp.active = 1
    WHERE sm.branch_id = ?
    GROUP BY
      sm.id,
      sm.branch_id,
      sm.article_id,
      sm.user_id,
      sm.type,
      sm.quantity,
      sm.reason,
      sm.created_at,
      a.name,
      u.name
    ORDER BY sm.created_at DESC, sm.id DESC
    LIMIT ?`,
    [branchId, limit]
  );
}

module.exports = { findStock, upsertStock, decreaseStock, insertMovement, listStock, listMovements };
