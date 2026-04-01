const { query } = require('../../repositories/baseRepository');

async function findById(id, conn) {
  const rows = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [id], conn);
  return rows[0] || null;
}

async function listProducts() {
  return query('SELECT * FROM products ORDER BY id DESC');
}

async function createProduct(data) {
  const result = await query(
    'INSERT INTO products (category_id, name, price, has_stock, active) VALUES (?, ?, ?, ?, ?)',
    [data.categoryId, data.name, data.price, data.hasStock ? 1 : 0, data.active ?? 1]
  );
  return { id: result.insertId, ...data };
}

async function updateProduct(id, data) {
  await query('UPDATE products SET category_id=?, name=?, price=?, has_stock=?, active=? WHERE id=?', [
    data.categoryId,
    data.name,
    data.price,
    data.hasStock ? 1 : 0,
    data.active ?? 1,
    id,
  ]);
}

async function removeProduct(id) {
  await query('DELETE FROM products WHERE id=?', [id]);
}

async function listCategories() {
  return query('SELECT * FROM categories ORDER BY id DESC');
}

async function createCategory(name) {
  const result = await query('INSERT INTO categories (name) VALUES (?)', [name]);
  return { id: result.insertId, name };
}

module.exports = {
  findById,
  listProducts,
  createProduct,
  updateProduct,
  removeProduct,
  listCategories,
  createCategory,
};
