import http from './http';

const FALLBACK_TOP_PRODUCTS = [
  { id: 'p1', name: 'Milanesa napolitana', quantity: 18, total: 243000 },
  { id: 'p2', name: 'Pizza muzzarella', quantity: 14, total: 147000 },
  { id: 'p3', name: 'Empanadas (docena)', quantity: 11, total: 88000 },
  { id: 'p4', name: 'Limonada', quantity: 24, total: 72000 },
];

const FALLBACK_SALES_BY_HOUR = [
  { hour: '12:00', total: 42000 },
  { hour: '13:00', total: 57000 },
  { hour: '14:00', total: 38000 },
  { hour: '20:00', total: 64000 },
  { hour: '21:00', total: 49000 },
];

function normalizePayload(responseData) {
  if (!responseData) return null;
  if (responseData.ok === false) {
    throw new Error(responseData.message || 'Error de API');
  }
  return responseData.data ?? responseData;
}

function isEndpointUnavailable(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildMockSummary(tables = [], openSales = []) {
  const occupiedTables = tables.filter((table) => table.status === 'OCUPADA').length;
  const tickets = openSales.length || getRandomInt(25, 50);
  const avgTicket = getRandomInt(4500, 8200);
  const sales = tickets * avgTicket;

  return {
    sales,
    tickets,
    avgTicket,
    occupiedTables,
  };
}

function adaptOpenSales(payload) {
  if (!Array.isArray(payload)) return [];

  return payload.map((sale) => ({
    id: sale.id,
    tableId: sale.tableId,
    tableName: sale.tableName || sale.table?.name || `Mesa ${sale.tableId}`,
    total: Number(sale.total || sale.amount || 0),
    status: sale.status,
    openedAt: sale.openedAt || sale.createdAt,
  }));
}

function adaptTopProducts(payload) {
  if (!Array.isArray(payload)) return [];

  return payload.map((product) => ({
    id: product.id,
    name: product.name,
    quantity: Number(product.quantity || product.qty || 0),
    total: Number(product.total || product.amount || 0),
  }));
}

export async function getDashboardSummary() {
  try {
    const { data } = await http.get('/dashboard/summary');
    return normalizePayload(data);
  } catch (err) {
    if (!isEndpointUnavailable(err)) {
      throw err;
    }

    const [tablesResponse, salesResponse] = await Promise.allSettled([
      http.get('/tables'),
      http.get('/sales/open'),
    ]);

    const tables = tablesResponse.status === 'fulfilled'
      ? normalizePayload(tablesResponse.value.data) || []
      : [];
    const openSales = salesResponse.status === 'fulfilled'
      ? adaptOpenSales(normalizePayload(salesResponse.value.data))
      : [];

    return buildMockSummary(tables, openSales);
  }
}

export async function getOpenSales() {
  const { data } = await http.get('/sales/open');
  return adaptOpenSales(normalizePayload(data));
}

export async function getTopProducts() {
  try {
    const { data } = await http.get('/products/top');
    const products = adaptTopProducts(normalizePayload(data));
    return products.length ? products : FALLBACK_TOP_PRODUCTS;
  } catch (err) {
    if (!isEndpointUnavailable(err)) {
      throw err;
    }
    return FALLBACK_TOP_PRODUCTS;
  }
}

export async function getSalesByHour() {
  try {
    const { data } = await http.get('/dashboard/sales-by-hour');
    const payload = normalizePayload(data);

    if (!Array.isArray(payload) || !payload.length) {
      return FALLBACK_SALES_BY_HOUR;
    }

    return payload.map((item) => ({
      hour: item.hour,
      total: Number(item.total || 0),
    }));
  } catch (err) {
    if (!isEndpointUnavailable(err)) {
      throw err;
    }
    return FALLBACK_SALES_BY_HOUR;
  }
}
