const AppError = require('../../utils/appError');
const repo = require('./profits.repository');

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function getRangeByPeriod(period = 'MENSUAL', totalFrom = null) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const toIso = (date) => date.toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month, day));
  let start = new Date(Date.UTC(year, month, 1));

  switch (String(period || '').toUpperCase()) {
    case 'DIARIO':
      start = new Date(Date.UTC(year, month, day));
      break;
    case 'SEMANAL': {
      const weekday = end.getUTCDay() || 7;
      start = new Date(end);
      start.setUTCDate(end.getUTCDate() - (weekday - 1));
      break;
    }
    case 'TRIMESTRAL': {
      const quarterStart = Math.floor(month / 3) * 3;
      start = new Date(Date.UTC(year, quarterStart, 1));
      break;
    }
    case 'ANUAL':
      start = new Date(Date.UTC(year, 0, 1));
      break;
    case 'TOTAL':
      start = totalFrom ? new Date(`${totalFrom}T00:00:00.000Z`) : new Date(Date.UTC(year, 0, 1));
      break;
    case 'MENSUAL':
    default:
      start = new Date(Date.UTC(year, month, 1));
      break;
  }

  return {
    from: toIso(start),
    to: toIso(end),
  };
}

function categorizeOperatingExpenses(rows = []) {
  const categories = {
    personal: 0,
    alquiler: 0,
    servicios: 0,
    marketing: 0,
    mantenimiento: 0,
    administrativos: 0,
    delivery: 0,
    otrosOperativos: 0,
  };

  rows.forEach((entry) => {
    const reason = String(entry.reason || '').toLowerCase();
    const total = Number(entry.total || 0);

    if (reason.includes('sueldo') || reason.includes('propina') || reason.includes('personal') || reason.includes('mano de obra')) {
      categories.personal += total;
    } else if (reason.includes('alquiler') || reason.includes('renta')) {
      categories.alquiler += total;
    } else if (reason.includes('luz') || reason.includes('agua') || reason.includes('gas') || reason.includes('internet') || reason.includes('telefono')) {
      categories.servicios += total;
    } else if (reason.includes('marketing') || reason.includes('promo') || reason.includes('publicidad') || reason.includes('redes')) {
      categories.marketing += total;
    } else if (reason.includes('mantenimiento') || reason.includes('limpieza') || reason.includes('repar')) {
      categories.mantenimiento += total;
    } else if (reason.includes('software') || reason.includes('contab') || reason.includes('papeler')) {
      categories.administrativos += total;
    } else if (reason.includes('delivery') || reason.includes('rappi') || reason.includes('uber') || reason.includes('comision app') || reason.includes('empaque')) {
      categories.delivery += total;
    } else {
      categories.otrosOperativos += total;
    }
  });

  return categories;
}

function splitOtherMovements(rows = []) {
  const result = {
    incomes: 0,
    expenses: 0,
    incomesDetail: [],
    expensesDetail: [],
  };

  rows.forEach((entry) => {
    const reason = String(entry.reason || 'Sin detalle');
    const total = Number(entry.total || 0);
    if (entry.type === 'INGRESO') {
      result.incomes += total;
      result.incomesDetail.push({ reason, total });
    }
    if (entry.type === 'EGRESO' && /(interes|multa|depreci|extraordinario)/i.test(reason)) {
      result.expenses += total;
      result.expensesDetail.push({ reason, total });
    }
  });

  return result;
}

function pct(value, base) {
  if (!base) return 0;
  return (Number(value || 0) / Number(base || 0)) * 100;
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildComparison(current, previous) {
  const diffAmount = round(current - previous);
  const diffPercent = previous === 0 ? (current > 0 ? 100 : 0) : round((diffAmount / previous) * 100);
  return { diffAmount, diffPercent };
}

async function buildMetricsForRange(branchId, from, to) {
  const [
    salesOverview,
    salesByChannel,
    salesByCategory,
    salesBySchedule,
    salesByCostCategory,
    topProducts,
    cogs,
    wasteCost,
    operatingRows,
    otherMovements,
  ] = await Promise.all([
    repo.getSalesOverview(branchId, from, to),
    repo.getSalesByPaymentMethod(branchId, from, to),
    repo.getSalesByCategory(branchId, from, to),
    repo.getSalesBySchedule(branchId, from, to),
    repo.getSalesByCostCategory(branchId, from, to),
    repo.getTopProducts(branchId, from, to),
    repo.getCogsTotals(branchId, from, to),
    repo.getWasteCost(branchId, from, to),
    repo.getOperatingExpenses(branchId, from, to),
    repo.getOtherMovements(branchId, from, to),
  ]);

  const grossSales = Number(salesOverview.grossSales || 0);
  const discounts = 0;
  const returns = Number(salesOverview.returnsAmount || 0);
  const netSales = round(grossSales - discounts - returns);

  const costByType = salesByCostCategory.reduce((acc, item) => {
    const key = String(item.costCategory || '').toUpperCase();
    acc[key] = Number(item.cost || 0);
    return acc;
  }, {});

  const foodCost = round(costByType.ALIMENTO || 0);
  const beverageCost = round(costByType.BEBIDA || 0);
  const cogsTotal = round(Number(cogs.theoretical || 0) + Number(wasteCost || 0));
  const grossProfit = round(netSales - cogsTotal);

  const operatingExpenses = categorizeOperatingExpenses(operatingRows);
  const totalOperatingExpenses = round(Object.values(operatingExpenses).reduce((acc, value) => acc + value, 0));

  const others = splitOtherMovements(otherMovements);
  const netProfit = round(grossProfit - totalOperatingExpenses + others.incomes - others.expenses);

  return {
    totals: {
      grossSales,
      discounts,
      returns,
      netSales,
      paidSales: Number(salesOverview.paidSales || 0),
    },
    breakdown: {
      byChannel: salesByChannel.map((item) => ({
        channel: item.channel,
        total: round(item.total),
        percentage: round(pct(item.total, netSales)),
      })),
      byCategory: salesByCategory.map((item) => ({
        category: item.category,
        total: round(item.revenue),
        percentage: round(pct(item.revenue, netSales)),
      })),
      bySchedule: salesBySchedule.map((item) => ({
        schedule: item.schedule,
        total: round(item.total),
        percentage: round(pct(item.total, netSales)),
      })),
      topProducts: topProducts.map((item) => ({
        product: item.product,
        units: round(item.units),
        revenue: round(item.revenue),
      })),
    },
    cogs: {
      inventoryMethod: 'Costo teórico basado en recetas + mermas por ajustes de stock',
      theoreticalCost: round(cogs.theoretical),
      foodCost,
      beverageCost,
      wasteCost: round(wasteCost),
      total: cogsTotal,
      percentage: round(pct(cogsTotal, netSales)),
    },
    grossProfit: {
      amount: grossProfit,
      margin: round(pct(grossProfit, netSales)),
    },
    operatingExpenses: {
      ...Object.fromEntries(Object.entries(operatingExpenses).map(([key, value]) => [key, round(value)])),
      total: totalOperatingExpenses,
      percentage: round(pct(totalOperatingExpenses, netSales)),
    },
    others: {
      incomes: round(others.incomes),
      expenses: round(others.expenses),
      net: round(others.incomes - others.expenses),
      incomesDetail: others.incomesDetail.map((item) => ({ ...item, total: round(item.total) })),
      expensesDetail: others.expensesDetail.map((item) => ({ ...item, total: round(item.total) })),
    },
    netProfit: {
      amount: netProfit,
      margin: round(pct(netProfit, netSales)),
    },
    kpis: {
      netMargin: round(pct(netProfit, netSales)),
      foodAndBeverageCost: round(pct(cogsTotal, netSales)),
      laborCost: round(pct(operatingExpenses.personal, netSales)),
      overheadCost: round(pct(operatingExpenses.alquiler + operatingExpenses.servicios, netSales)),
      averagePerSale: round(netSales / (Number(salesOverview.paidSales || 0) || 1)),
      totalCustomers: Number(salesOverview.paidSales || 0),
      tableTurnover: round(Number(salesOverview.paidSales || 0) / Math.max(1, ((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1)),
      breakEvenSales: round(totalOperatingExpenses + cogsTotal),
    },
    notes: [
      'Eventos especiales: sin registros automáticos para el período seleccionado.',
      'Problemas operativos relevantes: revisar gastos en categoría "otros operativos" para mayor detalle.',
    ],
  };
}

async function getProfitReport(branchId, query = {}) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  const branch = await repo.getBranchById(branchId);
  if (!branch) {
    throw new AppError('Sucursal no encontrada', 404);
  }

  const period = String(query.period || 'MENSUAL').toUpperCase();
  const totalFrom = period === 'TOTAL' ? await repo.getFirstSaleDate(branchId) : null;
  const suggestedRange = getRangeByPeriod(period, totalFrom);
  const from = parseDate(query.from, suggestedRange.from);
  const to = parseDate(query.to, suggestedRange.to);

  const current = await buildMetricsForRange(branchId, from, to);

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const diffDays = Math.max(1, Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);

  const prevToDate = new Date(fromDate);
  prevToDate.setUTCDate(prevToDate.getUTCDate() - 1);

  const prevFromDate = new Date(prevToDate);
  prevFromDate.setUTCDate(prevToDate.getUTCDate() - (diffDays - 1));

  const prevFrom = prevFromDate.toISOString().slice(0, 10);
  const prevTo = prevToDate.toISOString().slice(0, 10);

  const previous = await buildMetricsForRange(branchId, prevFrom, prevTo);

  const expectedBudget = Number(query.expectedBudget || 0);

  const comparison = {
    netProfit: buildComparison(current.netProfit.amount, previous.netProfit.amount),
    netSales: buildComparison(current.totals.netSales, previous.totals.netSales),
    grossProfit: buildComparison(current.grossProfit.amount, previous.grossProfit.amount),
    budget: buildComparison(current.netProfit.amount, expectedBudget),
  };

  return {
    header: {
      restaurantName: branch.name,
      period,
      from,
      to,
      generatedAt: new Date().toISOString(),
    },
    executiveSummary: {
      netProfit: current.netProfit.amount,
      netMargin: current.netProfit.margin,
      comparison,
    },
    report: current,
    previousPeriod: {
      from: prevFrom,
      to: prevTo,
      netProfit: previous.netProfit.amount,
      netSales: previous.totals.netSales,
    },
  };
}

module.exports = {
  getProfitReport,
};
