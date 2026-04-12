const { query } = require('../../repositories/baseRepository');

async function findById(id, conn) {
  const rows = await query(
    `SELECT a.id, a.name, a.category_id, a.sale_price AS price, a.manages_stock AS has_stock, a.active, a.for_sale, a.is_product
     FROM articles a
     WHERE a.id = ?
     LIMIT 1`,
    [id],
    conn
  );
  return rows[0] || null;
}

async function listProducts() {
  return query(
    `SELECT a.id, a.name, a.category_id, c.name AS category_name,
            a.sale_price AS price, a.manages_stock AS has_stock, a.active, a.for_sale, a.is_product
     FROM articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.is_product = 1
     ORDER BY a.id DESC`
  );
}

async function listSaleProducts() {
  return query(
    `SELECT a.id, a.name, a.category_id, c.name AS category_name,
            a.sale_price AS price, a.manages_stock AS has_stock, a.active, a.for_sale, a.is_product
     FROM articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.for_sale = 1
       AND a.active = 1
     ORDER BY a.name ASC`
  );
}

async function createProduct(data) {
  const result = await query(
    `INSERT INTO articles
      (name, sku, article_type_id, measurement_unit_id, category_id, cost, sale_price, manages_stock, is_product, is_supply, for_sale, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [
      data.name,
      data.sku,
      data.articleTypeId,
      data.measurementUnitId,
      data.categoryId,
      data.cost,
      data.price,
      data.hasStock ? 1 : 0,
      data.forSale ? 1 : 0,
      data.active ? 1 : 0,
    ]
  );
  return { id: result.insertId, ...data };
}

async function updateProduct(id, data) {
  await query(
    `UPDATE articles
     SET name=?, category_id=?, sale_price=?, manages_stock=?, for_sale=?, active=?
     WHERE id=?`,
    [data.name, data.categoryId, data.price, data.hasStock ? 1 : 0, data.forSale ? 1 : 0, data.active ? 1 : 0, id]
  );
}

async function removeProduct(id) {
  await query('DELETE FROM articles WHERE id=?', [id]);
}

async function listTopProductsByBranch(branchId, limit = 10) {
  return query(
    `SELECT
      a.id,
      a.name,
      ROUND(COALESCE(SUM(si.quantity), 0), 3) AS quantity,
      ROUND(COALESCE(SUM(si.quantity * si.unit_price), 0), 2) AS total
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN articles a ON a.id = si.product_id
    WHERE s.branch_id = ?
      AND s.status = 'PAGADA'
      AND DATE(s.paid_at) = CURDATE()
    GROUP BY a.id, a.name
    ORDER BY quantity DESC, total DESC
    LIMIT ?`,
    [branchId, limit]
  );
}

module.exports = {
  findById,
  listProducts,
  listSaleProducts,
  createProduct,
  updateProduct,
  removeProduct,
  listTopProductsByBranch,
};
