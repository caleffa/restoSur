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

async function getByPeriod(branchId, periodYear, periodHalf) {
  const rows = await query(
    'SELECT * FROM afip_caea WHERE branch_id = ? AND period_year = ? AND period_half = ? LIMIT 1',
    [branchId, periodYear, periodHalf]
  );
  return rows[0] || null;
}

async function getConfig(branchId) {
  const rows = await query('SELECT * FROM afip_configs WHERE branch_id = ? LIMIT 1', [branchId]);
  return rows[0] || null;
}

async function upsertConfig(data) {
  await query(
    `INSERT INTO afip_configs
      (branch_id, cuit, issuer_name, issuer_address, point_of_sale, environment, ws_mode, cert_path, key_path, service_tax_id, ticket_logo_path, cash_identification_threshold, non_cash_identification_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      cuit = VALUES(cuit),
      issuer_name = VALUES(issuer_name),
      issuer_address = VALUES(issuer_address),
      point_of_sale = VALUES(point_of_sale),
      environment = VALUES(environment),
      ws_mode = VALUES(ws_mode),
      cert_path = VALUES(cert_path),
      key_path = VALUES(key_path),
      service_tax_id = VALUES(service_tax_id),
      ticket_logo_path = VALUES(ticket_logo_path),
      cash_identification_threshold = VALUES(cash_identification_threshold),
      non_cash_identification_threshold = VALUES(non_cash_identification_threshold)`,
    [
      data.branchId,
      data.cuit,
      data.issuerName,
      data.issuerAddress,
      data.pointOfSale,
      data.environment,
      data.wsMode,
      data.certPath,
      data.keyPath,
      data.serviceTaxId,
      data.ticketLogoPath,
      data.cashIdentificationThreshold,
      data.nonCashIdentificationThreshold,
    ]
  );
  return getConfig(data.branchId);
}

module.exports = { listCaea, createCaea, getById, getByPeriod, getConfig, upsertConfig };
