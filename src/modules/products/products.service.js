const repo = require('./products.repository');

module.exports = {
  listProducts: () => repo.listProducts(),
  createProduct: (data) => repo.createProduct(data),
  updateProduct: (id, data) => repo.updateProduct(id, data),
  removeProduct: (id) => repo.removeProduct(id),
  listCategories: () => repo.listCategories(),
  createCategory: (name) => repo.createCategory(name),
};
