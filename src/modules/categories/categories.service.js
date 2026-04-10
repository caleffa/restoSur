const repo = require('./categories.repository');
const AppError = require('../../utils/appError');

function normalizeName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) throw new AppError('El nombre de la categoría es obligatorio', 400);
  return normalized;
}

function normalizeImage(image) {
  const normalized = String(image || '').trim();
  if (!normalized) return null;
  if (normalized.length > 200) throw new AppError('La imagen no puede superar los 200 caracteres', 400);
  return normalized;
}

async function listCategories() {
  return repo.list();
}

async function createCategory(name, image) {
  const normalizedName = normalizeName(name);
  return repo.create(normalizedName, normalizeImage(image));
}

async function updateCategory(id, name, image) {
  const categoryId = Number(id);
  if (!categoryId) throw new AppError('ID de categoría inválido', 400);

  const category = await repo.findById(categoryId);
  if (!category) throw new AppError('Categoría no encontrada', 404);

  await repo.update(categoryId, normalizeName(name), normalizeImage(image));
}

async function removeCategory(id) {
  const categoryId = Number(id);
  if (!categoryId) throw new AppError('ID de categoría inválido', 400);

  const category = await repo.findById(categoryId);
  if (!category) throw new AppError('Categoría no encontrada', 404);

  await repo.remove(categoryId);
}

module.exports = { listCategories, createCategory, updateCategory, removeCategory };
