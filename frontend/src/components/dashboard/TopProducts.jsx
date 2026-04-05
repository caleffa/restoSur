const CURRENCY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function TopProducts({ products = [], loading }) {
  return (
    <article className="dashboard-card shadow-sm">
      <h3 className="section-title">Top productos del día</h3>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando productos...
        </div>
      ) : products.length === 0 ? (
        <p className="mb-0 text-muted">Sin ventas de productos para hoy.</p>
      ) : (
        <ul className="dashboard-list">
          {products.map((product) => (
            <li key={product.id} className="list-row-split">
              <div>
                <span className="fw-semibold d-block">{product.name}</span>
                <small className="text-muted">{product.quantity} unidades</small>
              </div>
              <span>{CURRENCY.format(product.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default TopProducts;
