const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query(
    `SELECT c.*, vt.name AS vat_type_name
     FROM customers c
     LEFT JOIN vat_types vt ON vt.id = c.vat_type_id
     WHERE c.id=? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByDocument(branchId, documentNumber, excludeId = null) {
  if (!documentNumber) return null;

  const params = [branchId, documentNumber];
  let sql = 'SELECT id FROM customers WHERE branch_id=? AND document_number=?';
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
    `SELECT c.*, vt.name AS vat_type_name
     FROM customers c
     LEFT JOIN vat_types vt ON vt.id = c.vat_type_id
     WHERE c.branch_id=?
     ORDER BY c.last_name ASC, c.first_name ASC`,
    [branchId]
  );
}

async function create(data) {
  const result = await query(
    `INSERT INTO customers
      (branch_id, first_name, last_name, document_type, document_number, cuit, vat_type_id, email, phone, address, city, province, postal_code, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.branchId,
      data.firstName,
      data.lastName,
      data.documentType,
      data.documentNumber,
      data.cuit,
      data.vatTypeId,
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
    `UPDATE customers
     SET first_name=?, last_name=?, document_type=?, document_number=?, cuit=?, vat_type_id=?, email=?, phone=?, address=?, city=?, province=?, postal_code=?, active=?, updated_at=NOW()
     WHERE id=?`,
    [
      data.firstName,
      data.lastName,
      data.documentType,
      data.documentNumber,
      data.cuit,
      data.vatTypeId,
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
  await query('DELETE FROM customers WHERE id=?', [id]);
}

module.exports = { findById, findByDocument, list, create, update, remove };
