const STATUS_STYLES = {
  LIBRE: 'table-card table-free',
  OCUPADA: 'table-card table-busy',
  CUENTA_PEDIDA: 'table-card table-bill',
  CERRADA: 'table-card table-closed',
};

function TableCard({ table, onClick, disabled = false, style = undefined }) {
  const cardClass = STATUS_STYLES[table.status] || 'table-card';

  return (
    <button
      type="button"
      disabled={disabled}
      className={cardClass}
      style={style}
      onClick={() => onClick(table)}
      aria-label={`Mesa ${table.name} para ${table.capacity} personas, estado ${table.status}`}
    >
      <strong>{table.name}</strong>
      <span>Capacidad: {table.capacity} personas</span>
      <span>Área: {table.area_name || 'Sin área'}</span>
      <span>{table.status}</span>
    </button>
  );
}

export default TableCard;
