const { query } = require('../../repositories/baseRepository');

function getSummaryByBranch(branchId) {
  return query(
    `SELECT
      COALESCE(SUM(CASE WHEN DATE(s.paid_at) = CURDATE() THEN s.total ELSE 0 END), 0) AS sales,
      COALESCE(SUM(CASE WHEN DATE(s.paid_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS tickets,
      COALESCE(AVG(CASE WHEN DATE(s.paid_at) = CURDATE() THEN s.total ELSE NULL END), 0) AS avgTicket
    FROM sales s
    WHERE s.branch_id = ? AND s.status = 'PAGADA'`,
    [branchId]
  );
}

function countOccupiedTables(branchId) {
  return query(
    `SELECT COUNT(*) AS occupiedTables
     FROM tables_restaurant
     WHERE branch_id = ? AND status IN ('OCUPADA', 'CUENTA')`,
    [branchId]
  );
}

function getSalesByHour(branchId) {
  return query(
    `SELECT
      DATE_FORMAT(s.paid_at, '%H:00') AS hour,
      ROUND(SUM(s.total), 2) AS total
    FROM sales s
    WHERE s.branch_id = ?
      AND s.status = 'PAGADA'
      AND DATE(s.paid_at) = CURDATE()
    GROUP BY DATE_FORMAT(s.paid_at, '%H:00')
    ORDER BY hour ASC`,
    [branchId]
  );
}

function getWaiterOpenTables(branchId, userId) {
  return query(
    `SELECT
      s.id AS saleId,
      s.status AS saleStatus,
      s.opened_at AS openedAt,
      tr.id AS tableId,
      tr.table_number AS tableNumber,
      tr.status AS tableStatus,
      COALESCE(SUM(si.quantity * si.unit_price), 0) AS total
    FROM sales s
    JOIN tables_restaurant tr ON tr.id = s.table_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.branch_id = ?
      AND s.user_id = ?
      AND s.status = 'ABIERTA'
    GROUP BY s.id, s.status, s.opened_at, tr.id, tr.table_number, tr.status
    ORDER BY s.opened_at DESC`,
    [branchId, userId]
  );
}

module.exports = { getSummaryByBranch, countOccupiedTables, getSalesByHour, getWaiterOpenTables };
