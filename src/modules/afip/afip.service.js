const crypto = require('crypto');
const fs = require('fs/promises');
const { mkdirSync } = require('fs');
const path = require('path');
const AppError = require('../../utils/appError');
const repo = require('./afip.repository');

const uploadsDir = path.join(process.cwd(), 'uploads', 'afip');
mkdirSync(uploadsDir, { recursive: true });

const SUPPORTED_IMAGE_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

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

  const [, mimeType, base64Data] = match;
  const extension = SUPPORTED_IMAGE_MIME[mimeType.toLowerCase()];
  if (!extension) throw new AppError('Formato de imagen no compatible. Use JPG, PNG, WEBP o GIF.', 400);

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer.length) throw new AppError('La imagen está vacía.', 400);
  if (buffer.length > 2 * 1024 * 1024) throw new AppError('La imagen debe pesar menos de 2 MB.', 400);

  const baseName = path
    .basename(imageFile.originalName || 'logo-ticket', path.extname(imageFile.originalName || 'logo-ticket'))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'logo-ticket';
  const fileName = `${baseName}-${Date.now()}${extension}`;
  await fs.writeFile(path.join(uploadsDir, fileName), buffer);
  return `/uploads/afip/${fileName}`;
}

function normalizeConfigPayload(data = {}, branchId) {
  if (!data.pointOfSale) throw new AppError('pointOfSale es requerido', 400);
  if (!data.environment) throw new AppError('environment es requerido', 400);

  return {
    branchId,
    cuit: data.cuit || null,
    issuerName: data.issuerName || null,
    issuerAddress: data.issuerAddress || null,
    pointOfSale: Number(data.pointOfSale),
    environment: data.environment,
    wsMode: data.wsMode || 'MOCK',
    certPath: data.certPath || null,
    keyPath: data.keyPath || null,
    serviceTaxId: data.serviceTaxId || null,
    ticketLogoPath: data.ticketLogoPath || null,
  };
}

function computeHalf(month) {
  return month <= 6 ? 1 : 2;
}

function generateMockCaea(periodYear, periodHalf, branchId, pointOfSale) {
  const seed = `${periodYear}${periodHalf}${branchId}${pointOfSale}${Date.now()}`;
  const numeric = crypto
    .createHash('sha256')
    .update(seed)
    .digest('hex')
    .replace(/[^0-9]/g, '')
    .slice(0, 14)
    .padEnd(14, '7');
  return numeric;
}

async function getConfig(branchId) {
  const config = await repo.getConfig(branchId);
  return config || null;
}

async function upsertConfig(branchId, payload) {
  const current = await repo.getConfig(branchId);
  const nextLogoAction = payload.removeTicketLogo === true || payload.removeTicketLogo === 'true' ? 'remove' : null;
  let ticketLogoPath = current?.ticket_logo_path || null;

  if (payload.ticketLogoData) {
    ticketLogoPath = await saveImageFromDataUrl({
      dataUrl: payload.ticketLogoData,
      originalName: payload.ticketLogoName,
    });
    await removeImageIfLocal(current?.ticket_logo_path);
  } else if (nextLogoAction === 'remove') {
    ticketLogoPath = null;
    await removeImageIfLocal(current?.ticket_logo_path);
  }

  const data = normalizeConfigPayload({ ...payload, ticketLogoPath }, branchId);
  return repo.upsertConfig(data);
}

async function listCaea(branchId) {
  return repo.listCaea(branchId);
}

async function createCaea(data) {
  return repo.createCaea(data);
}

async function requestCaea(branchId, payload = {}) {
  const config = await repo.getConfig(branchId);
  if (!config) {
    throw new AppError('Primero debe configurar AFIP para esta sucursal', 400);
  }

  const now = new Date();
  const periodYear = Number(payload.periodYear || now.getUTCFullYear());
  const periodHalf = Number(payload.periodHalf || computeHalf(now.getUTCMonth() + 1));
  const dueDate = payload.dueDate || `${periodYear}-${periodHalf === 1 ? '06-15' : '12-15'}`;

  const existing = await repo.getByPeriod(branchId, periodYear, periodHalf);
  if (existing) return existing;

  let caeaCode = payload.caeaCode;
  if (!caeaCode) {
    if (config.ws_mode === 'MANUAL') {
      throw new AppError('En modo MANUAL debe informar caeaCode', 400);
    }
    caeaCode = generateMockCaea(periodYear, periodHalf, branchId, config.point_of_sale);
  }

  return repo.createCaea({
    branchId,
    caeaCode,
    periodYear,
    periodHalf,
    dueDate,
  });
}

async function getById(id) {
  return repo.getById(id);
}

module.exports = {
  getConfig,
  upsertConfig,
  listCaea,
  createCaea,
  requestCaea,
  getById,
};
