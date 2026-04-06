const badgeClass = {
  PENDIENTE: 'text-bg-warning',
  'EN PREPARACIÓN': 'text-bg-info',
  LISTO: 'text-bg-success',
};

function KitchenOrders({ orders }) {
  return (
    <section className="card shadow-sm h-100">
      <div className="card-body d-grid gap-3">
        <h5 className="mb-0">Comandas enviadas</h5>

        <div className="pos-kitchen-scroll">
          {orders.length === 0 ? (
            <p className="text-muted mb-0">No hay comandas para esta mesa.</p>
          ) : (
            <ul className="list-group">
              {orders.map((order) => (
                <li key={order.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <p className="mb-1 fw-semibold">{order.productName}</p>
                    <small className="text-muted">Cant: {order.quantity} · {new Date(order.createdAt || order.timestamp).toLocaleTimeString()}</small>
                  </div>
                  <span className={`badge ${badgeClass[order.status] || 'text-bg-secondary'}`}>{order.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default KitchenOrders;
