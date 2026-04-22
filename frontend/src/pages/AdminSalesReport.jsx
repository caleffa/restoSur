import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { exportSalesReport, getSalesReport } from '../services/salesService';
import { formatCurrency, formatNumber } from '../utils/formatters';

const initialFilters = {
  from: '',
  to: '',
  status: '',
  paymentMethod: '',
};

const initialPagination = {
  page: 1,
  pageSize: 25,
};

const initialSort = {
  sortBy: 'date',
  sortDirection: 'DESC',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function AdminSalesReport() {
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState(initialPagination);
  const [sort, setSort] = useState(initialSort);
  const [search, setSearch] = useState('');
  const [report, setReport] = useState({ totals: {}, rows: [], pagination: initialPagination });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({
    nextFilters = filters,
    nextPagination = pagination,
    nextSort = sort,
    nextSearch = search,
  } = {}) => {
    setLoading(true);
    try {
      const data = await getSalesReport({
        ...nextFilters,
        page: nextPagination.page,
        pageSize: nextPagination.pageSize,
        search: nextSearch,
        sortBy: nextSort.sortBy,
        sortDirection: nextSort.sortDirection,
      });
      setReport(data);
      setError('');
    } catch {
      setError('No se pudo cargar el reporte de ventas.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, search, sort]);

  useEffect(() => {
    load({
      nextFilters: initialFilters,
      nextPagination: initialPagination,
      nextSort: initialSort,
      nextSearch: '',
    });
  }, [load]);

  const paymentOptions = useMemo(() => {
    const methods = new Set((report.rows || []).map((row) => row.paymentMethod).filter((method) => method && method !== '-'));
    return Array.from(methods).sort().map((value) => ({ value, label: value }));
  }, [report.rows]);

  const totals = report.totals || {};

  const columns = useMemo(() => ([
    {
      key: 'id',
      label: 'Venta',
      accessor: (row) => `#${row.id}`,
      sortable: true,
      sortAccessor: (row) => Number(row.id),
    },
    {
      key: 'date',
      label: 'Fecha',
      accessor: (row) => formatDate(row.date),
      sortable: true,
      sortAccessor: (row) => new Date(row.date).getTime(),
    },
    {
      key: 'waiter',
      label: 'Mozo',
      accessor: (row) => row.waiterName || '-',
      sortable: true,
    },
    {
      key: 'table',
      label: 'Mesa',
      accessor: (row) => row.tableLabel || '-',
    },
    {
      key: 'paymentMethod',
      label: 'Pago',
      accessor: (row) => row.paymentMethod || '-',
    },
    {
      key: 'status',
      label: 'Estado',
      accessor: (row) => row.status || '-',
    },
    {
      key: 'total',
      label: 'Total',
      accessor: (row) => formatCurrency(row.total || 0),
      sortable: true,
      sortAccessor: (row) => Number(row.total || 0),
    },
  ]), []);

  const applyFilters = () => {
    const nextPagination = { ...pagination, page: 1 };
    setPagination(nextPagination);
    load({
      nextFilters: filters,
      nextPagination,
      nextSort: sort,
      nextSearch: search,
    });
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setSearch('');
    setPagination(initialPagination);
    setSort(initialSort);
    load({
      nextFilters: initialFilters,
      nextPagination: initialPagination,
      nextSort: initialSort,
      nextSearch: '',
    });
  };

  const downloadReport = async () => {
    try {
      const blob = await exportSalesReport({
        ...filters,
        search,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `reporte_ventas_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar el reporte de ventas.');
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <h2>Reporte de ventas</h2>

        {error && <p className="text-danger">{error}</p>}

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3">
              <label htmlFor="sales-report-from">Desde</label>
              <input
                id="sales-report-from"
                type="date"
                className="form-control"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="sales-report-to">Hasta</label>
              <input
                id="sales-report-to"
                type="date"
                className="form-control"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="sales-report-status">Estado</label>
              <select
                id="sales-report-status"
                className="form-select"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Todos</option>
                <option value="ABIERTA">Abierta</option>
                <option value="CUENTA_SOLICITADA">Cuenta solicitada</option>
                <option value="PAGADA">Pagada</option>
                <option value="CERRADA">Cerrada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="sales-report-payment">Método de pago</label>
              <select
                id="sales-report-payment"
                className="form-select"
                value={filters.paymentMethod}
                onChange={(event) => setFilters((prev) => ({ ...prev, paymentMethod: event.target.value }))}
              >
                <option value="">Todos</option>
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row g-2 mt-1">
            <div className="col-md-6">
              <label htmlFor="sales-report-search">Buscar</label>
              <input
                id="sales-report-search"
                type="text"
                className="form-control"
                placeholder="Mesa, mozo, comprobante..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="admin-actions-row mt-3">
            <button type="button" className="touch-btn btn-primary" onClick={applyFilters} disabled={loading}>
              {loading ? 'Cargando...' : 'Aplicar filtros'}
            </button>
            <button type="button" className="touch-btn" onClick={resetFilters} disabled={loading}>
              Limpiar
            </button>
            <button type="button" className="touch-btn" onClick={downloadReport} disabled={loading}>
              Exportar CSV
            </button>
          </div>
        </section>

        <section className="cash-info-grid">
          <article className="dashboard-card"><p className="kpi-label">Ventas</p><p className="kpi-value">{formatNumber(totals.count || 0, 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Total vendido</p><p className="kpi-value">{formatCurrency(totals.total || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ticket promedio</p><p className="kpi-value">{formatCurrency(totals.avgTicket || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Items vendidos</p><p className="kpi-value">{formatNumber(totals.items || 0, 0)}</p></article>
        </section>

        <SimpleDataTable
          title="Detalle de ventas"
          columns={columns}
          rows={report.rows || []}
          pageSize={10}
        />
      </main>
    </div>
  );
}

export default AdminSalesReport;
