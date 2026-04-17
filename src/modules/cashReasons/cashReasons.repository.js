const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM cash_movement_reasons WHERE id=? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByDescription(description, type, excludeId = null) {
  const params = [description, type];
  let sql = 'SELECT * FROM cash_movement_reasons WHERE LOWER(description)=LOWER(?) AND type=?';
  if (excludeId) {
    sql += ' AND id<>?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function list(type = null) {
  if (type) {
    return query('SELECT * FROM cash_movement_reasons WHERE type=? ORDER BY description ASC', [type]);
  }
  return query('SELECT * FROM cash_movement_reasons ORDER BY type ASC, description ASC');
}

async function create(data) {
  const result = await query(
    'INSERT INTO cash_movement_reasons (description, type, active) VALUES (?, ?, ?)',
    [data.description, data.type, data.active ? 1 : 0]
  );
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query(
    'UPDATE cash_movement_reasons SET description=?, type=?, active=?, updated_at=NOW() WHERE id=?',
    [data.description, data.type, data.active ? 1 : 0, id]
  );
}

async function remove(id) {
  await query('DELETE FROM cash_movement_reasons WHERE id=?', [id]);
}

module.exports = { findById, findByDescription, list, create, update, remove };
