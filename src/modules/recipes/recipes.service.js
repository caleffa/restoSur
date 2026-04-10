const repo = require('./recipes.repository');
const productsRepo = require('../products/products.repository');
const AppError = require('../../utils/appError');

function normalizeItem(rawItem) {
  const articleId = Number(rawItem.articleId);
  const quantity = Number(rawItem.quantity);

  if (!articleId) throw new AppError('Cada ítem debe tener un artículo válido', 400);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError('Cada ítem debe tener una cantidad mayor a 0', 400);
  }

  return { articleId, quantity: Number(quantity.toFixed(3)) };
}

function normalizePayload(data) {
  const productId = Number(data.productId);
  if (!productId) throw new AppError('El producto es obligatorio', 400);

  const notes = data.notes ? String(data.notes).trim() : null;
  const active = data.active === undefined ? true : Boolean(data.active);

  const items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
  if (!items.length) throw new AppError('La receta debe incluir al menos un artículo', 400);

  const dedupedMap = new Map();
  for (const item of items) {
    const current = dedupedMap.get(item.articleId) || 0;
    dedupedMap.set(item.articleId, Number((current + item.quantity).toFixed(3)));
  }

  return {
    productId,
    notes,
    active,
    items: Array.from(dedupedMap.entries()).map(([articleId, quantity]) => ({ articleId, quantity })),
  };
}

function validateFractions(items, articleMap) {
  for (const item of items) {
    const article = articleMap.get(item.articleId);
    if (!article) throw new AppError(`Artículo no encontrado para receta (ID ${item.articleId})`, 404);

    const allowsFraction = article.measurement_unit_allows_fraction === 1 || article.measurement_unit_allows_fraction === true;
    const isInteger = Number.isInteger(item.quantity);

    if (!allowsFraction && !isInteger) {
      throw new AppError(
        `El artículo "${article.name}" usa una unidad sin fracciones (${article.measurement_unit_code}). La cantidad debe ser entera.`,
        400
      );
    }
  }
}

async function validateReferences(data, recipeId = null) {
  const product = await productsRepo.findById(data.productId);
  if (!product) throw new AppError('Producto no encontrado', 404);

  const existingRecipe = await repo.findByProductId(data.productId);
  if (existingRecipe && existingRecipe.id !== recipeId) {
    throw new AppError('Ya existe una receta para ese producto', 409);
  }

  const articleIds = data.items.map((item) => item.articleId);
  const articles = await repo.findArticlesByIds(articleIds);

  if (articles.length !== articleIds.length) {
    throw new AppError('Uno o más artículos de la receta no existen', 404);
  }

  const articleMap = new Map(articles.map((article) => [article.id, article]));
  validateFractions(data.items, articleMap);
}

async function listRecipes() {
  return repo.list();
}

async function getRecipeById(id) {
  const recipeId = Number(id);
  if (!recipeId) throw new AppError('ID de receta inválido', 400);

  const recipe = await repo.findById(recipeId);
  if (!recipe) throw new AppError('Receta no encontrada', 404);
  return recipe;
}

async function createRecipe(data) {
  const payload = normalizePayload(data);
  await validateReferences(payload);

  const { id } = await repo.create(payload);
  return repo.findById(id);
}

async function updateRecipe(id, data) {
  const recipeId = Number(id);
  if (!recipeId) throw new AppError('ID de receta inválido', 400);

  const current = await repo.findById(recipeId);
  if (!current) throw new AppError('Receta no encontrada', 404);

  const payload = normalizePayload(data);
  await validateReferences(payload, recipeId);
  await repo.update(recipeId, payload);

  return repo.findById(recipeId);
}

async function removeRecipe(id) {
  const recipeId = Number(id);
  if (!recipeId) throw new AppError('ID de receta inválido', 400);

  const current = await repo.findById(recipeId);
  if (!current) throw new AppError('Receta no encontrada', 404);

  await repo.remove(recipeId);
}

module.exports = {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  removeRecipe,
};
