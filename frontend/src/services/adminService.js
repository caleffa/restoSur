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

// Tipos de cocina
export async function getKitchenTypes() {
  const { data } = await http.get('/kitchen-types');
  return unwrap(data) || [];
}

export async function createKitchenType(payload) {
  const { data } = await http.post('/kitchen-types', payload);
  return unwrap(data);
}

export async function updateKitchenType(kitchenTypeId, payload) {
  const { data } = await http.put(`/kitchen-types/${kitchenTypeId}`, payload);
  return unwrap(data);
}

export async function deleteKitchenType(kitchenTypeId) {
  const { data } = await http.delete(`/kitchen-types/${kitchenTypeId}`);
  return unwrap(data);
}

// Cocinas
export async function getKitchens(params = {}) {
  const { data } = await http.get('/kitchens', { params });
  return unwrap(data) || [];
}

export async function createKitchen(payload) {
  const { data } = await http.post('/kitchens', payload);
  return unwrap(data);
}

export async function updateKitchen(kitchenId, payload) {
  const { data } = await http.put(`/kitchens/${kitchenId}`, payload);
  return unwrap(data);
}

export async function deleteKitchen(kitchenId) {
  const { data } = await http.delete(`/kitchens/${kitchenId}`);
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
export async function getArticles(params = {}) {
  const { data } = await http.get('/articles', { params });
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

export async function importArticlesCsv(csv) {
  const { data } = await http.post('/articles/import', { csv });
  return unwrap(data);
}

export async function downloadArticlesImportTemplate() {
  const response = await http.get('/articles/import/template', {
    responseType: 'blob',
  });
  return response.data;
}

// Motivos de caja
export async function getCashReasons(params = {}) {
  const { data } = await http.get('/cash-reasons', { params });
  return unwrap(data) || [];
}

export async function createCashReason(payload) {
  const { data } = await http.post('/cash-reasons', payload);
  return unwrap(data);
}

export async function updateCashReason(reasonId, payload) {
  const { data } = await http.put(`/cash-reasons/${reasonId}`, payload);
  return unwrap(data);
}

export async function deleteCashReason(reasonId) {
  const { data } = await http.delete(`/cash-reasons/${reasonId}`);
  return unwrap(data);
}

// Tipos de IVA
export async function getVatTypes() {
  const { data } = await http.get('/vat-types');
  return unwrap(data) || [];
}

export async function createVatType(payload) {
  const { data } = await http.post('/vat-types', payload);
  return unwrap(data);
}

export async function updateVatType(vatTypeId, payload) {
  const { data } = await http.put(`/vat-types/${vatTypeId}`, payload);
  return unwrap(data);
}

export async function deleteVatType(vatTypeId) {
  const { data } = await http.delete(`/vat-types/${vatTypeId}`);
  return unwrap(data);
}

// Proveedores
export async function getSuppliers(params = {}) {
  const { data } = await http.get('/suppliers', { params });
  return unwrap(data) || [];
}

export async function createSupplier(payload) {
  const { data } = await http.post('/suppliers', payload);
  return unwrap(data);
}

export async function updateSupplier(supplierId, payload) {
  const { data } = await http.put(`/suppliers/${supplierId}`, payload);
  return unwrap(data);
}

export async function deleteSupplier(supplierId) {
  const { data } = await http.delete(`/suppliers/${supplierId}`);
  return unwrap(data);
}

// Clientes
export async function getCustomers(params = {}) {
  const { data } = await http.get('/customers', { params });
  return unwrap(data) || [];
}

export async function createCustomer(payload) {
  const { data } = await http.post('/customers', payload);
  return unwrap(data);
}

export async function updateCustomer(customerId, payload) {
  const { data } = await http.put(`/customers/${customerId}`, payload);
  return unwrap(data);
}

export async function deleteCustomer(customerId) {
  const { data } = await http.delete(`/customers/${customerId}`);
  return unwrap(data);
}

// Órdenes de compra
export async function getPurchaseOrders(params = {}) {
  const { data } = await http.get('/purchase-orders', { params });
  return unwrap(data) || [];
}

export async function getPurchaseOrderById(orderId, params = {}) {
  const { data } = await http.get(`/purchase-orders/${orderId}`, { params });
  return unwrap(data);
}

export async function createPurchaseOrder(payload) {
  const { data } = await http.post('/purchase-orders', payload);
  return unwrap(data);
}

export async function receivePurchaseOrder(orderId, payload) {
  const { data } = await http.post(`/purchase-orders/${orderId}/receipts`, payload);
  return unwrap(data);
}

export async function closePurchaseOrder(orderId, payload) {
  const { data } = await http.post(`/purchase-orders/${orderId}/close`, payload);
  return unwrap(data);
}
