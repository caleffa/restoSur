import http from './http';

function unwrap(response) {
  if (!response) return null;
  if (response?.ok === false) {
    throw new Error(response?.message || 'Error en la API');
  }
  return response?.data ?? response;
}

export async function getSalesReport(params = {}) {
  const { data } = await http.get('/sales/reports', { params });
  return unwrap(data) || { totals: {}, rows: [] };
}
