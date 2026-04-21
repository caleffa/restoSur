const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const repo = require('./purchaseOrders.repository');

const OPEN_STATUSES = new Set(['EMITIDA', 'RECEPCION_PARCIAL']);
const CLOSED_STATUSES = new Set(['RECIBIDA_TOTAL', 'CERRADA_CON_DIFERENCIAS', 'CANCELADA']);

function normalizePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${label} inválido`, 400);
  }
  return num;
}

function normalizePositiveNumber(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(`${label} inválida`, 400);
  }
  return num;
}

function normalizeNonNegativeNumber(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new AppError(`${label} inválido`, 400);
  }
  return num;
}

function normalizeCreatePayload(data, user) {
  const branchId = normalizePositiveInt(data.branchId || user.branchId, 'Sucursal');
  const supplierId = normalizePositiveInt(data.supplierId, 'Proveedor');
  const notes = String(data.notes || '').trim() || null;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (!rawItems.length) throw new AppError('Debe incluir al menos un artículo', 400);

  const dedup = new Map();
  for (const item of rawItems) {
    const articleId = normalizePositiveInt(item.articleId, 'Artículo');
    const quantity = normalizePositiveNumber(item.quantity, 'Cantidad');
    const unitCost = normalizeNonNegativeNumber(item.unitCost, 'Costo unitario');

    if (dedup.has(articleId)) {
      throw new AppError('No se puede repetir el mismo artículo en la orden de compra', 400);
    }
    dedup.set(articleId, { articleId, quantity, unitCost });
  }

  return {
    branchId,
    supplierId,
    notes,
    items: Array.from(dedup.values()),
  };
}

function normalizeReceiptPayload(data) {
  const notes = String(data.notes || '').trim() || null;
  const supplierDocumentNumber = String(
    data.supplierDocumentNumber || data.receiptNumber || data.invoiceNumber || ''
  ).trim() || null;
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (!rawItems.length) {
    throw new AppError('Debe indicar al menos un artículo para recepcionar', 400);
  }

  const normalized = new Map();
  for (const item of rawItems) {
    const articleId = normalizePositiveInt(item.articleId, 'Artículo');
    const quantity = normalizePositiveNumber(item.quantityReceived ?? item.quantity, 'Cantidad a recepcionar');
    const unitCostRaw = item.unitCost;
    const unitCost = unitCostRaw === undefined || unitCostRaw === null || unitCostRaw === ''
      ? null
      : normalizeNonNegativeNumber(unitCostRaw, 'Costo unitario');

    if (normalized.has(articleId)) {
      throw new AppError('No se puede repetir el mismo artículo en una recepción', 400);
    }
    normalized.set(articleId, { articleId, quantityReceived: quantity, unitCost });
  }

  return {
    notes,
    supplierDocumentNumber,
    items: Array.from(normalized.values()),
  };
}

function summarizeOrder(order, items, receipts) {
  const hydratedItems = items.map((item) => {
    const ordered = Number(item.quantity_ordered);
    const received = Number(item.quantity_received);
    const unitCost = Number(item.unit_cost || 0);
    const pending = Math.max(0, ordered - received);
    return {
      ...item,
      quantity_ordered: ordered,
      quantity_received: received,
      quantity_pending: pending,
      unit_cost: unitCost,
      line_total: ordered * unitCost,
    };
  });

  const totalCost = hydratedItems.reduce((acc, item) => acc + Number(item.line_total || 0), 0);

  return {
    ...order,
    items: hydratedItems,
    receipts,
    total_cost: totalCost,
  };
}

async function list(branchId) {
  return repo.list(normalizePositiveInt(branchId, 'Sucursal'));
}

async function getById(id, branchId) {
  const conn = await pool.getConnection();
  try {
    const orderId = normalizePositiveInt(id, 'Orden de compra');
    const normalizedBranchId = normalizePositiveInt(branchId, 'Sucursal');

    const order = await repo.findById(orderId, conn);
    if (!order || Number(order.branch_id) !== normalizedBranchId) {
      throw new AppError('Orden de compra no encontrada', 404);
    }

    const [items, receipts] = await Promise.all([
      repo.listItems(orderId, conn),
      repo.listReceipts(orderId, conn),
    ]);

    return summarizeOrder(order, items, receipts);
  } finally {
    conn.release();
  }
}

async function create(data, user) {
  const payload = normalizeCreatePayload(data, user);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const orderId = await repo.insertOrder(payload, conn);
    await repo.insertOrderItems(orderId, payload.items, conn);

    await conn.commit();
    return { id: orderId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function receive(orderId, data, user) {
  const normalizedOrderId = normalizePositiveInt(orderId, 'Orden de compra');
  const branchId = normalizePositiveInt(user.branchId, 'Sucursal');
  const payload = normalizeReceiptPayload(data);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const order = await repo.findById(normalizedOrderId, conn, { forUpdate: true });
    if (!order || Number(order.branch_id) !== branchId) {
      throw new AppError('Orden de compra no encontrada', 404);
    }

    if (CLOSED_STATUSES.has(order.status)) {
      throw new AppError('La orden ya está cerrada y no admite recepciones', 400);
    }
    if (!OPEN_STATUSES.has(order.status)) {
      throw new AppError('La orden no está disponible para recepción', 400);
    }

    const orderItems = await repo.listItems(normalizedOrderId, conn, { forUpdate: true });
    const orderItemsByArticle = new Map(orderItems.map((item) => [Number(item.article_id), item]));

    const normalizedReceiptItems = payload.items.map((item) => {
      const orderItem = orderItemsByArticle.get(item.articleId);
      if (!orderItem) {
        throw new AppError('Uno de los artículos no pertenece a la orden de compra', 400);
      }

      const ordered = Number(orderItem.quantity_ordered);
      const alreadyReceived = Number(orderItem.quantity_received);
      const pending = ordered - alreadyReceived;
      if (item.quantityReceived > pending) {
        throw new AppError(
          `No puede recepcionar más de lo pendiente para ${orderItem.article_name}. Pendiente: ${pending}`,
          400
        );
      }

      return {
        purchaseOrderItemId: Number(orderItem.id),
        articleId: item.articleId,
        quantityReceived: item.quantityReceived,
        unitCost: item.unitCost === null ? Number(orderItem.unit_cost || 0) : item.unitCost,
      };
    });

    const receiptId = await repo.insertReceipt(
      {
        purchaseOrderId: normalizedOrderId,
        branchId,
        userId: user.id,
        notes: payload.notes,
        supplierDocumentNumber: payload.supplierDocumentNumber,
      },
      conn
    );

    await repo.insertReceiptItems(receiptId, normalizedReceiptItems, conn);

    for (const item of normalizedReceiptItems) {
      await repo.updateOrderItemReceived(item.purchaseOrderItemId, item.quantityReceived, conn);
      await repo.upsertStock(branchId, item.articleId, item.quantityReceived, conn);
      await repo.updateArticleCost(item.articleId, item.unitCost, conn);
      await repo.insertStockMovement(
        {
          branchId,
          articleId: item.articleId,
          userId: user.id,
          quantity: item.quantityReceived,
          reason: `Recepción OC #${normalizedOrderId}`,
        },
        conn
      );
    }

    const updatedItems = await repo.listItems(normalizedOrderId, conn, { forUpdate: true });
    const hasPending = updatedItems.some(
      (item) => Number(item.quantity_received) < Number(item.quantity_ordered)
    );

    await repo.updateOrderStatus(
      normalizedOrderId,
      hasPending ? 'RECEPCION_PARCIAL' : 'RECIBIDA_TOTAL',
      conn,
      hasPending ? {} : { closedAt: new Date() }
    );

    await conn.commit();
    return { receiptId, status: hasPending ? 'RECEPCION_PARCIAL' : 'RECIBIDA_TOTAL' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function closeWithDifferences(orderId, data, user) {
  const normalizedOrderId = normalizePositiveInt(orderId, 'Orden de compra');
  const branchId = normalizePositiveInt(user.branchId, 'Sucursal');
  const closedReason = String(data.closedReason || data.reason || '').trim();

  if (!closedReason) {
    throw new AppError('Debe indicar un motivo de cierre con diferencias', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const order = await repo.findById(normalizedOrderId, conn, { forUpdate: true });
    if (!order || Number(order.branch_id) !== branchId) {
      throw new AppError('Orden de compra no encontrada', 404);
    }

    if (order.status === 'RECIBIDA_TOTAL') {
      throw new AppError('La orden ya está recepcionada en su totalidad', 400);
    }
    if (order.status === 'CERRADA_CON_DIFERENCIAS' || order.status === 'CANCELADA') {
      throw new AppError('La orden ya está cerrada', 400);
    }

    const items = await repo.listItems(normalizedOrderId, conn);
    const hasPending = items.some((item) => Number(item.quantity_received) < Number(item.quantity_ordered));

    if (!hasPending) {
      throw new AppError('La orden no tiene diferencias pendientes', 400);
    }

    await repo.updateOrderStatus(
      normalizedOrderId,
      'CERRADA_CON_DIFERENCIAS',
      conn,
      { closedReason, closedAt: new Date() }
    );

    await conn.commit();
    return { id: normalizedOrderId, status: 'CERRADA_CON_DIFERENCIAS' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  getById,
  create,
  receive,
  closeWithDifferences,
};
