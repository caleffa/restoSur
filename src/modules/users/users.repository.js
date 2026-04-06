const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query(
    'SELECT id, branch_id AS branchId, name, email, role, active, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const rows = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function list() {
  return query(
    'SELECT id, branch_id AS branchId, name, email, role, active, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY id DESC'
  );
}

async function create(data) {
  const result = await query(
    'INSERT INTO users (branch_id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?)',
    [data.branchId, data.name, data.email, data.passwordHash, data.role, data.active]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  await query('UPDATE users SET branch_id=?, name=?, email=?, role=?, active=? WHERE id = ?', [
    data.branchId,
    data.name,
    data.email,
    data.role,
    data.active,
    id,
  ]);
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

async function remove(id) {
  await query('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = { findById, findByEmail, list, create, update, updatePassword, remove };
