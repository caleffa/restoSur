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

export function normalizeTableType(value) {
  const normalized = String(value || '').toUpperCase();
  return TABLE_TYPE_LABELS[normalized] ? normalized : 'CUADRADA';
}

export function getTableTypeLabel(value) {
  const normalized = normalizeTableType(value);
  return TABLE_TYPE_LABELS[normalized];
}

export function getTableSizeByCapacity(capacity) {
  const seats = Number(capacity) > 0 ? Number(capacity) : 1;
  if (seats <= 4) return 110;
  if (seats <= 6) return 130;
  if (seats <= 8) return 150;
  return 170;
}

export function getTableVisualConfig(table) {
  const type = normalizeTableType(table?.table_type);
  const baseSize = getTableSizeByCapacity(table?.capacity);

  if (type === 'REDONDA') {
    return { type, width: baseSize, height: baseSize, borderRadius: '999px' };
  }

  if (type === 'RECTANGULAR_HORIZONTAL') {
    return { type, width: Math.round(baseSize * 1.5), height: Math.round(baseSize * 0.72), borderRadius: '14px' };
  }

  if (type === 'RECTANGULAR_VERTICAL') {
    return { type, width: Math.round(baseSize * 0.72), height: Math.round(baseSize * 1.5), borderRadius: '14px' };
  }

  return { type: 'CUADRADA', width: baseSize, height: baseSize, borderRadius: '14px' };
}
