const { query } = require('../../repositories/baseRepository');

async function listByBranch(branchId) {
  return query('SELECT * FROM dining_areas WHERE branch_id = ? ORDER BY name', [branchId]);
}

async function findById(id) {
  const rows = await query('SELECT * FROM dining_areas WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create(data) {
  const result = await query('INSERT INTO dining_areas (branch_id, name) VALUES (?, ?)', [data.branchId, data.name]);
  return { id: result.insertId, ...data };
}

async function update(id, data) {
  await query('UPDATE dining_areas SET name = ? WHERE id = ?', [data.name, id]);
}

async function remove(id) {
  await query('DELETE FROM dining_areas WHERE id = ?', [id]);
}

module.exports = {
  listByBranch,
  findById,
  create,
  update,
  remove,
};
