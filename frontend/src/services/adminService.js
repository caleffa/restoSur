import http from './http';

function unwrap(response) {
  if (!response) return null;
  if (response?.ok === false) {
    throw new Error(response?.message || 'Error en la API');
  }
  return response?.data ?? response;
}

// Usuarios
export async function getUsers() {
  const { data } = await http.get('/users');
  return unwrap(data) || [];
}

export async function createUser(payload) {
  const { data } = await http.post('/users', payload);
  return unwrap(data);
}

export async function updateUser(userId, payload) {
  const { data } = await http.put(`/users/${userId}`, payload);
  return unwrap(data);
}

export async function deleteUser(userId) {
  const { data } = await http.delete(`/users/${userId}`);
  return unwrap(data);
}

// Categorías
export async function getCategories() {
  const { data } = await http.get('/categories');
  return unwrap(data) || [];
}

export async function createCategory(payload) {
  const { data } = await http.post('/categories', payload);
  return unwrap(data);
}

export async function updateCategory(categoryId, payload) {
  const { data } = await http.put(`/categories/${categoryId}`, payload);
  return unwrap(data);
}

export async function deleteCategory(categoryId) {
  const { data } = await http.delete(`/categories/${categoryId}`);
  return unwrap(data);
}

// Productos
export async function getProducts() {
  const { data } = await http.get('/products');
  return unwrap(data) || [];
}

export async function createProduct(payload) {
  const { data } = await http.post('/products', payload);
  return unwrap(data);
}

export async function updateProduct(productId, payload) {
  const { data } = await http.put(`/products/${productId}`, payload);
  return unwrap(data);
}

export async function deleteProduct(productId) {
  const { data } = await http.delete(`/products/${productId}`);
  return unwrap(data);
}
