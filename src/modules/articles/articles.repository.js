const { query } = require('../../repositories/baseRepository');

const BASE_SELECT = `SELECT a.*, at.name AS article_type_name, mu.name AS unit_name, mu.code AS unit_code,
                     c.name AS category_name, sa.supplier_id, s.business_name AS supplier_name
                     FROM articles a
                     JOIN article_types at ON at.id = a.article_type_id
                     JOIN measurement_units mu ON mu.id = a.measurement_unit_id
                     LEFT JOIN categories c ON c.id = a.category_id
                     LEFT JOIN supplier_articles sa ON sa.article_id = a.id AND sa.is_default = 1
                     LEFT JOIN suppliers s ON s.id = sa.supplier_id`;

async function findById(id) {
  const rows = await query(
    `${BASE_SELECT}
     WHERE a.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findBySku(sku) {
  const rows = await query('SELECT * FROM articles WHERE sku = ? LIMIT 1', [sku]);
  return rows[0] || null;
}

async function findByBarcode(barcode) {
  const rows = await query('SELECT * FROM articles WHERE barcode = ? LIMIT 1', [barcode]);
  return rows[0] || null;
}

async function list(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.isProduct !== undefined) {
    conditions.push('a.is_product = ?');
    values.push(filters.isProduct ? 1 : 0);
  }

  if (filters.isSupply !== undefined) {
    conditions.push('a.is_supply = ?');
    values.push(filters.isSupply ? 1 : 0);
  }

  if (filters.forSale !== undefined) {
    conditions.push('a.for_sale = ?');
    values.push(filters.forSale ? 1 : 0);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return query(
    `${BASE_SELECT}
     ${whereClause}
     ORDER BY a.id DESC`,
    values
  );
}

async function create(data) {
  const result = await query(
    `INSERT INTO articles (
      name, sku, barcode, article_type_id, measurement_unit_id, category_id, cost, sale_price,
      manages_stock, is_product, is_supply, for_sale, active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.sku,
      data.barcode,
      data.articleTypeId,
      data.measurementUnitId,
      data.categoryId,
      data.cost,
      data.salePrice,
      data.managesStock ? 1 : 0,
      data.isProduct ? 1 : 0,
      data.isSupply ? 1 : 0,
      data.forSale ? 1 : 0,
      data.active ? 1 : 0,
    ]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query(
    `UPDATE articles
     SET name = ?, sku = ?, barcode = ?, article_type_id = ?, measurement_unit_id = ?, category_id = ?,
         cost = ?, sale_price = ?, manages_stock = ?, is_product = ?, is_supply = ?, for_sale = ?, active = ?
     WHERE id = ?`,
    [
      data.name,
      data.sku,
      data.barcode,
      data.articleTypeId,
      data.measurementUnitId,
      data.categoryId,
      data.cost,
      data.salePrice,
      data.managesStock ? 1 : 0,
      data.isProduct ? 1 : 0,
      data.isSupply ? 1 : 0,
      data.forSale ? 1 : 0,
      data.active ? 1 : 0,
      id,
    ]
  );
}

async function remove(id) {
  await query('DELETE FROM articles WHERE id = ?', [id]);
}

async function setPreferredSupplier(articleId, supplierId = null) {
  await query('UPDATE supplier_articles SET is_default = 0 WHERE article_id = ?', [articleId]);
  if (!supplierId) return;

  await query(
    `INSERT INTO supplier_articles (supplier_id, article_id, is_default)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE is_default = VALUES(is_default)`,
    [supplierId, articleId]
  );
}

module.exports = { findById, findBySku, findByBarcode, list, create, update, remove, setPreferredSupplier };
