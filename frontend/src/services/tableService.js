import http from './http';

export async function getTables() {
  const { data } = await http.get('/tables');
  return data;
}

export async function createTable(payload) {
  const { data } = await http.post('/tables', payload);
  return data;
}

export async function updateTable(tableId, payload) {
  const { data } = await http.put(`/tables/${tableId}`, payload);
  return data;
}

export async function deleteTable(tableId) {
  const { data } = await http.delete(`/tables/${tableId}`);
  return data;
}

export async function createSale(tableId) {
  const { data } = await http.post('/sales', { tableId });
  return data;
}
