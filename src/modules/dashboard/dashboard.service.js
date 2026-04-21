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

async function getWaiterDashboard(branchId, userId) {
  validateBranchId(branchId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Usuario inválido', 400);
  }

  const rows = await repo.getWaiterOpenTables(branchId, userId);
  const tables = rows.map((row) => ({
    saleId: Number(row.saleId),
    saleStatus: row.saleStatus,
    tableId: Number(row.tableId),
    tableNumber: row.tableNumber,
    tableStatus: row.tableStatus,
    openedAt: row.openedAt,
    total: Number(row.total || 0),
    canRequestBill: row.tableStatus !== 'CUENTA_PEDIDA',
    canCharge: false,
  }));

  return {
    profile: 'MOZO',
    permissions: {
      canCharge: false,
      canRequestBill: true,
    },
    metrics: {
      openTables: tables.length,
      pendingBillRequests: tables.filter((table) => table.tableStatus === 'CUENTA_PEDIDA').length,
    },
    tables,
  };
}

module.exports = { getSummary, getSalesByHour, getWaiterDashboard };
