const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query(
    `SELECT s.*, vt.name AS vat_type_name
     FROM suppliers s
     LEFT JOIN vat_types vt ON vt.id = s.vat_type_id
     WHERE s.id=? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCuit(branchId, cuit, excludeId = null) {
  if (!cuit) return null;
  const params = [branchId, cuit];
  let sql = 'SELECT id FROM suppliers WHERE branch_id=? AND cuit=?';
  if (excludeId) {
    sql += ' AND id<>?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function list(branchId) {
  return query(
    `SELECT s.*, vt.name AS vat_type_name,
            GROUP_CONCAT(sa.article_id ORDER BY sa.article_id) AS article_ids
     FROM suppliers s
     LEFT JOIN vat_types vt ON vt.id = s.vat_type_id
     LEFT JOIN supplier_articles sa ON sa.supplier_id = s.id
     WHERE s.branch_id=?
     GROUP BY s.id
     ORDER BY s.business_name ASC`,
    [branchId]
  );
}

async function create(data) {
  const result = await query(
    `INSERT INTO suppliers
      (branch_id, business_name, fantasy_name, cuit, vat_type_id, gross_income_number, email, phone, address, city, province, postal_code, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.branchId,
      data.businessName,
      data.fantasyName,
      data.cuit,
      data.vatTypeId,
      data.grossIncomeNumber,
      data.email,
      data.phone,
      data.address,
      data.city,
      data.province,
      data.postalCode,
      data.active ? 1 : 0,
    ]
  );
  return { id: result.insertId };
}

async function update(id, data) {
  await query(
    `UPDATE suppliers
     SET business_name=?, fantasy_name=?, cuit=?, vat_type_id=?, gross_income_number=?, email=?, phone=?, address=?, city=?, province=?, postal_code=?, active=?, updated_at=NOW()
     WHERE id=?`,
    [
      data.businessName,
      data.fantasyName,
      data.cuit,
      data.vatTypeId,
      data.grossIncomeNumber,
      data.email,
      data.phone,
      data.address,
      data.city,
      data.province,
      data.postalCode,
      data.active ? 1 : 0,
      id,
    ]
  );
}

async function remove(id) {
  await query('DELETE FROM suppliers WHERE id=?', [id]);
}

async function syncArticles(supplierId, articleIds = []) {
  if (!articleIds.length) {
    await query('DELETE FROM supplier_articles WHERE supplier_id = ?', [supplierId]);
    return;
  }

  const placeholders = articleIds.map(() => '?').join(',');
  await query(
    `DELETE FROM supplier_articles
     WHERE supplier_id = ?
       AND article_id NOT IN (${placeholders})`,
    [supplierId, ...articleIds]
  );

  await Promise.all(
    articleIds.map((articleId) => query(
      `INSERT INTO supplier_articles (supplier_id, article_id, is_default)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE supplier_id = supplier_id`,
      [supplierId, articleId]
    ))
  );
}

module.exports = { findById, findByCuit, list, create, update, remove, syncArticles };
