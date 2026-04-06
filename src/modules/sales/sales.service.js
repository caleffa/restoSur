const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const salesRepo = require('./sales.repository');
const productRepo = require('../products/products.repository');
const stockRepo = require('../stock/stock.repository');
const cashRepo = require('../cash/cash.repository');

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

async function paySale(saleId, user, paymentData = {}) {
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

    await cashRepo.insertMovement(
      {
        shiftId: shift.id,
        registerId: shift.register_id,
        branchId: sale.branch_id,
        saleId,
        userId: user.id,
        type: 'VENTA',
        amount: total,
        paymentMethod: String(paymentData.paymentMethod || 'EFECTIVO').toUpperCase(),
        reference: `sale-${saleId}`,
        reason: `Cobro venta ${saleId}`,
        affectsBalance: String(paymentData.paymentMethod || 'EFECTIVO').toUpperCase() === 'EFECTIVO',
      },
      conn
    );

    await salesRepo.updateSaleTotalsAndStatus(saleId, total, 'PAGADA', conn);
    await salesRepo.markTableOccupied(sale.table_id, 'LIBRE', conn);

    await conn.commit();
    return { saleId, total, status: 'PAGADA' };
  } catch (e) {
    await conn.rollback();
    console.log('Error: '+e);
    throw e;

  } finally {
    conn.release();
  }
}

async function getSaleDetail(saleId) {
  const sale = await salesRepo.findSaleById(saleId);
  if (!sale) throw new AppError('Venta no encontrada', 404);
  const items = await salesRepo.listItemsBySale(saleId);
  return { ...sale, items };
}

module.exports = { createSale, addItem, paySale, getSaleDetail };
