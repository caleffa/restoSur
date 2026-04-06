const AppError = require('../../utils/appError');
const repo = require('./dashboard.repository');

function validateBranchId(branchId) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }
}

async function getSummary(branchId) {
  validateBranchId(branchId);

  const [summaryRow] = await repo.getSummaryByBranch(branchId);
  const [occupiedRow] = await repo.countOccupiedTables(branchId);

  return {
    sales: Number(summaryRow?.sales || 0),
    tickets: Number(summaryRow?.tickets || 0),
    avgTicket: Number(summaryRow?.avgTicket || 0),
    occupiedTables: Number(occupiedRow?.occupiedTables || 0),
  };
}

async function getSalesByHour(branchId) {
  validateBranchId(branchId);

  const rows = await repo.getSalesByHour(branchId);
  return rows.map((row) => ({
    hour: row.hour,
    total: Number(row.total || 0),
  }));
}

module.exports = { getSummary, getSalesByHour };
