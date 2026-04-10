const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM article_types WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findByName(name) {
  const rows = await query('SELECT * FROM article_types WHERE name = ? LIMIT 1', [name]);
  return rows[0] || null;
}

async function list() {
  return query('SELECT * FROM article_types ORDER BY name ASC');
}

async function create(name, description) {
  const result = await query('INSERT INTO article_types (name, description) VALUES (?, ?)', [name, description]);
  return { id: result.insertId, name, description };
}

async function update(id, name, description) {
  await query('UPDATE article_types SET name = ?, description = ? WHERE id = ?', [name, description, id]);
}

async function remove(id) {
  await query('DELETE FROM article_types WHERE id = ?', [id]);
}

module.exports = { findById, findByName, list, create, update, remove };
