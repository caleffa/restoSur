const repo = require('./categories.repository');
const AppError = require('../../utils/appError');
const fs = require('fs/promises');
const path = require('path');
const { mkdirSync } = require('fs');

const uploadsDir = path.join(process.cwd(), 'uploads', 'categories');
mkdirSync(uploadsDir, { recursive: true });
const allowedMimeByExt = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function normalizeName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) throw new AppError('El nombre de la categoría es obligatorio', 400);
  return normalized;
}

function buildUploadAbsolutePath(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return null;
  return path.join(process.cwd(), imagePath.replace(/^\//, ''));
}

async function removeImageIfLocal(imagePath) {
  const absolutePath = buildUploadAbsolutePath(imagePath);
  if (!absolutePath) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function saveImageFromDataUrl(imageFile) {
  if (!imageFile?.dataUrl) return null;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageFile.dataUrl);
  if (!match) throw new AppError('Formato de imagen inválido.', 400);

  const mime = match[1].toLowerCase();
  const extension = allowedMimeByExt[mime];
  if (!extension) throw new AppError('Formato de imagen no compatible. Use JPG, PNG, WEBP o GIF.', 400);

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) throw new AppError('La imagen debe pesar menos de 2 MB.', 400);

  const safeBaseName = path
    .basename(imageFile.originalName || 'categoria', path.extname(imageFile.originalName || 'categoria'))
    .replace(/[^\w-]/g, '_')
    .slice(0, 50);
  const fileName = `${Date.now()}-${safeBaseName || 'categoria'}${extension}`;
  await fs.writeFile(path.join(uploadsDir, fileName), buffer);
  return `/uploads/categories/${fileName}`;
}

async function listCategories() {
  return repo.list();
}

async function createCategory(name, image) {
  const normalizedName = normalizeName(name);
  const imagePath = await saveImageFromDataUrl(image);
  return repo.create(normalizedName, imagePath);
}

async function updateCategory(id, name, { imageFile, removeImage }) {
  const categoryId = Number(id);
  if (!categoryId) throw new AppError('ID de categoría inválido', 400);

  const category = await repo.findById(categoryId);
  if (!category) throw new AppError('Categoría no encontrada', 404);

  let nextImage = category.image;
  if (imageFile?.dataUrl) {
    nextImage = await saveImageFromDataUrl(imageFile);
    await removeImageIfLocal(category.image);
  } else if (removeImage) {
    nextImage = null;
    await removeImageIfLocal(category.image);
  }

  await repo.update(categoryId, normalizeName(name), nextImage);
}

async function removeCategory(id) {
  const categoryId = Number(id);
  if (!categoryId) throw new AppError('ID de categoría inválido', 400);

  const category = await repo.findById(categoryId);
  if (!category) throw new AppError('Categoría no encontrada', 404);

  await removeImageIfLocal(category.image);
  await repo.remove(categoryId);
}

module.exports = { listCategories, createCategory, updateCategory, removeCategory };
