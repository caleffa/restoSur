const { pool } = require('../../config/database');
const AppError = require('../../utils/appError');
const repo = require('./cashRegisters.repository');

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

module.exports = {
  listRegisters: (branchId) => repo.listRegisters(branchId),
  createRegister,
  updateRegister,
  deleteRegister,
};
