const { query } = require('../../repositories/baseRepository');

async function createInvoice(data) {
  const result = await query(
    `INSERT INTO invoices
      (sale_id, branch_id, invoice_type, authorization_type, authorization_code, cae_expiration, caea_id, total, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.saleId,
      data.branchId,
      data.invoiceType,
      data.authorizationType,
      data.authorizationCode,
      data.caeExpiration || null,
      data.caeaId || null,
      data.total,
      data.createdBy,
    ]
  );
  return { id: result.insertId, ...data };
}

async function findBySaleId(saleId) {
  const rows = await query('SELECT * FROM invoices WHERE sale_id = ? LIMIT 1', [saleId]);
  return rows[0] || null;
}

async function listByBranch(branchId) {
  return query(
    `SELECT i.*, s.table_id, t.table_number, u.name AS created_by_name
     FROM invoices i
     JOIN sales s ON s.id = i.sale_id
     LEFT JOIN tables_restaurant t ON t.id = s.table_id
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.branch_id = ?
     ORDER BY i.id DESC`,
    [branchId]
  );
}

module.exports = { createInvoice, findBySaleId, listByBranch };
