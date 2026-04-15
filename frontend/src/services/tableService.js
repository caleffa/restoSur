import http from './http';

// 🔥 helper para normalizar respuestas
function unwrap(response) {
  if (!response) return null;

  // axios → response.data
  const payload = response;

  if (payload?.ok === false) {
    throw new Error(payload?.message || 'Error en la API');
  }

  return payload?.data ?? payload;
}

// 📌 TABLES
export async function getTables(params = {}) {
  const { data } = await http.get('/tables', { params });
  return unwrap(data) || [];
}

export async function createTable(payload) {
  const { data } = await http.post('/tables', payload);
  return unwrap(data);
}

export async function updateTable(tableId, payload) {
  const { data } = await http.put(`/tables/${tableId}`, payload);
  return unwrap(data);
}

export async function deleteTable(tableId) {
  const { data } = await http.delete(`/tables/${tableId}`);
  return unwrap(data);
}

export async function getAreaMap(areaId) {
  const { data } = await http.get('/tables/map', { params: { areaId } });
  return unwrap(data);
}

export async function saveAreaMap(payload) {
  const { data } = await http.put('/tables/map', payload);
  return unwrap(data);
}

// 📌 SALES
export async function createSale(tableId) {
  const branchId = 1;
  const { data } = await http.post('/sales', { branchId, tableId });
  return unwrap(data);
}

export async function getWaiters() {
  const { data } = await http.get('/sales/waiters');
  return unwrap(data) || [];
}

export async function createSaleWithWaiter(tableId, waiterId) {
  const branchId = 1;
  const { data } = await http.post('/sales', { branchId, tableId, waiterId });
  return unwrap(data);
}
