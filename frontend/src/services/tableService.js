import http from './http';

export async function getTables() {
  const { data } = await http.get('/tables');
  return data;
}

export async function createSale(tableId) {
  const { data } = await http.post('/sales', { tableId });
  return data;
}
