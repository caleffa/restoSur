const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM measurement_units WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByCode(code) {
  const rows = await query('SELECT * FROM measurement_units WHERE code = ? LIMIT 1', [code]);
  return rows[0] || null;
}

async function list() {
  return query('SELECT * FROM measurement_units ORDER BY name ASC');
}

async function create(data) {
  const result = await query('INSERT INTO measurement_units (name, code, description) VALUES (?, ?, ?)', [
    data.name,
    data.code,
    data.description,
  ]);
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query('UPDATE measurement_units SET name = ?, code = ?, description = ? WHERE id = ?', [
    data.name,
    data.code,
    data.description,
    id,
  ]);
}

async function remove(id) {
  await query('DELETE FROM measurement_units WHERE id = ?', [id]);
}

module.exports = { findById, findByCode, list, create, update, remove };
