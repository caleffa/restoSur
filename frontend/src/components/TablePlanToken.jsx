import { getTableTypeLabel, normalizeTableType } from '../utils/tableVisuals';

function getSeatPositions(capacity) {
  const seats = Math.max(1, Math.min(Number(capacity) || 1, 12));
  const radius = 34;
  const center = 50;

  return Array.from({ length: seats }, (_, index) => {
    const angle = (Math.PI * 2 * index) / seats - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });
}

function getTableShape(tableType) {
  const normalized = normalizeTableType(tableType);

  if (normalized === 'REDONDA') {
    return <circle cx="50" cy="50" r="19" className="table-plan-board" />;
  }

  if (normalized === 'RECTANGULAR_HORIZONTAL') {
    return <rect x="26" y="38" width="48" height="24" rx="8" className="table-plan-board" />;
  }

  if (normalized === 'RECTANGULAR_VERTICAL') {
    return <rect x="38" y="26" width="24" height="48" rx="8" className="table-plan-board" />;
  }

  return <rect x="31" y="31" width="38" height="38" rx="9" className="table-plan-board" />;
}

function TablePlanToken({ table, compact = false }) {
  const seats = getSeatPositions(table?.capacity);

  return (
    <div className={`table-plan-token ${compact ? 'is-compact' : ''}`}>
      <svg viewBox="0 0 100 100" className="table-plan-svg" aria-hidden="true">
        <circle cx="50" cy="50" r="46" className="table-plan-room" />
        {getTableShape(table?.table_type)}
        {seats.map((seat, idx) => (
          <circle
            key={`${table?.id || 'table'}-seat-${idx}`}
            cx={seat.x}
            cy={seat.y}
            r="5.7"
            className="table-plan-seat"
          />
        ))}
      </svg>

      <div className="table-plan-meta">
        <strong>{table?.name}</strong>
        <small>{getTableTypeLabel(table?.table_type)}</small>
        <small>{table?.capacity} sillas</small>
      </div>
    </div>
  );
}

export default TablePlanToken;
