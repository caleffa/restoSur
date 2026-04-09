const numberFormatters = new Map();

function getNumberFormatter(decimals) {
  const key = String(decimals);
  if (!numberFormatters.has(key)) {
    numberFormatters.set(
      key,
      new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    );
  }
  return numberFormatters.get(key);
}

export function formatNumber(value, decimals = 2) {
  const safeValue = Number(value);
  const normalizedValue = Number.isFinite(safeValue) ? safeValue : 0;
  return getNumberFormatter(decimals).format(normalizedValue);
}

export function formatCurrency(value, decimals = 2) {
  return `$${formatNumber(value, decimals)}`;
}
