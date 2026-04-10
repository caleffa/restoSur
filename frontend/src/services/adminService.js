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


// Áreas de mesas
export async function getAreas(params = {}) {
  const { data } = await http.get('/areas', { params });
  return unwrap(data) || [];
}

export async function createArea(payload) {
  const { data } = await http.post('/areas', payload);
  return unwrap(data);
}

export async function updateArea(areaId, payload) {
  const { data } = await http.put(`/areas/${areaId}`, payload);
  return unwrap(data);
}

export async function deleteArea(areaId) {
  const { data } = await http.delete(`/areas/${areaId}`);
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




export async function getArticles() {
  const { data } = await http.get('/articles');
  return unwrap(data) || [];
}

// Recetas
export async function getRecipes() {
  const { data } = await http.get('/recipes');
  return unwrap(data) || [];
}

export async function getRecipeById(recipeId) {
  const { data } = await http.get(`/recipes/${recipeId}`);
  return unwrap(data);
}

export async function createRecipe(payload) {
  const { data } = await http.post('/recipes', payload);
  return unwrap(data);
}

export async function updateRecipe(recipeId, payload) {
  const { data } = await http.put(`/recipes/${recipeId}`, payload);
  return unwrap(data);
}

export async function deleteRecipe(recipeId) {
  const { data } = await http.delete(`/recipes/${recipeId}`);
  return unwrap(data);
}

// Stock
export async function getStock(params = {}) {
  const { data } = await http.get('/stock', { params });
  return unwrap(data) || [];
}

export async function getStockMovements(params = {}) {
  const { data } = await http.get('/stock/movements', { params });
  return unwrap(data) || [];
}

export async function createStockMovement(payload) {
  const { data } = await http.post('/stock/movement', payload);
  return unwrap(data);
}

// AFIP + Facturación
export async function getAfipConfig() {
  const { data } = await http.get('/afip/config');
  return unwrap(data);
}

export async function saveAfipConfig(payload) {
  const { data } = await http.put('/afip/config', payload);
  return unwrap(data);
}

export async function getAfipCaea() {
  const { data } = await http.get('/afip/caea');
  return unwrap(data) || [];
}

export async function requestCaea(payload = {}) {
  const { data } = await http.post('/afip/caea/request', payload);
  return unwrap(data);
}

export async function getInvoices() {
  const { data } = await http.get('/invoices');
  return unwrap(data) || [];
}

export async function createInvoice(payload) {
  const { data } = await http.post('/invoices', payload);
  return unwrap(data);
}

export async function getSalesReport(filters = {}) {
  const { data } = await http.get('/sales/reports', { params: filters });
  return unwrap(data) || { totals: {}, rows: [] };
}

// Tipos de artículos
export async function getArticleTypes() {
  const { data } = await http.get('/article-types');
  return unwrap(data) || [];
}

export async function createArticleType(payload) {
  const { data } = await http.post('/article-types', payload);
  return unwrap(data);
}

export async function updateArticleType(articleTypeId, payload) {
  const { data } = await http.put(`/article-types/${articleTypeId}`, payload);
  return unwrap(data);
}

export async function deleteArticleType(articleTypeId) {
  const { data } = await http.delete(`/article-types/${articleTypeId}`);
  return unwrap(data);
}

// Unidades de medida
export async function getMeasurementUnits() {
  const { data } = await http.get('/measurement-units');
  return unwrap(data) || [];
}

export async function createMeasurementUnit(payload) {
  const { data } = await http.post('/measurement-units', payload);
  return unwrap(data);
}

export async function updateMeasurementUnit(measurementUnitId, payload) {
  const { data } = await http.put(`/measurement-units/${measurementUnitId}`, payload);
  return unwrap(data);
}

export async function deleteMeasurementUnit(measurementUnitId) {
  const { data } = await http.delete(`/measurement-units/${measurementUnitId}`);
  return unwrap(data);
}

// Artículos
export async function getArticles() {
  const { data } = await http.get('/articles');
  return unwrap(data) || [];
}

export async function createArticle(payload) {
  const { data } = await http.post('/articles', payload);
  return unwrap(data);
}

export async function updateArticle(articleId, payload) {
  const { data } = await http.put(`/articles/${articleId}`, payload);
  return unwrap(data);
}

export async function deleteArticle(articleId) {
  const { data } = await http.delete(`/articles/${articleId}`);
  return unwrap(data);
}
