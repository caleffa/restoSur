const { query } = require('../../repositories/baseRepository');

async function findById(id, conn) {
  const rows = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [id], conn);
  return rows[0] || null;
}

async function listProducts() {
  return query('SELECT * FROM products ORDER BY id DESC');
}

async function createProduct(data) {
  const result = await query(
    'INSERT INTO products (category_id, name, price, has_stock, active) VALUES (?, ?, ?, ?, ?)',
    [data.categoryId, data.name, data.price, data.hasStock ? 1 : 0, data.active ? 1 : 0]
  );
  return { id: result.insertId, ...data };
}

async function updateProduct(id, data) {
  await query('UPDATE products SET category_id=?, name=?, price=?, has_stock=?, active=? WHERE id=?', [
    data.categoryId,
    data.name,
    data.price,
    data.hasStock ? 1 : 0,
    data.active ? 1 : 0,
    id,
  ]);
}

async function removeProduct(id) {
  await query('DELETE FROM products WHERE id=?', [id]);
}

async function listTopProductsByBranch(branchId, limit = 10) {
  return query(
    `SELECT
      p.id,
      p.name,
      ROUND(COALESCE(SUM(si.quantity), 0), 3) AS quantity,
      ROUND(COALESCE(SUM(si.quantity * si.unit_price), 0), 2) AS total
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN products p ON p.id = si.product_id
    WHERE s.branch_id = ?
      AND s.status = 'PAGADA'
      AND DATE(s.paid_at) = CURDATE()
    GROUP BY p.id, p.name
    ORDER BY quantity DESC, total DESC
    LIMIT ?`,
    [branchId, limit]
  );
}

module.exports = {
  findById,
  listProducts,
  createProduct,
  updateProduct,
  removeProduct,
  listTopProductsByBranch,
};
