const repo = require('./paymentMethods.repository');
const AppError = require('../../utils/appError');

function normalizePayload(data = {}) {
  const name = String(data.name || '').trim();
  if (!name) throw new AppError('El nombre es obligatorio', 400);

  const code = String(data.code || '').trim().toUpperCase();
  if (!code) throw new AppError('El código es obligatorio', 400);

  const displayOrder = Number(data.displayOrder ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    throw new AppError('El orden debe ser un entero mayor o igual a 0', 400);
  }

  return {
    name,
    code,
    displayOrder,
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function listPaymentMethods({ onlyActive = false } = {}) {
  return repo.list({ onlyActive });
}

async function getPaymentMethodByCode(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return null;
  return repo.findByCode(normalizedCode, true);
}

async function createPaymentMethod(data) {
  const payload = normalizePayload(data);
  const duplicated = await repo.findByNameOrCode({ name: payload.name, code: payload.code });
  if (duplicated) {
    throw new AppError('Ya existe un medio de pago con ese nombre o código', 409);
  }
  return repo.create(payload);
}

async function updatePaymentMethod(id, data) {
  const paymentMethodId = Number(id);
  if (!paymentMethodId) throw new AppError('ID de medio de pago inválido', 400);

  const current = await repo.findById(paymentMethodId);
  if (!current) throw new AppError('Medio de pago no encontrado', 404);

  const payload = normalizePayload(data);
  const duplicated = await repo.findByNameOrCode({
    name: payload.name,
    code: payload.code,
    excludeId: paymentMethodId,
  });
  if (duplicated) {
    throw new AppError('Ya existe un medio de pago con ese nombre o código', 409);
  }

  await repo.update(paymentMethodId, payload);
  return { id: paymentMethodId };
}

async function removePaymentMethod(id) {
  const paymentMethodId = Number(id);
  if (!paymentMethodId) throw new AppError('ID de medio de pago inválido', 400);

  const current = await repo.findById(paymentMethodId);
  if (!current) throw new AppError('Medio de pago no encontrado', 404);

  await repo.remove(paymentMethodId);
  return { id: paymentMethodId };
}

module.exports = {
  listPaymentMethods,
  getPaymentMethodByCode,
  createPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
};
