const { query } = require('../../repositories/baseRepository');

async function getBranchById(branchId) {
  const rows = await query('SELECT id, name FROM branches WHERE id = ? LIMIT 1', [branchId]);
  return rows[0] || null;
}

async function getSalesOverview(branchId, from, to) {
  const rows = await query(
    `SELECT
      COUNT(*) AS paidSales,
      COALESCE(SUM(s.total), 0) AS grossSales,
      COALESCE(SUM(CASE WHEN s.status = 'CANCELADA' THEN s.total ELSE 0 END), 0) AS returnsAmount
     FROM sales s
     WHERE s.branch_id = ?
       AND DATE(COALESCE(s.paid_at, s.opened_at)) BETWEEN ? AND ?
       AND s.status = 'PAGADA'`,
    [branchId, from, to]
  );

  return rows[0] || { paidSales: 0, grossSales: 0, returnsAmount: 0 };
}

async function getSalesByPaymentMethod(branchId, from, to) {
  return query(
    `SELECT
      COALESCE(pm.code, 'OTROS') AS channel,
      COALESCE(SUM(cm.amount), 0) AS total
     FROM cash_movements cm
     LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
     WHERE cm.branch_id = ?
       AND cm.type = 'VENTA'
       AND DATE(cm.created_at) BETWEEN ? AND ?
     GROUP BY COALESCE(pm.code, 'OTROS')
     ORDER BY total DESC`,
    [branchId, from, to]
  );
}

async function getSalesByCategory(branchId, from, to) {
  return query(
    `SELECT
      COALESCE(c.name, 'Sin categoría') AS category,
      COALESCE(SUM(si.quantity * si.unit_price), 0) AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN articles a ON a.id = si.article_id
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE s.branch_id = ?
       AND s.status = 'PAGADA'
       AND DATE(COALESCE(s.paid_at, s.opened_at)) BETWEEN ? AND ?
     GROUP BY COALESCE(c.name, 'Sin categoría')
     ORDER BY revenue DESC`,
    [branchId, from, to]
  );
}

async function getSalesBySchedule(branchId, from, to) {
  const rows = await query(
    `SELECT
      CASE
        WHEN HOUR(COALESCE(s.paid_at, s.opened_at)) BETWEEN 12 AND 16 THEN 'ALMUERZO'
        WHEN HOUR(COALESCE(s.paid_at, s.opened_at)) BETWEEN 17 AND 19 THEN 'HAPPY_HOUR'
        WHEN HOUR(COALESCE(s.paid_at, s.opened_at)) BETWEEN 20 AND 23 THEN 'CENA'
        ELSE 'OTROS'
      END AS schedule,
      COALESCE(SUM(s.total), 0) AS total
    FROM sales s
    WHERE s.branch_id = ?
      AND s.status = 'PAGADA'
      AND DATE(COALESCE(s.paid_at, s.opened_at)) BETWEEN ? AND ?
    GROUP BY schedule
    ORDER BY total DESC`,
    [branchId, from, to]
  );

  return rows;
}

async function getCogsTotals(branchId, from, to) {
  const recipeRows = await query(
    `SELECT
      COALESCE(SUM(si.quantity * ri.quantity * art.cost), 0) AS total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN recipes r ON r.product_id = si.article_id AND r.active = 1
     JOIN recipe_items ri ON ri.recipe_id = r.id
     JOIN articles art ON art.id = ri.article_id
     WHERE s.branch_id = ?
       AND s.status = 'PAGADA'
       AND DATE(COALESCE(s.paid_at, s.opened_at)) BETWEEN ? AND ?`,
    [branchId, from, to]
  );

  const directRows = await query(
    `SELECT
      COALESCE(SUM(si.quantity * a.cost), 0) AS total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN articles a ON a.id = si.article_id
     WHERE s.branch_id = ?
       AND s.status = 'PAGADA'
       AND DATE(COALESCE(s.paid_at, s.opened_at)) BETWEEN ? AND ?
       AND NOT EXISTS (
         SELECT 1
         FROM recipes r
         WHERE r.product_id = si.article_id AND r.active = 1
       )`,
    [branchId, from, to]
  );

  return {
    theoretical: Number(recipeRows[0]?.total || 0) + Number(directRows[0]?.total || 0),
  };
}

async function getWasteCost(branchId, from, to) {
  const rows = await query(
    `SELECT COALESCE(SUM(ABS(sm.quantity) * a.cost), 0) AS total
     FROM stock_movements sm
     JOIN articles a ON a.id = sm.article_id
     WHERE sm.branch_id = ?
       AND sm.type = 'AJUSTE'
       AND DATE(sm.created_at) BETWEEN ? AND ?`,
    [branchId, from, to]
  );

  return Number(rows[0]?.total || 0);
}

async function getOperatingExpenses(branchId, from, to) {
  return query(
    `SELECT reason, COALESCE(SUM(amount), 0) AS total
     FROM cash_movements
     WHERE branch_id = ?
       AND type = 'EGRESO'
       AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY reason`,
    [branchId, from, to]
  );
}

async function getOtherMovements(branchId, from, to) {
  const rows = await query(
    `SELECT
      type,
      reason,
      COALESCE(SUM(amount), 0) AS total
     FROM cash_movements
     WHERE branch_id = ?
       AND type IN ('INGRESO', 'EGRESO')
       AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY type, reason`,
    [branchId, from, to]
  );
  return rows;
}

module.exports = {
  getBranchById,
  getSalesOverview,
  getSalesByPaymentMethod,
  getSalesByCategory,
  getSalesBySchedule,
  getCogsTotals,
  getWasteCost,
  getOperatingExpenses,
  getOtherMovements,
};
