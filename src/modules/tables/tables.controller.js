const asyncHandler = require('../../middlewares/asyncHandler');
const repo = require('./tables.repository');
const AppError = require('../../utils/appError');

function normalizeCapacity(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Capacidad inválida. Debe ser un número entero mayor a 0.', 400);
  }
  return parsed;
}

function normalizeAreaId(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Área inválida.', 400);
  }
  return parsed;
}

function parseMapLayout(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const list = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  const areaId = normalizeAreaId(req.query.areaId);
  res.json({ ok: true, data: await repo.list(branchId, areaId) });
});
const create = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    branchId: Number(req.body.branchId || req.user.branchId),
    areaId: normalizeAreaId(req.body.areaId),
    capacity: normalizeCapacity(req.body.capacity),
  };
  res.status(201).json({ ok: true, data: await repo.create(payload) });
});
const update = asyncHandler(async (req, res) => {
  await repo.update(Number(req.params.id), {
    ...req.body,
    areaId: normalizeAreaId(req.body.areaId),
    capacity: normalizeCapacity(req.body.capacity),
  });
  res.json({ ok: true });
});

const updateStatus = asyncHandler(async (req, res) => {
  await repo.updateStatus(Number(req.params.id), req.body.status);
  res.json({ ok: true });
});

const remove = asyncHandler(async (req, res) => {
  await repo.remove(Number(req.params.id));
  res.json({ ok: true });
});

const getAreaMap = asyncHandler(async (req, res) => {
  const branchId = Number(req.query.branchId || req.user.branchId);
  const areaId = normalizeAreaId(req.query.areaId);

  if (!areaId) {
    throw new AppError('Debe indicar un área válida.', 400);
  }

  const area = await repo.getAreaById(branchId, areaId);
  if (!area) {
    throw new AppError('Área no encontrada.', 404);
  }

  const tables = await repo.listByArea(branchId, areaId);
  const placedTables = tables.filter((table) => Number.isFinite(Number(table.pos_x)) && Number.isFinite(Number(table.pos_y)));
  const unplacedTables = tables.filter((table) => !(Number.isFinite(Number(table.pos_x)) && Number.isFinite(Number(table.pos_y))));

  res.json({
    ok: true,
    data: {
      area: {
        id: area.id,
        name: area.name,
        mapLayout: parseMapLayout(area.map_layout),
      },
      placedTables,
      unplacedTables,
    },
  });
});

const saveAreaMap = asyncHandler(async (req, res) => {
  const branchId = Number(req.body.branchId || req.user.branchId);
  const areaId = normalizeAreaId(req.body.areaId);
  const placements = Array.isArray(req.body.placements) ? req.body.placements : [];
  const mapLayout = req.body.mapLayout && typeof req.body.mapLayout === 'object'
    ? req.body.mapLayout
    : null;

  if (!areaId) {
    throw new AppError('Debe indicar un área válida.', 400);
  }

  const area = await repo.getAreaById(branchId, areaId);
  if (!area) {
    throw new AppError('Área no encontrada.', 404);
  }

  const normalizedPlacements = placements.map((item) => {
    const tableId = Number(item.tableId);
    const x = Math.max(0, Number(item.x));
    const y = Math.max(0, Number(item.y));

    if (!Number.isInteger(tableId) || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new AppError('El mapa contiene posiciones inválidas.', 400);
    }

    return {
      tableId,
      x: Math.round(x),
      y: Math.round(y),
    };
  });

  await repo.saveMapLayout(branchId, areaId, normalizedPlacements, mapLayout);
  res.json({ ok: true });
});

module.exports = { list, create, update, updateStatus, remove, getAreaMap, saveAreaMap };
