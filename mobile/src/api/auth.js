import http from './http';

export async function loginRequest(email, password) {
  const { data } = await http.post('/auth/login', { email, password });
  return data;
}
