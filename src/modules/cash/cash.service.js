const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const repo = require('./cash.repository');

function toAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError('El monto debe ser un número positivo', 400);
  }
  return Number(parsed.toFixed(2));
}

function summarizeMovements(movements = []) {
  //console.log(`[summarizeMovements] Procesando ${movements.length} movimientos`);
  
  const result = movements.reduce(
    (acc, movement) => {
      const amount = Number(movement.amount || 0);
      const affectsBalance = Number(movement.affects_balance) === 1;
      const type = movement.type;
      
      // Debug para cada movimiento
      //console.log(`  - ${type}: $${amount} | affects_balance: ${affectsBalance} | payment: ${movement.paymentMethod}`);
      
      switch (type) {
        case 'VENTA':
          acc.sales += amount;
          if (affectsBalance) {
            acc.cashSales += amount;
            //console.log(`    → Agregado a cashSales: $${acc.cashSales}`);
          }
          break;
        case 'INGRESO':
          acc.incomes += amount;
          break;
        case 'EGRESO':
          acc.expenses += amount;
          break;
        default:
          break;
      }
      return acc;
    },
    { sales: 0, cashSales: 0, incomes: 0, expenses: 0 }
  );
  
  //console.log(`[summarizeMovements] Resultado:`, result);
  return result;
}

async function createRegister(data, user) {
  if (!data?.name?.trim()) throw new AppError('El nombre de caja es obligatorio', 400);
  const branchId = Number(user.branchId || data.branchId);
  const duplicated = await repo.findRegisterByName(branchId, data.name);
  if (duplicated) throw new AppError('Ya existe una caja con ese nombre', 400);

  const created = await repo.createRegister({ branchId, name: data.name, active: data.active ?? true });
  return created;
}

async function updateRegister(id, data, user) {
  if (!data?.name?.trim()) throw new AppError('El nombre de caja es obligatorio', 400);
  const branchId = Number(user.branchId || data.branchId);

  const duplicated = await repo.findRegisterByName(branchId, data.name, id);
  if (duplicated) throw new AppError('Ya existe una caja con ese nombre', 400);

  await repo.updateRegister(id, { name: data.name, active: data.active ?? true });
  return { id };
}

async function deleteRegister(id) {
  if (await repo.registerHasMovements(id)) {
    throw new AppError('No se puede eliminar una caja con movimientos', 400);
  }
  await repo.deleteRegister(id);
  return { id };
}

async function openCash(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const openingBalance = toAmount(data.openingAmount);
    const branchId = Number(user.branchId || data.branchId);
    const userOpenShift = await repo.getOpenShiftByUser(user.id, conn);
    if (userOpenShift) throw new AppError('El usuario ya tiene un turno abierto', 400);

    const openShift = await repo.getOpenShiftByBranch(branchId, conn);
    if (openShift) throw new AppError('Ya existe una caja abierta en la sucursal', 400);

    const shift = await repo.createShift(
      {
        registerId: Number(data.registerId),
        branchId,
        userId: user.id,
        openingBalance,
        openingNote: data.observation,
      },
      conn
    );

    await repo.insertMovement(
      {
        shiftId: shift.id,
        registerId: Number(data.registerId),
        branchId,
        userId: user.id,
        type: 'APERTURA',
        amount: openingBalance,
        affectsBalance: true,
        reason: 'Apertura de caja',
        observation: data.observation,
      },
      conn
    );

    await conn.commit();
    return { shiftId: shift.id };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}


async function resolveReasonForMovement(type, reasonId) {
  if (!reasonId) return null;
  const parsedId = Number(reasonId);
  if (!parsedId) throw new AppError('Motivo inválido', 400);

  const reason = await repo.findCashReasonById(parsedId);
  if (!reason) throw new AppError('Motivo no encontrado', 404);
  if (Number(reason.active) !== 1) throw new AppError('El motivo seleccionado está inactivo', 400);
  if (reason.type !== type) throw new AppError('El motivo no corresponde al tipo de movimiento', 400);
  return reason;
}

async function addManualMovement(type, data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const branchId = Number(user.branchId || data.branchId);
    const shift = await repo.getOpenShiftByBranch(branchId, conn);
    if (!shift) throw new AppError('No hay caja abierta', 400);

    const amount = toAmount(data.amount);
    const reason = await resolveReasonForMovement(type, data.reasonId);

    await repo.insertMovement(
      {
        shiftId: shift.id,
        registerId: shift.register_id,
        branchId,
        userId: user.id,
        type,
        amount,
        affectsBalance: true,
        reason: data.reason || reason?.description || (type === 'INGRESO' ? 'Ingreso manual' : 'Egreso manual'),
        reasonId: reason?.id || null,
        observation: data.observation,
      },
      conn
    );

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function registerSale(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const branchId = Number(user.branchId || data.branchId);
    const shift = await repo.getOpenShiftByBranch(branchId, conn);
    if (!shift) throw new AppError('No hay caja abierta', 400);

    const amount = toAmount(data.amount);
    // Normalizar el método de pago a mayúsculas
    const paymentMethod = String(data.paymentMethod || 'EFECTIVO').toUpperCase().trim();
    const affectsBalance = paymentMethod === 'EFECTIVO';
    
    // Debug: Log para verificar
    //console.log(`[registerSale] Método: ${paymentMethod}, Afecta balance: ${affectsBalance}, Monto: ${amount}`);

    await repo.insertMovement(
      {
        shiftId: shift.id,
        registerId: shift.register_id,
        branchId,
        userId: user.id,
        type: 'VENTA',
        amount,
        paymentMethod,
        saleId: data.saleId || null,
        reference: data.saleId ? `sale-${data.saleId}` : data.reference,
        affectsBalance, // ✅ Esto debe ser true SOLO para efectivo
        reason: 'Venta POS',
        observation: data.observation,
      },
      conn
    );

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function getCurrent(branchId) {
  const shift = await repo.getOpenShiftByBranch(branchId);
  if (!shift) {
    return {
      status: 'CERRADA',
      shift: null,
      totals: { sales: 0, cashSales: 0, incomes: 0, expenses: 0, expectedBalance: 0 },
      movements: [],
    };
  }

  const movements = await repo.getShiftMovements(shift.id);
  const summary = summarizeMovements(movements);
  //console.table(movements);
  const expectedBalance = Number(shift.opening_balance) + summary.cashSales + summary.incomes - summary.expenses;
    return {
    status: 'ABIERTA',
    shift,
    movements,
    totals: {
      ...summary,
      expectedBalance: Number(expectedBalance.toFixed(2)),
      openingBalance: Number(shift.opening_balance),
    },
  };
}

async function closeCash(data, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const branchId = Number(user.branchId || data.branchId);
    const shift = await repo.getOpenShiftByBranch(branchId, conn);
    if (!shift) throw new AppError('No hay caja abierta', 400);

    if (data.realBalance === undefined || data.realBalance === null || data.realBalance === '') {
      throw new AppError('Debe informar el saldo real para cerrar la caja', 400);
    }

    const realBalance = Number(data.realBalance);
    if (!Number.isFinite(realBalance) || realBalance < 0) throw new AppError('Saldo real inválido', 400);

    const movements = await repo.getShiftMovements(shift.id);
    const summary = summarizeMovements(movements);
    const expectedBalance = Number(shift.opening_balance) + summary.cashSales + summary.incomes - summary.expenses;
    const difference = Number((realBalance - expectedBalance).toFixed(2));

    await repo.insertMovement(
      {
        shiftId: shift.id,
        registerId: shift.register_id,
        branchId,
        userId: user.id,
        type: 'CIERRE',
        amount: realBalance,
        affectsBalance: false,
        reason: 'Cierre de caja',
        observation: data.observation,
      },
      conn
    );

    await repo.updateShiftClose(
      {
        shiftId: shift.id,
        realBalance,
        expectedBalance,
        difference,
        closingNote: data.observation,
      },
      conn
    );

    await conn.commit();
    return { shiftId: shift.id, expectedBalance, realBalance, difference, totals: summary };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function reports(filters) {
  const movements = await repo.getMovements(filters);
  const summary = summarizeMovements(movements);
  const differences = await repo.getShifts(filters);

  return {
    totals: {
      sales: Number(summary.sales.toFixed(2)),
      incomes: Number(summary.incomes.toFixed(2)),
      expenses: Number(summary.expenses.toFixed(2)),
      differences: Number(differences.reduce((acc, shift) => acc + Number(shift.difference || 0), 0).toFixed(2)),
      balance: Number((summary.cashSales + summary.incomes - summary.expenses).toFixed(2)),
    },
    movements,
    shifts: differences,
  };
}

module.exports = {
  openCash,
  closeCash,
  addIncome: (data, user) => addManualMovement('INGRESO', data, user),
  addExpense: (data, user) => addManualMovement('EGRESO', data, user),
  registerSale,
  getCurrent,
  movements: (shiftId) => repo.getShiftMovements(shiftId),
  shifts: (filters) => repo.getShifts(filters),
  shiftById: (id) => repo.getShiftById(id),
  reports,
};
