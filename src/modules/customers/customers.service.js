const repo = require('./customers.repository');
const AppError = require('../../utils/appError');

function cleanText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function onlyDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function normalizePayload(data, user) {
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  if (!firstName || !lastName) throw new AppError('Nombre y apellido son obligatorios', 400);

  return {
    branchId: Number(user.branchId || data.branchId),
    firstName,
    lastName,
    documentType: String(data.documentType || 'DNI').trim().toUpperCase(),
    documentNumber: onlyDigits(data.documentNumber),
    cuit: onlyDigits(data.cuit),
    vatTypeId: data.vatTypeId ? Number(data.vatTypeId) : null,
    email: cleanText(data.email),
    phone: cleanText(data.phone),
    address: cleanText(data.address),
    city: cleanText(data.city),
    province: cleanText(data.province),
    postalCode: cleanText(data.postalCode),
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

async function listCustomers(branchId) {
  return repo.list(branchId);
}

async function createCustomer(data, user) {
  const payload = normalizePayload(data, user);

  if (payload.documentNumber) {
    const exists = await repo.findByDocument(payload.branchId, payload.documentNumber);
    if (exists) throw new AppError('Ya existe un cliente con ese documento', 409);
  }

  return repo.create(payload);
}

async function updateCustomer(id, data, user) {
  const customerId = Number(id);
  if (!customerId) throw new AppError('ID de cliente inválido', 400);

  const current = await repo.findById(customerId);
  if (!current) throw new AppError('Cliente no encontrado', 404);

  const payload = normalizePayload(data, user);

  if (payload.documentNumber) {
    const exists = await repo.findByDocument(payload.branchId, payload.documentNumber, customerId);
    if (exists) throw new AppError('Ya existe un cliente con ese documento', 409);
  }

  await repo.update(customerId, payload);
}

async function removeCustomer(id) {
  const customerId = Number(id);
  if (!customerId) throw new AppError('ID de cliente inválido', 400);

  const current = await repo.findById(customerId);
  if (!current) throw new AppError('Cliente no encontrado', 404);

  await repo.remove(customerId);
}

module.exports = { listCustomers, createCustomer, updateCustomer, removeCustomer };
