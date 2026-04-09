const CURRENCY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function SalesList({ sales = [], loading, onSaleClick }) {
  return (
    <article className="dashboard-card shadow-sm">
      <h3 className="section-title">Ventas abiertas</h3>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando ventas...
        </div>
      ) : sales.length === 0 ? (
        <p className="mb-0 text-muted">No hay ventas activas en este momento.</p>
      ) : (
        <ul className="dashboard-list">
          {sales.map((sale) => (
            <li key={sale.id}>
              <button type="button" className="list-row-btn" onClick={() => onSaleClick(sale)}>
                <span className="fw-semibold">Mesa: {sale.tableName}</span>
                <span>{CURRENCY.format(sale.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default SalesList;
