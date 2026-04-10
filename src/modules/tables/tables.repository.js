const { query } = require('../../repositories/baseRepository');

module.exports = {
  list: (branchId, areaId = null) => query(
    `SELECT t.*, da.name AS area_name
     FROM tables_restaurant t
     LEFT JOIN dining_areas da ON da.id = t.area_id
     WHERE t.branch_id = ?
       AND (? IS NULL OR t.area_id = ?)
     ORDER BY t.table_number`,
    [branchId, areaId, areaId]
  ),
  create: async (data) => {
    const result = await query(
      'INSERT INTO tables_restaurant (branch_id, area_id, table_number, capacity, status) VALUES (?, ?, ?, ?, ?)',
      [data.branchId, data.areaId, data.tableNumber, data.capacity, data.status || 'LIBRE']
    );
    return { id: result.insertId, ...data };
  },
  update: (id, data) =>
    query('UPDATE tables_restaurant SET area_id=?, table_number=?, capacity=?, status=? WHERE id=?', [
      data.areaId,
      data.tableNumber,
      data.capacity,
      data.status,
      id,
    ]),
  updateStatus: (id, status) => query('UPDATE tables_restaurant SET status=? WHERE id=?', [status, id]),
  remove: (id) => query('DELETE FROM tables_restaurant WHERE id=?', [id]),
};
