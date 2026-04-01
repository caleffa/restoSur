const { query } = require('../../repositories/baseRepository');

async function createInvoice(data) {
  const result = await query(
    `INSERT INTO invoices
      (sale_id, branch_id, invoice_type, authorization_type, authorization_code, cae_expiration, caea_id, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.saleId,
      data.branchId,
      data.invoiceType,
      data.authorizationType,
      data.authorizationCode,
      data.caeExpiration || null,
      data.caeaId || null,
      data.total,
    ]
  );
  return { id: result.insertId, ...data };
}

module.exports = { createInvoice };
