import http from './http';

function unwrap(responseData) {
  if (!responseData) return null;
  if (responseData.ok === false) {
    throw new Error(responseData.message || 'Error de API');
  }
  return responseData.data ?? responseData;
}

function normalizeKitchenOrder(order) {
  return {
    id: Number(order.id),
    saleId: Number(order.saleId ?? order.sale_id),
    saleItemId: Number(order.saleItemId ?? order.sale_item_id),
    branchId: Number(order.branchId ?? order.branch_id),
    tableId: Number(order.tableId ?? order.table_id),
    articleName: order.articleName ?? order.article_name,
    kitchenId: Number(order.kitchenId ?? order.kitchen_id ?? 0) || null,
    kitchenName: order.kitchenName ?? order.kitchen_name ?? null,
    quantity: Number(order.quantity ?? 0),
    status: order.status,
    userId: Number(order.userId ?? order.user_id ?? 0) || null,
    updatedByName: order.updatedByName ?? order.user_name ?? null,
    createdAt: order.createdAt ?? order.created_at ?? order.sentAt ?? order.sent_at,
    updatedAt: order.updatedAt ?? order.updated_at,
  };
}

export async function getKitchenOrders() {
  const { data } = await http.get('/kitchen');
  const payload = unwrap(data);
  return Array.isArray(payload) ? payload.map(normalizeKitchenOrder) : [];
}

export async function updateKitchenOrderStatus(orderId, status) {
  const { data } = await http.patch(`/kitchen/${orderId}`, { status });
  return unwrap(data);
}

export async function getSaleDetail(saleId) {
  const { data } = await http.get(`/sales/${saleId}`);
  return unwrap(data);
}
