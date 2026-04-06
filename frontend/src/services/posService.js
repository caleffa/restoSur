import http from './http';

const SALE_PREFIX = 'pos_mock_sale_';
const KITCHEN_PREFIX = 'pos_mock_kitchen_';

function unwrap(response) {
  if (!response) return null;
  if (response?.ok === false) {
    throw new Error(response?.message || 'Error en la API');
  }
  return response?.data ?? response;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildMockSale(tableId) {
  return {
    id: `mock-sale-${tableId}`,
    tableId: Number(tableId),
    table_id: Number(tableId),
    status: 'OCUPADA',
    items: [],
  };
}

function normalizeItem(item) {
  return {
    id: item.id,
    productId: item.productId ?? item.product_id,
    productName: item.productName ?? item.product_name ?? item.name,
    categoryId: Number(item.categoryId ?? item.category_id ?? 0),
    unitPrice: Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0),
    quantity: Number(item.quantity ?? 0),
    kitchenStatus: item.kitchenStatus ?? item.kitchen_status ?? 'SIN_COMANDA',
  };
}

function normalizeSale(tableId, payload) {
  if (!payload) return buildMockSale(tableId);

  const items = Array.isArray(payload.items) ? payload.items.map(normalizeItem) : [];

  return {
    id: payload.id ?? `sale-${tableId}`,
    tableId: Number(payload.tableId ?? payload.table_id ?? tableId),
    table_id: Number(payload.table_id ?? payload.tableId ?? tableId),
    status: payload.status || 'OCUPADA',
    items,
  };
}

export async function getSaleByTable(tableId) {
  const storageKey = `${SALE_PREFIX}${tableId}`;

  try {
    const { data } = await http.get(`/sales/${tableId}`);
    const sale = normalizeSale(tableId, unwrap(data));
    saveStorage(storageKey, sale);
    return sale;
  } catch {
    const saved = readStorage(storageKey, null);
    return normalizeSale(tableId, saved || buildMockSale(tableId));
  }
}

export async function addSaleItem(tableId, payload) {
  try {
    const { data } = await http.post(`/sales/${tableId}/items`, payload);
    return unwrap(data);
  } catch {
    return { ok: true, mocked: true };
  }
}

export async function updateSaleItem(itemId, payload) {
  try {
    const { data } = await http.put(`/sales/items/${itemId}`, payload);
    return unwrap(data);
  } catch {
    return { ok: true, mocked: true };
  }
}

export async function deleteSaleItem(itemId) {
  try {
    const { data } = await http.delete(`/sales/items/${itemId}`);
    return unwrap(data);
  } catch {
    return { ok: true, mocked: true };
  }
}

export async function getProducts() {
  const { data } = await http.get('/products');
  return unwrap(data) || [];
}

export async function listKitchenOrders(tableId) {
  const storageKey = `${KITCHEN_PREFIX}${tableId}`;

  try {
    const { data } = await http.get(`/kitchen/orders?tableId=${tableId}`);
    const orders = unwrap(data) || [];
    saveStorage(storageKey, orders);
    return orders;
  } catch {
    return readStorage(storageKey, []);
  }
}

export async function createKitchenOrder(payload) {
  const tableId = Number(payload.tableId);
  const storageKey = `${KITCHEN_PREFIX}${tableId}`;

  try {
    const { data } = await http.post('/kitchen/orders', payload);
    const created = unwrap(data);
    const current = readStorage(storageKey, []);
    saveStorage(storageKey, [created, ...current]);
    return created;
  } catch {
    const current = readStorage(storageKey, []);
    const mockOrder = {
      id: `mock-order-${Date.now()}`,
      ...payload,
      status: payload.status || 'PENDIENTE',
      createdAt: payload.timestamp || new Date().toISOString(),
      mocked: true,
    };
    saveStorage(storageKey, [mockOrder, ...current]);
    return mockOrder;
  }
}

export async function closeSale(tableId, payload = {}) {
  try {
    const { data } = await http.post(`/sales/${tableId}/close`, payload);
    return unwrap(data);
  } catch {
    const { data } = await http.post(`/sales/${tableId}/pay`, payload);
    return unwrap(data);
  }
}

export function persistLocalSale(tableId, sale) {
  saveStorage(`${SALE_PREFIX}${tableId}`, sale);
}

export function clearLocalPOS(tableId) {
  localStorage.removeItem(`${SALE_PREFIX}${tableId}`);
  localStorage.removeItem(`${KITCHEN_PREFIX}${tableId}`);
}
