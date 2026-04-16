const { query } = require('../../repositories/baseRepository');

async function findById(id) {
  const rows = await query(
    `SELECT k.*, kt.name AS kitchen_type_name
     FROM kitchens k
     JOIN kitchen_types kt ON kt.id = k.kitchen_type_id
     WHERE k.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByNameAndBranch(name, branchId) {
  const rows = await query('SELECT * FROM kitchens WHERE name = ? AND branch_id = ? LIMIT 1', [name, branchId]);
  return rows[0] || null;
}

async function list({ branchId, kitchenTypeId, active }) {
  const filters = [];
  const params = [];

  if (branchId) {
    filters.push('k.branch_id = ?');
    params.push(branchId);
  }

  if (kitchenTypeId) {
    filters.push('k.kitchen_type_id = ?');
    params.push(kitchenTypeId);
  }

  if (active !== null && active !== undefined) {
    filters.push('k.active = ?');
    params.push(active ? 1 : 0);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  return query(
    `SELECT k.*, kt.name AS kitchen_type_name
     FROM kitchens k
     JOIN kitchen_types kt ON kt.id = k.kitchen_type_id
     ${whereClause}
     ORDER BY k.name ASC`,
    params
  );
}

async function create({ branchId, kitchenTypeId, name, description, active }) {
  const result = await query(
    'INSERT INTO kitchens (branch_id, kitchen_type_id, name, description, active) VALUES (?, ?, ?, ?, ?)',
    [branchId, kitchenTypeId, name, description, active ? 1 : 0]
  );

  return { id: result.insertId };
}

async function update(id, { kitchenTypeId, name, description, active }) {
  await query(
    `UPDATE kitchens
     SET kitchen_type_id = ?,
         name = ?,
         description = ?,
         active = ?
     WHERE id = ?`,
    [kitchenTypeId, name, description, active ? 1 : 0, id]
  );
}

async function remove(id) {
  await query('DELETE FROM kitchens WHERE id = ?', [id]);
}

module.exports = {
  findById,
  findByNameAndBranch,
  list,
  create,
  update,
  remove,
};
