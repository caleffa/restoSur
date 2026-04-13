import { getTableVisualConfig } from '../utils/tableVisuals';
import TablePlanToken from './TablePlanToken';

const STATUS_STYLES = {
  LIBRE: 'table-card table-free',
  OCUPADA: 'table-card table-busy',
  CUENTA_PEDIDA: 'table-card table-bill',
  CERRADA: 'table-card table-closed',
};

function TableCard({ table, onClick, disabled = false, style = undefined }) {
  const cardClass = STATUS_STYLES[table.status] || 'table-card';
  const tableVisual = getTableVisualConfig(table);

  return (
    <button
      type="button"
      disabled={disabled}
      className={cardClass}
      style={{
        width: tableVisual.width,
        minHeight: tableVisual.height,
        borderRadius: tableVisual.borderRadius,
        ...style,
      }}
      onClick={() => onClick(table)}
      aria-label={`Mesa ${table.name} para ${table.capacity} personas, estado ${table.status}`}
    >
      <TablePlanToken table={table} />
      <span>Área: {table.area_name || 'Sin área'}</span>
      <span>{table.status}</span>
    </button>
  );
}

export default TableCard;
