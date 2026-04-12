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
      'INSERT INTO tables_restaurant (branch_id, area_id, table_number, table_type, capacity, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.branchId, data.areaId, data.tableNumber, data.tableType, data.capacity, data.status || 'LIBRE']
    );
    return { id: result.insertId, ...data };
  },
  update: (id, data) =>
    query('UPDATE tables_restaurant SET area_id=?, table_number=?, table_type=?, capacity=?, status=? WHERE id=?', [
      data.areaId,
      data.tableNumber,
      data.tableType,
      data.capacity,
      data.status,
      id,
    ]),
  updateStatus: (id, status) => query('UPDATE tables_restaurant SET status=? WHERE id=?', [status, id]),
  remove: (id) => query('DELETE FROM tables_restaurant WHERE id=?', [id]),
  getAreaById: async (branchId, areaId) => {
    const rows = await query(
      `SELECT id, name, map_layout
       FROM dining_areas
       WHERE branch_id = ? AND id = ?
       LIMIT 1`,
      [branchId, areaId]
    );
    return rows[0] || null;
  },
  listByArea: (branchId, areaId) => query(
    `SELECT id, table_number, table_type, status, capacity, area_id, pos_x, pos_y
     FROM tables_restaurant
     WHERE branch_id = ? AND area_id = ?
     ORDER BY table_number`,
    [branchId, areaId]
  ),
  saveMapLayout: async (branchId, areaId, placements, mapLayout = null) => {
    await query(
      `UPDATE tables_restaurant
       SET pos_x = NULL, pos_y = NULL
       WHERE branch_id = ? AND area_id = ?`,
      [branchId, areaId]
    );

    for (const item of placements) {
      await query(
        `UPDATE tables_restaurant
         SET pos_x = ?, pos_y = ?
         WHERE id = ? AND branch_id = ? AND area_id = ?`,
        [item.x, item.y, item.tableId, branchId, areaId]
      );
    }

    await query(
      'UPDATE dining_areas SET map_layout = ? WHERE id = ? AND branch_id = ?',
      [mapLayout ? JSON.stringify(mapLayout) : null, areaId, branchId]
    );
  },
};
