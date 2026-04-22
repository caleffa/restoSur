import { useMemo, useState } from 'react';

const statusClassMap = {
  PENDIENTE: 'text-bg-warning',
  PREPARANDO: 'text-bg-info',
  LISTO: 'text-bg-success',
};

function getTimeFromDateString(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function KitchenOrdersGrid({ orders, loading, onSelectOrder }) {
  const [filters, setFilters] = useState({
    table: '',
    waiter: '',
    dish: '',
    sale: '',
  });

  const filteredOrders = useMemo(() => {
    const normalizedTable = filters.table.trim().toLowerCase();
    const normalizedWaiter = filters.waiter.trim().toLowerCase();
    const normalizedDish = filters.dish.trim().toLowerCase();
    const normalizedSale = filters.sale.trim().toLowerCase();

    return orders.filter((order) => {
      const tableLabel = `${order.tableNumber || order.tableId || ''}`.toLowerCase();
      const waiterLabel = `${order.waiterName || ''}`.toLowerCase();
      const dishLabel = `${order.articleName || ''}`.toLowerCase();
      const saleLabel = `${order.saleId || ''}`.toLowerCase();

      if (normalizedTable && !tableLabel.includes(normalizedTable)) return false;
      if (normalizedWaiter && !waiterLabel.includes(normalizedWaiter)) return false;
      if (normalizedDish && !dishLabel.includes(normalizedDish)) return false;
      if (normalizedSale && !saleLabel.includes(normalizedSale)) return false;
      return true;
    });
  }, [filters, orders]);

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  return (
    <article className="dashboard-card shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
        <h3 className="section-title mb-0">Comandas</h3>
        <span className="badge text-bg-light">{filteredOrders.length} del día</span>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-6 col-lg-3">
          <input className="form-control form-control-sm" placeholder="Filtrar por mesa" value={filters.table} onChange={handleFilterChange('table')} />
        </div>
        <div className="col-6 col-lg-3">
          <input className="form-control form-control-sm" placeholder="Filtrar por mozo" value={filters.waiter} onChange={handleFilterChange('waiter')} />
        </div>
        <div className="col-6 col-lg-3">
          <input className="form-control form-control-sm" placeholder="Filtrar por plato" value={filters.dish} onChange={handleFilterChange('dish')} />
        </div>
        <div className="col-6 col-lg-3">
          <input className="form-control form-control-sm" placeholder="Filtrar por venta" value={filters.sale} onChange={handleFilterChange('sale')} />
        </div>
      </div>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando comandas...
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="mb-0 text-muted">No hay comandas del día con los filtros aplicados.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Mesa</th>
                <th>Mozo</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Venta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} role="button" onClick={() => onSelectOrder(order)}>
                  <td>{getTimeFromDateString(order.createdAt)}</td>
                  <td>{order.tableNumber || order.tableId || '-'}</td>
                  <td>{order.waiterName || '-'}</td>
                  <td>{order.articleName || '-'}</td>
                  <td>{order.quantity}</td>
                  <td>#{order.saleId}</td>
                  <td>
                    <span className={`badge ${statusClassMap[order.status] || 'text-bg-secondary'}`}>{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default KitchenOrdersGrid;
