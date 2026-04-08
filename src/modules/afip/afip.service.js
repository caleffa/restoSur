const crypto = require('crypto');
const AppError = require('../../utils/appError');
const repo = require('./afip.repository');

function normalizeConfigPayload(data = {}, branchId) {
  if (!data.pointOfSale) throw new AppError('pointOfSale es requerido', 400);
  if (!data.environment) throw new AppError('environment es requerido', 400);

  return {
    branchId,
    cuit: data.cuit || null,
    pointOfSale: Number(data.pointOfSale),
    environment: data.environment,
    wsMode: data.wsMode || 'MOCK',
    certPath: data.certPath || null,
    keyPath: data.keyPath || null,
    serviceTaxId: data.serviceTaxId || null,
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
  const data = normalizeConfigPayload(payload, branchId);
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
