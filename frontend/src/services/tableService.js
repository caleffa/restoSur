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
export async function getTables() {
  const { data } = await http.get('/tables');
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

// 📌 SALES
export async function createSale(tableId) {
  const { data } = await http.post('/sales', { tableId });
  return unwrap(data);
}