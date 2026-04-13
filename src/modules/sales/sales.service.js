const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const salesRepo = require('./sales.repository');
const productRepo = require('../products/products.repository');
const stockRepo = require('../stock/stock.repository');
const recipesRepo = require('../recipes/recipes.repository');
const cashRepo = require('../cash/cash.repository');

function validateSaleId(saleId) {
  if (!Number.isInteger(saleId) || saleId <= 0) {
    throw new AppError('Id de venta inválido', 400);
  }
}

async function createSale(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.createSale({ ...data, userId: user.id }, conn);
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status === 'PAGADA') throw new AppError('No se puede agregar items a una venta PAGADA', 400);

    const selectedArticleId = Number(articleId ?? productId);
    const product = await productRepo.findById(selectedArticleId, conn);
    if (!product || !(product.active === 1 || product.active === true) || !(product.for_sale === 1 || product.for_sale === true)) {
      throw new AppError('Artículo inválido o no disponible para la venta', 400);
    }

    if (product.has_stock === 1 || product.has_stock === true) {
      const recipeItems = await recipesRepo.findActiveItemsByProductIds([selectedArticleId], conn);
      if (recipeItems.length > 0) {
        for (const recipeItem of recipeItems) {
          const requiredQty = Number(quantity) * Number(recipeItem.quantity);
          const current = await stockRepo.findStock(sale.branch_id, Number(recipeItem.article_id), conn);
          if (Number(current?.quantity || 0) < requiredQty) {
            throw new AppError('Stock insuficiente para la receta del artículo', 400);
          }
        }
      } else {
        const current = await stockRepo.findStock(sale.branch_id, selectedArticleId, conn);
        if (Number(current?.quantity || 0) < Number(quantity)) {
          throw new AppError('Stock insuficiente para el artículo', 400);
        }
      }
    }

    await salesRepo.addSaleItem({ saleId, articleId: selectedArticleId, quantity, unitPrice: product.price, notes }, conn);
    await conn.commit();
    return { saleId, articleId: selectedArticleId, quantity };
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

    const paymentMethod = String(paymentData.paymentMethod || 'EFECTIVO').toUpperCase();

    await cashRepo.insertMovement(
      {
        shiftId: shift.id,
        registerId: shift.register_id,
        branchId: sale.branch_id,
        saleId,
        userId: user.id,
        type: 'VENTA',
        amount: total,
        paymentMethod,
        reference: `sale-${saleId}`,
        reason: `Cobro venta ${saleId}`,
        affectsBalance: paymentMethod === 'EFECTIVO',
      },
      conn
    );

    await salesRepo.updateSaleTotalsAndStatus(saleId, total, 'PAGADA', conn);
    await salesRepo.markTableOccupied(sale.table_id, 'LIBRE', conn);

    await conn.commit();
    return { saleId, total, status: 'PAGADA', tableStatus: 'LIBRE' };
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

function validateISODate(value, label) {
  if (!value) return null;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!valid) throw new AppError(`${label} inválida`, 400);
  return value;
}

async function getSalesReport(branchId, rawFilters = {}) {
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new AppError('Sucursal inválida', 400);
  }

  const filters = {
    from: validateISODate(rawFilters.from, 'Fecha desde'),
    to: validateISODate(rawFilters.to, 'Fecha hasta'),
    status: rawFilters.status ? String(rawFilters.status).toUpperCase() : '',
    paymentMethod: rawFilters.paymentMethod ? String(rawFilters.paymentMethod).toUpperCase() : '',
    userId: rawFilters.userId ? Number(rawFilters.userId) : null,
    tableId: rawFilters.tableId ? Number(rawFilters.tableId) : null,
  };

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError('El rango de fechas es inválido', 400);
  }

  const rows = await salesRepo.getSalesReportByBranch(branchId, filters);

  const totals = rows.reduce(
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
      tickets: rows.length,
      totalAmount: 0,
      totalPaid: 0,
      totalOpen: 0,
      totalCanceled: 0,
      totalItems: 0,
    }
  );

  const averageTicket = totals.tickets ? totals.totalAmount / totals.tickets : 0;

  return {
    totals: {
      ...totals,
      averageTicket: Number(averageTicket.toFixed(2)),
    },
    rows,
  };
}

module.exports = {
  createSale,
  addItem,
  updateItem,
  deleteItem,
  requestBill,
  paySale,
  closeSale,
  getSaleDetail,
  getSaleDetailByTable,
  listOpenSales,
  getSalesReport,
};
