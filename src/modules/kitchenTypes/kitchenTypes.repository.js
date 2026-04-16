const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM kitchen_types WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByName(name) {
  const rows = await query('SELECT * FROM kitchen_types WHERE name = ? LIMIT 1', [name]);
  return rows[0] || null;
}

async function list() {
  return query('SELECT * FROM kitchen_types ORDER BY name ASC');
}

async function create({ name, description, active }) {
  const result = await query(
    'INSERT INTO kitchen_types (name, description, active) VALUES (?, ?, ?)',
    [name, description, active ? 1 : 0]
  );
  return { id: result.insertId, name, description, active: active ? 1 : 0 };
}

async function update(id, { name, description, active }) {
  await query(
    'UPDATE kitchen_types SET name = ?, description = ?, active = ? WHERE id = ?',
    [name, description, active ? 1 : 0, id]
  );
}

async function remove(id) {
  await query('DELETE FROM kitchen_types WHERE id = ?', [id]);
}

module.exports = {
  findById,
  findByName,
  list,
  create,
  update,
  remove,
};
