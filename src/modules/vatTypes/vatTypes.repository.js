const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM vat_types WHERE id=? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByName(name, excludeId = null) {
  const params = [name];
  let sql = 'SELECT * FROM vat_types WHERE LOWER(name)=LOWER(?)';
  if (excludeId) {
    sql += ' AND id<>?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function list() {
  return query('SELECT * FROM vat_types ORDER BY name ASC');
}

async function create(data) {
  const result = await query(
    'INSERT INTO vat_types (name, code, description, active) VALUES (?, ?, ?, ?)',
    [data.name, data.code, data.description, data.active ? 1 : 0]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query(
    'UPDATE vat_types SET name=?, code=?, description=?, active=?, updated_at=NOW() WHERE id=?',
    [data.name, data.code, data.description, data.active ? 1 : 0, id]
  );
}

async function remove(id) {
  await query('DELETE FROM vat_types WHERE id=?', [id]);
}

module.exports = { findById, findByName, list, create, update, remove };
