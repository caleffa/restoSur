const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM payment_methods WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByCode(code, onlyActive = false) {
  const params = [String(code || '').trim().toUpperCase()];
  let sql = 'SELECT * FROM payment_methods WHERE code = ?';
  if (onlyActive) {
    sql += ' AND active = 1';
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function list({ onlyActive = false } = {}) {
  let sql = 'SELECT * FROM payment_methods';
  if (onlyActive) {
    sql += ' WHERE active = 1';
  }
  sql += ' ORDER BY display_order ASC, name ASC';
  return query(sql);
}

async function create(data) {
  const result = await query(
    'INSERT INTO payment_methods (name, code, active, display_order) VALUES (?, ?, ?, ?)',
    [data.name, data.code, data.active ? 1 : 0, data.displayOrder]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query(
    'UPDATE payment_methods SET name = ?, code = ?, active = ?, display_order = ?, updated_at = NOW() WHERE id = ?',
    [data.name, data.code, data.active ? 1 : 0, data.displayOrder, id]
  );
}

async function remove(id) {
  await query('DELETE FROM payment_methods WHERE id = ?', [id]);
}

async function findByNameOrCode({ name, code, excludeId = null }) {
  const params = [name, code];
  let sql = 'SELECT * FROM payment_methods WHERE (LOWER(name) = LOWER(?) OR code = ?)';
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';

  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = {
  findById,
  findByCode,
  list,
  create,
  update,
  remove,
  findByNameOrCode,
};
