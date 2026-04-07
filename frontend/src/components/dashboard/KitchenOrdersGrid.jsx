const statusClassMap = {
  PENDIENTE: 'text-bg-warning',
  PREPARANDO: 'text-bg-info',
  LISTO: 'text-bg-success',
};

function KitchenOrdersGrid({ orders, loading, onSelectOrder }) {
  return (
    <article className="dashboard-card shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
        <h3 className="section-title mb-0">Comandas</h3>
        <span className="badge text-bg-light">{orders.length} activas</span>
      </div>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando comandas...
        </div>
      ) : orders.length === 0 ? (
        <p className="mb-0 text-muted">No hay comandas pendientes o en preparación.</p>
      ) : (
        <ul className="dashboard-list">
          {orders.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                className="list-row-btn"
                onClick={() => onSelectOrder(order)}
              >
                <span>
                  <strong>Comanda #{order.id}</strong>
                  <small className="d-block text-muted">Venta #{order.saleId}</small>
                </span>
                <span className={`badge ${statusClassMap[order.status] || 'text-bg-secondary'}`}>{order.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default KitchenOrdersGrid;
