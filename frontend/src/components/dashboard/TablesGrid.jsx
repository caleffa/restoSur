function getTableStatusClass(status) {
  if (status === 'LIBRE') return 'table-pill table-free';
  if (status === 'OCUPADA') return 'table-pill table-busy';
  if (status === 'CUENTA_PEDIDA') return 'table-pill table-bill';
  if (status === 'CERRADA') return 'table-pill table-closed';
  return 'table-pill';
}

function getActionLabel(status) {
  if (status === 'LIBRE') return 'Abrir venta';
  if (status === 'CERRADA') return 'En cierre';
  return 'Abrir POS';
}

function TablesGrid({ tables = [], loading, busyTableId, onTableClick }) {
  return (
    <article className="dashboard-card shadow-sm">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="section-title mb-0">Estado de mesas</h3>
        <small className="text-muted">Actualización automática cada 5 segundos</small>
      </div>

      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando mesas...
        </div>
      ) : tables.length === 0 ? (
        <p className="mb-0 text-muted">No hay mesas disponibles.</p>
      ) : (
        <div className="tables-grid dashboard-tables-grid">
          {tables.map((table) => (
            <button
              key={table.id}
              type="button"
              className={`dashboard-table-btn ${getTableStatusClass(table.status)}`}
              onClick={() => onTableClick(table)}
              disabled={busyTableId === table.id}
            >
              <span className="fw-semibold">{table.name}</span>
              <span className="small">Capacidad: {table.capacity} personas</span>
              <span className="small">{table.status}</span>
              <span className="small mt-2">{busyTableId === table.id ? 'Procesando...' : getActionLabel(table.status)}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export default TablesGrid;
