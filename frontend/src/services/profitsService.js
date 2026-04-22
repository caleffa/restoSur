import http from './http';

function unwrap(response) {
  if (!response) return null;
  if (response?.ok === false) {
    throw new Error(response?.message || 'Error en la API');
  }
  return response?.data ?? response;
}

export async function getProfitReport(params = {}) {
  const { data } = await http.get('/profits/report', { params });
  return unwrap(data);
}
