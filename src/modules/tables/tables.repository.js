const { query } = require('../../repositories/baseRepository');

module.exports = {
  list: (branchId) => query('SELECT * FROM tables_restaurant WHERE branch_id = ? ORDER BY table_number', [branchId]),
  create: async (data) => {
    const result = await query('INSERT INTO tables_restaurant (branch_id, table_number, status) VALUES (?, ?, ?)', [
      data.branchId,
      data.tableNumber,
      data.status || 'LIBRE',
    ]);
    return { id: result.insertId, ...data };
  },
  update: (id, data) =>
    query('UPDATE tables_restaurant SET table_number=?, status=? WHERE id=?', [data.tableNumber, data.status, id]),
  remove: (id) => query('DELETE FROM tables_restaurant WHERE id=?', [id]),
};
