const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function list() {
  return query('SELECT * FROM categories ORDER BY id DESC');
}

async function create(name) {
  const result = await query('INSERT INTO categories (name) VALUES (?)', [name]);
  return { id: result.insertId, name };
}

async function update(id, name) {
  await query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
}

async function remove(id) {
  await query('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { findById, list, create, update, remove };
