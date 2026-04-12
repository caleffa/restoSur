import { useMemo, useState } from 'react';

function normalize(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

function SimpleDataTable({ title, columns, rows, filters = [], pageSize = 8 }) {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);

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

  return (
    <section className="admin-card">
      <div className="admin-table-toolbar">
        <h3>{title}</h3>
        <input
          type="search"
          placeholder="Buscar..."
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
                <option value="">Todos</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

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
                <td colSpan={columns.length} className="text-center py-4">Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination-row">
        <span>
          Mostrando {sortedRows.length ? start + 1 : 0}-{Math.min(start + pageSize, sortedRows.length)} de {sortedRows.length}
        </span>
        <div className="admin-actions-row">
          <button type="button" className="touch-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" className="touch-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}

export default SimpleDataTable;
