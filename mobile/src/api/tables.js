import http from './http';

function unwrap(response) {
  if (!response) return null;
  if (response.ok === false) {
    throw new Error(response.message || 'Error en la API');
  }
  return response.data ?? response;
}

export async function getTables() {
  const { data } = await http.get('/tables');
  return unwrap(data) || [];
}
