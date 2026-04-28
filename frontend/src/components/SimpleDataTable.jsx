import { useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
function normalize(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

function sortOptions(options) {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
}

function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map((item) => formatCellValue(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function SimpleDataTable({ title, columns, rows, filters = [], pageSize = 8 }) {
  const { td } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);

  const exportableColumns = useMemo(
    () => columns.filter((column) => !column.disableExport),
    [columns],
  );

  const filteredRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch = !searchTerm || columns.some((column) => normalize(column.accessor(row)).includes(searchTerm));
      if (!matchesSearch) return false;

      return filters.every((filter) => {
        const selected = selectedFilters[filter.key] || '';
        if (!selected) return true;
        return String(filter.accessor(row)) === selected;
      });
    });
  }, [rows, columns, filters, search, selectedFilters]);

  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows;

    const nextRows = [...filteredRows];
    const column = columns.find((item) => item.key === sortBy);
    if (!column) return nextRows;

    nextRows.sort((a, b) => {
      const sortAccessor = column.sortAccessor || column.accessor;
      const av = sortAccessor(a);
      const bv = sortAccessor(b);
      if (av === bv) return 0;
      if (sortDirection === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });

    return nextRows;
  }, [filteredRows, sortBy, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const start = (page - 1) * pageSize;
  const paginatedRows = sortedRows.slice(start, start + pageSize);

  const exportRows = useMemo(() => (
    sortedRows.map((row) => exportableColumns.map((column) => {
      const accessor = column.exportAccessor || column.accessor;
      return formatCellValue(accessor ? accessor(row) : '');
    }))
  ), [sortedRows, exportableColumns]);

  const setFilter = (key, value) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSort = (columnKey) => {
    setPage(1);
    if (sortBy !== columnKey) {
      setSortBy(columnKey);
      setSortDirection('asc');
      return;
    }
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const openPrintableWindow = () => {
    const tableHeaders = exportableColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
    const tableRows = exportRows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin: 0 0 12px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows || `<tr><td colspan="${exportableColumns.length}">${td('Sin resultados')}</td></tr>`}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    return printWindow;
  };

  const handlePrint = () => {
    const printWindow = openPrintableWindow();
    if (!printWindow) return;
    printWindow.print();
  };

  const handlePdfExport = () => {
    const printWindow = openPrintableWindow();
    if (!printWindow) return;
    printWindow.print();
  };

  const handleExcelExport = () => {
    const tableHtml = `
      <table>
        <thead>
          <tr>${exportableColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${exportRows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([`\ufeff${tableHtml}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/gi, '-') || 'listado'}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="admin-card simple-data-table">
      <div className="admin-table-toolbar">
        <h3>{title}</h3>
        <input
          type="search"
          placeholder={td('Buscar...')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {filters.length > 0 && (
        <div className="admin-filters-row">
          {filters.map((filter) => (
            <label key={filter.key}>
              {filter.label}
              <select
                value={selectedFilters[filter.key] || ''}
                onChange={(event) => setFilter(filter.key, event.target.value)}
              >
                <option value="">{td('Todos')}</option>
                {sortOptions(filter.options).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      <div className="admin-actions-row admin-export-row">
        <button type="button" className="touch-btn" onClick={handlePrint}>
          {td('Imprimir')}
        </button>
        <button type="button" className="touch-btn" onClick={handlePdfExport}>
          {td('Descargar PDF')}
        </button>
        <button type="button" className="touch-btn" onClick={handleExcelExport}>
          {td('Descargar Excel')}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.sortable ? (
                    <button type="button" className="admin-sort-btn" onClick={() => handleSort(column.key)}>
                      {column.label}
                      {sortBy === column.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length ? (
              paginatedRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={`${row.id}-${column.key}`}>{column.render ? column.render(row) : column.accessor(row)}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">{td('Sin resultados')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination-row">
        <span>
          {td('Mostrando')} {sortedRows.length ? start + 1 : 0}-{Math.min(start + pageSize, sortedRows.length)} {td('de')} {sortedRows.length}
        </span>
        <div className="admin-actions-row">
          <button type="button" className="touch-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {td('Anterior')}
          </button>
          <span>{td('Página')} {page} {td('de')} {totalPages}</span>
          <button type="button" className="touch-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {td('Siguiente')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default SimpleDataTable;
