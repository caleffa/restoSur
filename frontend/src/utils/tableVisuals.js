export const TABLE_TYPE_OPTIONS = [
  { value: 'REDONDA', label: 'Redonda' },
  { value: 'CUADRADA', label: 'Cuadrada' },
  { value: 'RECTANGULAR_HORIZONTAL', label: 'Rectangular horizontal' },
  { value: 'RECTANGULAR_VERTICAL', label: 'Rectangular vertical' },
];

const TABLE_TYPE_LABELS = TABLE_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const BASE_EDGE = 30;
const ROUND_DIAMETER = 45;

export function normalizeTableType(value) {
  const normalized = String(value || '').toUpperCase();
  return TABLE_TYPE_LABELS[normalized] ? normalized : 'CUADRADA';
}

export function getTableTypeLabel(value) {
  const normalized = normalizeTableType(value);
  return TABLE_TYPE_LABELS[normalized];
}

function getRectangularLengthByCapacity(capacity) {
  const seats = Number(capacity) > 0 ? Number(capacity) : 1;

  if (seats <= 4) return BASE_EDGE;
  if (seats <= 6) return BASE_EDGE * 2;

  const growthSteps = Math.ceil((seats - 6) / 2);
  return BASE_EDGE * 2 + growthSteps * BASE_EDGE;
}

export function getTableVisualConfig(table) {
  const type = normalizeTableType(table?.table_type);

  if (type === 'REDONDA') {
    return { type, width: ROUND_DIAMETER, height: ROUND_DIAMETER, borderRadius: '999px' };
  }

  if (type === 'RECTANGULAR_HORIZONTAL') {
    return {
      type,
      width: getRectangularLengthByCapacity(table?.capacity),
      height: BASE_EDGE,
      borderRadius: '8px',
    };
  }

  if (type === 'RECTANGULAR_VERTICAL') {
    return {
      type,
      width: BASE_EDGE,
      height: getRectangularLengthByCapacity(table?.capacity),
      borderRadius: '8px',
    };
  }

  return { type: 'CUADRADA', width: BASE_EDGE, height: BASE_EDGE, borderRadius: '8px' };
}
