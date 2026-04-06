const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const salesRepo = require('./sales.repository');
const productRepo = require('../products/products.repository');
const stockRepo = require('../stock/stock.repository');
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

async function addItem(saleId, { productId, quantity, notes }) {
  validateSaleId(saleId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sale = await salesRepo.findSaleById(saleId, conn);
    if (!sale) throw new AppError('Venta no encontrada', 404);
    if (sale.status === 'PAGADA') throw new AppError('No se puede agregar items a una venta PAGADA', 400);

    const product = await productRepo.findById(productId, conn);
    if (!product || !product.active) throw new AppError('Producto inválido', 400);

    if (product.has_stock) {
      const current = await stockRepo.findStock(sale.branch_id, productId, conn);
      if (!current || Number(current.quantity) < Number(quantity)) {
        throw new AppError('Stock insuficiente', 400);
      }
    }

    await salesRepo.addSaleItem({ saleId, productId, quantity, unitPrice: product.price, notes }, conn);
    await conn.commit();
    return { saleId, productId, quantity };
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

    for (const item of items) {
      if (item.has_stock) {
        await stockRepo.decreaseStock(sale.branch_id, item.product_id, item.quantity, conn);
        await stockRepo.insertMovement(
          {
            branchId: sale.branch_id,
            productId: item.product_id,
            userId: user.id,
            type: 'EGRESO',
            quantity: item.quantity,
            reason: `Descuento por venta ${saleId}`,
          },
          conn
        );
      }
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
  const sale = await salesRepo.findSaleById(saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  if (sale.status !== 'PAGADA') {
    throw new AppError('Debe registrar el pago antes de cerrar la venta', 400);
  }

  return {
    saleId,
    status: 'CLOSED',
    tableStatus: 'LIBRE',
  };
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

module.exports = {
  createSale,
  addItem,
  requestBill,
  paySale,
  closeSale,
  getSaleDetail,
  getSaleDetailByTable,
  listOpenSales,
};
