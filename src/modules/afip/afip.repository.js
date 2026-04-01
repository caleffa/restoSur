const { query } = require('../../repositories/baseRepository');

async function listCaea(branchId) {
  return query('SELECT * FROM afip_caea WHERE branch_id = ? ORDER BY id DESC', [branchId]);
}

async function createCaea(data) {
  const result = await query(
    'INSERT INTO afip_caea (branch_id, caea_code, period_year, period_half, due_date) VALUES (?, ?, ?, ?, ?)',
    [data.branchId, data.caeaCode, data.periodYear, data.periodHalf, data.dueDate]
  );
  return { id: result.insertId, ...data };
}

async function getById(id) {
  const rows = await query('SELECT * FROM afip_caea WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

module.exports = { listCaea, createCaea, getById };
