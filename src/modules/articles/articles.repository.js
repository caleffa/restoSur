const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query(
    `SELECT a.*, at.name AS article_type_name, mu.name AS unit_name, mu.code AS unit_code
     FROM articles a
     JOIN article_types at ON at.id = a.article_type_id
     JOIN measurement_units mu ON mu.id = a.measurement_unit_id
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

async function list() {
  return query(
    `SELECT a.*, at.name AS article_type_name, mu.name AS unit_name, mu.code AS unit_code
     FROM articles a
     JOIN article_types at ON at.id = a.article_type_id
     JOIN measurement_units mu ON mu.id = a.measurement_unit_id
     ORDER BY a.id DESC`
  );
}

async function create(data) {
  const result = await query(
    `INSERT INTO articles (name, sku, barcode, article_type_id, measurement_unit_id, cost, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.sku, data.barcode, data.articleTypeId, data.measurementUnitId, data.cost, data.active ? 1 : 0]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query(
    `UPDATE articles
     SET name = ?, sku = ?, barcode = ?, article_type_id = ?, measurement_unit_id = ?, cost = ?, active = ?
     WHERE id = ?`,
    [data.name, data.sku, data.barcode, data.articleTypeId, data.measurementUnitId, data.cost, data.active ? 1 : 0, id]
  );
}

async function remove(id) {
  await query('DELETE FROM articles WHERE id = ?', [id]);
}

module.exports = { findById, findBySku, findByBarcode, list, create, update, remove };
