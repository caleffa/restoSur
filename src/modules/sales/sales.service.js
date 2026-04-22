const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const salesRepo = require('./sales.repository');
const productRepo = require('../products/products.repository');
const stockRepo = require('../stock/stock.repository');
const recipesRepo = require('../recipes/recipes.repository');
const cashRepo = require('../cash/cash.repository');
const invoicesRepo = require('../invoices/invoices.repository');
const { logError, logInfo } = require('../../utils/logger');

function validateSaleId(saleId) {
  if (!Number.isInteger(saleId) || saleId <= 0) {
    throw new AppError('Id de venta inválido', 400);
  }
}

const ALLOWED_PAYMENT_METHODS = new Set(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']);

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizePaymentSplits(total, paymentData = {}) {
  const rawSplits = Array.isArray(paymentData.paymentSplits) ? paymentData.paymentSplits : [];

  if (!rawSplits.length) {
    const paymentMethod = String(paymentData.paymentMethod || 'EFECTIVO').toUpperCase();
    if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
      throw new AppError('Método de pago inválido', 400);
    }
    return [{ paymentMethod, amount: roundMoney(total) }];
  }

  const normalizedSplits = rawSplits.map((entry) => ({
    paymentMethod: String(entry?.paymentMethod || '').toUpperCase(),
    amount: roundMoney(entry?.amount),
  }));

  if (!normalizedSplits.length) {
    throw new AppError('Debe seleccionar al menos un medio de pago', 400);
  }

  for (const split of normalizedSplits) {
    if (!ALLOWED_PAYMENT_METHODS.has(split.paymentMethod)) {
      throw new AppError('Método de pago inválido en división', 400);
    }
    if (!Number.isFinite(split.amount) || split.amount <= 0) {
      throw new AppError('Los montos de la división deben ser mayores a 0', 400);
    }
  }

  const splitSum = roundMoney(normalizedSplits.reduce((acc, item) => acc + Number(item.amount || 0), 0));
  if (splitSum !== roundMoney(total)) {
    throw new AppError('La suma de subtotales debe ser igual al total', 400);
  }

  return normalizedSplits;
}

async function createSale(data, user) {
  const hasExplicitWaiter = data.waiterId !== undefined && data.waiterId !== null && `${data.waiterId}`.trim() !== '';
  const requestedWaiterId = hasExplicitWaiter ? Number(data.waiterId) : null;

  if (hasExplicitWaiter && (!Number.isInteger(requestedWaiterId) || requestedWaiterId <= 0)) {
    throw new AppError('Mozo inválido', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let assignedUserId = Number(user.id);

    if (hasExplicitWaiter) {
      const waiter = await salesRepo.findWaiterById(Number(user.branchId), requestedWaiterId, conn);
      if (!waiter) {
        throw new AppError('El mozo seleccionado no es válido para esta sucursal', 400);
      }
      assignedUserId = requestedWaiterId;
    } else if (user.role === 'MOZO') {
      const selfWaiter = await salesRepo.findWaiterById(Number(user.branchId), Number(user.id), conn);
      if (!selfWaiter) {
        throw new AppError('El mozo seleccionado no es válido para esta sucursal', 400);
      }
    }

    const sale = await salesRepo.createSale({ ...data, userId: assignedUserId }, conn);
    await salesRepo.markTableOccupied(data.tableId, 'OCUPADA', conn);
    await conn.commit();
    return sale;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function addItem(saleId, { productId, articleId, quantity, notes }) {
  validateSaleId(saleId);
  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new AppError('Cantidad inválida', 400);
  }
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status === 'PAGADA') throw new AppError('No se puede agregar items a una venta PAGADA', 400);

    const selectedArticleId = Number(articleId ?? productId);
    const product = await productRepo.findById(selectedArticleId, conn);
    if (
      !product 
      || !(product.active === 1 || product.active === true)
      || !(product.for_sale === 1 || product.for_sale === true)
      
    ) {
      throw new AppError('Artículo inválido o no disponible para la venta', 400);
    }

    if (product.has_stock === 1 || product.has_stock === true) {
      const recipeItems = await recipesRepo.findActiveItemsByProductIds([selectedArticleId], conn);
      if (recipeItems.length > 0) {
        for (const recipeItem of recipeItems) {
          const requiredQty = normalizedQuantity * Number(recipeItem.quantity);
          const current = await stockRepo.findStock(sale.branch_id, Number(recipeItem.article_id), conn);
          if (Number(current?.quantity || 0) < requiredQty) {
            throw new AppError('Stock insuficiente para la receta del artículo', 400);
          }
        }
      } else {
        const current = await stockRepo.findStock(sale.branch_id, selectedArticleId, conn);
        if (Number(current?.quantity || 0) < normalizedQuantity) {
          throw new AppError('Stock insuficiente para el artículo', 400);
        }
      }
    }

    const createdItem = await salesRepo.addSaleItem(
      { saleId, articleId: selectedArticleId, quantity: normalizedQuantity, unitPrice: product.price, notes },
      conn
    );
    await conn.commit();
    return {
      id: createdItem.id,
      saleId,
      articleId: selectedArticleId,
      articleName: product.name,
      categoryId: Number(product.category_id ?? product.categoryId ?? 0),
      isProduct: product.is_product === 1 || product.is_product === true || product.isProduct === true,
      unitPrice: Number(product.price),
      quantity: normalizedQuantity,
      kitchenStatus: product.is_product === 1 || product.is_product === true || product.isProduct === true
        ? 'PENDIENTE'
        : 'SIN_COMANDA',
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function updateItem(itemId, { quantity }) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new AppError('Id de item inválido', 400);
  }

  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new AppError('Cantidad inválida', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const item = await salesRepo.findSaleItemById(itemId, conn);
    if (!item) throw new AppError('Item de venta no encontrado', 404);
    if (item.sale_status === 'PAGADA') {
      throw new AppError('No se puede editar un item de una venta PAGADA', 400);
    }

    await salesRepo.updateSaleItemQuantity(itemId, normalizedQuantity, conn);
    await conn.commit();

    return {
      id: itemId,
      saleId: item.sale_id,
      quantity: normalizedQuantity,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function deleteItem(itemId) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new AppError('Id de item inválido', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const item = await salesRepo.findSaleItemById(itemId, conn);
    if (!item) throw new AppError('Item de venta no encontrado', 404);
    if (item.sale_status === 'PAGADA') {
      throw new AppError('No se puede eliminar un item de una venta PAGADA', 400);
    }

    await salesRepo.deleteSaleItemById(itemId, conn);
    await conn.commit();

    return {
      id: itemId,
      saleId: item.sale_id,
      deleted: true,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function requestBill(saleId) {
  validateSaleId(saleId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status !== 'ABIERTA') throw new AppError('Solo se puede pedir cuenta para ventas ABIERTAS', 400);

    await salesRepo.markTableOccupied(sale.table_id, 'CUENTA_PEDIDA', conn);
    await conn.commit();

    return { saleId, tableId: sale.table_id, tableStatus: 'CUENTA_PEDIDA' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function paySale(saleId, user, paymentData = {}) {
  validateSaleId(saleId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status === 'PAGADA') throw new AppError('La venta ya está pagada', 400);

    const items = await salesRepo.listItemsBySale(saleId, conn);
    if (!items.length) throw new AppError('No permitir cobrar venta sin items', 400);

    const shift = await cashRepo.getOpenShiftByBranch(sale.branch_id, conn);
    if (!shift) throw new AppError('Debe existir caja abierta para cobrar', 400);

    const total = items.reduce((acc, it) => acc + Number(it.quantity) * Number(it.unit_price), 0);

    const recipeItems = await recipesRepo.findActiveItemsByProductIds(
      [...new Set(items.map((item) => Number(item.article_id)))],
      conn
    );

    const recipeByProduct = new Map();
    for (const recipeItem of recipeItems) {
      const productId = Number(recipeItem.product_id);
      const productRecipe = recipeByProduct.get(productId) || [];
      productRecipe.push(recipeItem);
      recipeByProduct.set(productId, productRecipe);
    }

    const requiredByArticle = new Map();
    for (const item of items) {
      const itemArticleId = Number(item.article_id);
      const productRecipes = recipeByProduct.get(itemArticleId) || [];

      if (productRecipes.length > 0) {
        for (const recipeItem of productRecipes) {
          const articleId = Number(recipeItem.article_id);
          const requiredQty = Number(item.quantity) * Number(recipeItem.quantity);
          const accumulated = requiredByArticle.get(articleId) || 0;
          requiredByArticle.set(articleId, Number((accumulated + requiredQty).toFixed(3)));
        }
      } else if (item.has_stock === 1 || item.has_stock === true) {
        const requiredQty = Number(item.quantity);
        const accumulated = requiredByArticle.get(itemArticleId) || 0;
        requiredByArticle.set(itemArticleId, Number((accumulated + requiredQty).toFixed(3)));
      }
    }

    for (const [articleId, requiredQty] of requiredByArticle.entries()) {
      const current = await stockRepo.findStock(sale.branch_id, articleId, conn);
      const currentQty = Number(current?.quantity || 0);
      if (currentQty < requiredQty) {
        throw new AppError(`Stock insuficiente para artículo ID ${articleId}`, 400);
      }
    }

    for (const [articleId, requiredQty] of requiredByArticle.entries()) {
      await stockRepo.decreaseStock(sale.branch_id, articleId, requiredQty, conn);
      await stockRepo.insertMovement(
        {
          branchId: sale.branch_id,
          articleId,
          userId: user.id,
          type: 'EGRESO',
          quantity: requiredQty,
          reason: `Descuento por venta ${saleId}`,
        },
        conn
      );
    }

    const paymentSplits = normalizePaymentSplits(total, paymentData);

    for (const split of paymentSplits) {
      await cashRepo.insertMovement(
        {
          shiftId: shift.id,
          registerId: shift.register_id,
          branchId: sale.branch_id,
          saleId,
          userId: user.id,
          type: 'VENTA',
          amount: split.amount,
          paymentMethod: split.paymentMethod,
          reference: `sale-${saleId}`,
          reason: `Cobro venta ${saleId}`,
          affectsBalance: split.paymentMethod === 'EFECTIVO',
        },
        conn
      );
    }

    await salesRepo.updateSaleTotalsAndStatus(saleId, total, 'PAGADA', conn);
    await salesRepo.markTableOccupied(sale.table_id, 'LIBRE', conn);

    await conn.commit();
    return { saleId, total, status: 'PAGADA', tableStatus: 'LIBRE', paymentSplits };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function closeSale(saleId) {
  validateSaleId(saleId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status !== 'PAGADA') {
      throw new AppError('Debe registrar el pago antes de cerrar la venta', 400);
    }

    await salesRepo.markTableOccupied(sale.table_id, 'LIBRE', conn);

    await conn.commit();
    return {
      saleId,
      status: 'CLOSED',
      tableStatus: 'LIBRE',
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}


async function openDrawer(saleId, user, payload = {}) {
  validateSaleId(saleId);

  const sale = await salesRepo.findSaleById(saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);

  if (Number(sale.branch_id) !== Number(user.branchId)) {
    throw new AppError('La venta no pertenece a la sucursal del usuario', 403);
  }

  if (sale.status !== 'PAGADA') {
    throw new AppError('Solo se puede abrir el cajón luego de cobrar la venta', 400);
  }

  const signalUrl = process.env.CASH_DRAWER_SIGNAL_URL;
  if (!signalUrl) {
    return { triggered: false, reason: 'CASH_DRAWER_SIGNAL_URL no configurada' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(signalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        saleId,
        branchId: Number(sale.branch_id),
        userId: Number(user.id),
        paymentMethod: payload.paymentMethod || 'EFECTIVO',
        cashReceived: payload.cashReceived ?? null,
        changeAmount: payload.changeAmount ?? null,
        source: 'POS',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('Error al enviar señal de apertura de cajón', { saleId, status: response.status, body: errorText });
      throw new AppError('No se pudo enviar la señal para abrir el cajón', 502);
    }

    logInfo('Señal para abrir cajón enviada correctamente', { saleId, signalUrl });
    return { triggered: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logError('Fallo de comunicación al abrir cajón', { saleId, message: error.message });
    throw new AppError('No se pudo enviar la señal para abrir el cajón', 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function cancelSale(saleId) {
  validateSaleId(saleId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status !== 'ABIERTA') {
      throw new AppError('Solo se puede cancelar una venta ABIERTA', 400);
    }

    const invoice = await invoicesRepo.findBySaleId(saleId);
    if (invoice) {
      throw new AppError('No se puede cancelar una venta facturada', 400);
    }

    await salesRepo.deleteKitchenOrdersBySaleId(saleId, conn);
    await salesRepo.deleteItemsBySaleId(saleId, conn);
    await salesRepo.cancelSaleById(saleId, conn);
    await salesRepo.markTableOccupied(sale.table_id, 'LIBRE', conn);

    await conn.commit();
    return {
      saleId,
      status: 'CANCELADA',
      tableStatus: 'LIBRE',
      itemsRemoved: true,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getSaleDetail(saleId) {
  validateSaleId(saleId);
  const sale = await salesRepo.findSaleById(saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  const items = await salesRepo.listItemsBySale(saleId);
  return { ...sale, items };
}

async function getSaleDetailByTable(tableId) {
  if (!Number.isInteger(tableId) || tableId <= 0) {
    throw new AppError('Id de mesa inválido', 400);
  }

  const sale = await salesRepo.findOpenSaleByTable(tableId);
  if (!sale) {
    throw new AppError('La mesa no tiene una venta ABIERTA', 404);
  }

  const items = await salesRepo.listItemsBySale(sale.id);
  return { ...sale, items };
}

async function listOpenSales(branchId) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  return salesRepo.listOpenSalesByBranch(branchId);
}

async function listWaiters(branchId) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  return salesRepo.listWaitersByBranch(branchId);
}

async function reassignWaiter(saleId, waiterId, branchId) {
  validateSaleId(saleId);

  const normalizedWaiterId = Number(waiterId);
  if (!Number.isInteger(normalizedWaiterId) || normalizedWaiterId <= 0) {
    throw new AppError('Mozo inválido', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (Number(sale.branch_id) !== Number(branchId)) {
      throw new AppError('No autorizado para cambiar el mozo de esta venta', 403);
    }
    if (sale.status !== 'ABIERTA') {
      throw new AppError('Solo se puede cambiar el mozo en ventas ABIERTAS', 400);
    }

    const waiter = await salesRepo.findWaiterById(Number(branchId), normalizedWaiterId, conn);
    if (!waiter) {
      throw new AppError('El mozo seleccionado no es válido para esta sucursal', 400);
    }

    await salesRepo.updateSaleWaiter(saleId, normalizedWaiterId, conn);
    await conn.commit();

    return {
      saleId,
      waiterId: normalizedWaiterId,
      waiterName: waiter.name,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

function validateISODate(value, label) {
  if (!value) return null;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!valid) throw new AppError(`${label} inválida`, 400);
  return value;
}

function toNumberOrNull(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getSalesReport(branchId, rawFilters = {}) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  const maxPageSize = rawFilters.forExport ? 5000 : 200;
  const filters = {
    from: validateISODate(rawFilters.from, 'Fecha desde'),
    to: validateISODate(rawFilters.to, 'Fecha hasta'),
    status: rawFilters.status ? String(rawFilters.status).toUpperCase() : '',
    paymentMethod: rawFilters.paymentMethod ? String(rawFilters.paymentMethod).toUpperCase() : '',
    userId: toNumberOrNull(rawFilters.userId),
    tableId: toNumberOrNull(rawFilters.tableId),
    page: Math.max(1, Number(rawFilters.page) || 1),
    pageSize: Math.min(maxPageSize, Math.max(10, Number(rawFilters.pageSize) || 50)),
    search: String(rawFilters.search || '').trim(),
    sortBy: String(rawFilters.sortBy || 'date'),
    sortDirection: String(rawFilters.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError('El rango de fechas es inválido', 400);
  }

  const [result, totalsRows] = await Promise.all([
    salesRepo.getSalesReportByBranch(branchId, filters),
    salesRepo.getSalesTotalsByBranch(branchId, filters),
  ]);
  const rows = result.rows || [];

  const totals = totalsRows.reduce(
    (acc, row) => {
      const amount = Number(row.total || 0);
      const qty = Number(row.itemsQty || 0);
      acc.totalAmount += amount;
      acc.totalItems += qty;
      if (row.status === 'PAGADA') acc.totalPaid += amount;
      if (row.status === 'ABIERTA') acc.totalOpen += amount;
      if (row.status === 'CANCELADA') acc.totalCanceled += amount;
      return acc;
    },
    {
      tickets: totalsRows.length,
      totalAmount: 0,
      totalPaid: 0,
      totalOpen: 0,
      totalCanceled: 0,
      totalItems: 0,
    }
  );

  const averageTicket = totals.tickets ? totals.totalAmount / totals.tickets : 0;

  return {
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalRecords: result.totalRecords,
      totalPages: Math.max(1, Math.ceil(Number(result.totalRecords || 0) / filters.pageSize)),
    },
    totals: {
      ...totals,
      averageTicket: Number(averageTicket.toFixed(2)),
    },
    rows,
  };
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildSalesCsv(reportData) {
  const header = [
    'ID Venta',
    'Fecha',
    'Mesa',
    'Vendedor',
    'Items',
    'Metodo Pago',
    'Estado',
    'Total',
  ];

  const lines = [header.join(',')];
  for (const row of reportData.rows || []) {
    lines.push([
      row.id,
      row.paidAt || row.openedAt || '',
      row.tableNumber,
      row.userName,
      Number(row.itemsQty || 0),
      row.paymentMethod,
      row.status,
      Number(row.total || 0).toFixed(2),
    ].map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

async function exportSalesReportCsv(branchId, rawFilters = {}) {
  const reportData = await getSalesReport(branchId, {
    ...rawFilters,
    page: 1,
    pageSize: 5000,
    forExport: true,
  });
  return buildSalesCsv(reportData);
}

async function getVatSalesBook(branchId, rawFilters = {}) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }
  const filters = {
    from: validateISODate(rawFilters.from, 'Fecha desde'),
    to: validateISODate(rawFilters.to, 'Fecha hasta'),
    invoiceType: rawFilters.invoiceType ? String(rawFilters.invoiceType).toUpperCase() : '',
  };
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError('El rango de fechas es inválido', 400);
  }

  const rows = await salesRepo.getVatSalesBookByBranch(branchId, filters);
  const totals = rows.reduce((acc, row) => {
    acc.total += Number(row.total || 0);
    acc.netAmount += Number(row.netAmount || 0);
    acc.vat21 += Number(row.vat21 || 0);
    return acc;
  }, { total: 0, netAmount: 0, vat21: 0, vouchers: rows.length });

  return { rows, totals };
}

function normalizeReportType(reportType) {
  const normalized = String(reportType || 'PLATOS').toUpperCase();
  if (['PLATOS', 'MOZOS', 'ARTICULOS'].includes(normalized)) return normalized;
  throw new AppError('Tipo de reporte inválido', 400);
}

async function getSalesInsightsReport(branchId, rawFilters = {}) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  const filters = {
    reportType: normalizeReportType(rawFilters.reportType),
    from: validateISODate(rawFilters.from, 'Fecha desde'),
    to: validateISODate(rawFilters.to, 'Fecha hasta'),
    status: rawFilters.status ? String(rawFilters.status).toUpperCase() : 'PAGADA',
    paymentMethod: rawFilters.paymentMethod ? String(rawFilters.paymentMethod).toUpperCase() : '',
    waiterId: toNumberOrNull(rawFilters.waiterId),
    limit: Math.min(100, Math.max(5, Number(rawFilters.limit) || 20)),
  };

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError('El rango de fechas es inválido', 400);
  }

  const reportLoaders = {
    PLATOS: () => salesRepo.getTopDishesByBranch(branchId, filters),
    ARTICULOS: () => salesRepo.getTopArticlesByBranch(branchId, filters),
    MOZOS: () => salesRepo.getTopWaitersByBranch(branchId, filters),
  };

  const rows = await reportLoaders[filters.reportType]();
  const totals = rows.reduce((acc, row) => {
    acc.totalQty += Number(row.totalQty || 0);
    acc.totalAmount += Number(row.totalAmount || 0);
    acc.totalTickets += Number(row.tickets || 0);
    return acc;
  }, { totalQty: 0, totalAmount: 0, totalTickets: 0, rows: rows.length });

  return {
    reportType: filters.reportType,
    rows,
    totals,
  };
}

function buildInsightsCsv(reportData = {}) {
  const type = String(reportData.reportType || 'PLATOS').toUpperCase();
  if (type === 'MOZOS') {
    const lines = [['ID Mozo', 'Mozo', 'Tickets', 'Artículos', 'Total Venta'].join(',')];
    for (const row of reportData.rows || []) {
      lines.push([
        row.id,
        row.name,
        Number(row.tickets || 0),
        Number(row.totalQty || 0),
        Number(row.totalAmount || 0).toFixed(2),
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  const lines = [['ID Artículo', 'Nombre', 'Cantidad', 'Tickets', 'Total Venta'].join(',')];
  for (const row of reportData.rows || []) {
    lines.push([
      row.id,
      row.name,
      Number(row.totalQty || 0),
      Number(row.tickets || 0),
      Number(row.totalAmount || 0).toFixed(2),
    ].map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

async function exportSalesInsightsCsv(branchId, rawFilters = {}) {
  const reportData = await getSalesInsightsReport(branchId, rawFilters);
  return buildInsightsCsv(reportData);
}

module.exports = {
  createSale,
  addItem,
  updateItem,
  deleteItem,
  requestBill,
  paySale,
  closeSale,
  openDrawer,
  cancelSale,
  getSaleDetail,
  getSaleDetailByTable,
  listOpenSales,
  listWaiters,
  reassignWaiter,
  getSalesReport,
  exportSalesReportCsv,
  getVatSalesBook,
  getSalesInsightsReport,
  exportSalesInsightsCsv,
};
