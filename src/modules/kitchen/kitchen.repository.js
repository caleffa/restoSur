const { query } = require('../../repositories/baseRepository');

async function createKitchenOrder({ saleId, branchId }, conn) {
  const result = await query('INSERT INTO kitchen_orders (sale_id, branch_id, status) VALUES (?, ?, "PENDIENTE")', [saleId, branchId], conn);
  return { id: result.insertId };
}

async function updateSaleItemsAsSent(saleId, conn) {
  await query('UPDATE sale_items SET kitchen_status="ENVIADO" WHERE sale_id = ? AND kitchen_status = "PENDIENTE"', [saleId], conn);
}

async function listPending(branchId) {
  return query('SELECT * FROM kitchen_orders WHERE branch_id=? AND status IN ("PENDIENTE","PREPARANDO") ORDER BY id DESC', [branchId]);
}

async function updateKitchenStatus(id, status) {
  await query('UPDATE kitchen_orders SET status=? WHERE id=?', [status, id]);
}

module.exports = { createKitchenOrder, updateSaleItemsAsSent, listPending, updateKitchenStatus };
