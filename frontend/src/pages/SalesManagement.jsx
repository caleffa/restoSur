import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import { getSalesReport } from '../services/salesService';

const initialFilters = {
  from: '',
  to: '',
  status: '',
  paymentMethod: '',
};

function formatAmount(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function SalesManagement() {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState({ totals: {}, rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await getSalesReport(nextFilters);
      setReport(data);
      setError('');
    } catch {
      setError('No se pudo cargar el reporte de ventas.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(initialFilters);
  }, [load]);

  const paymentOptions = useMemo(() => {
    const methods = new Set((report.rows || []).map((row) => row.paymentMethod).filter((item) => item && item !== '-'));
    return Array.from(methods).sort().map((value) => ({ value, label: value }));
  }, [report.rows]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <h2>Gestión de ventas</h2>
        <p>Filtrá por rango de fechas y explorá los tickets generados.</p>

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3">
              <label>Desde
                <input
                  type="date"
                  className="form-control"
                  value={filters.from}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                />
              </label>
            </div>
            <div className="col-md-3">
              <label>Hasta
                <input
                  type="date"
                  className="form-control"
                  value={filters.to}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                />
              </label>
            </div>
            <div className="col-md-3">
              <label>Estado
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="ABIERTA">ABIERTA</option>
                  <option value="PAGADA">PAGADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </label>
            </div>
            <div className="col-md-3">
              <label>Método pago
                <select
                  className="form-select"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-3 admin-actions-row">
            <button type="button" className="touch-btn btn-primary" onClick={() => load(filters)} disabled={loading}>
              {loading ? 'Cargando...' : 'Aplicar filtros'}
            </button>
            <button
              type="button"
              className="touch-btn"
              onClick={() => {
                setFilters(initialFilters);
                load(initialFilters);
              }}
              disabled={loading}
            >
              Limpiar
            </button>
          </div>
        </section>

        {error && <p className="error-text">{error}</p>}

        <section className="cash-info-grid">
          <article className="dashboard-card"><p className="kpi-label">Tickets</p><p className="kpi-value">{report.totals?.tickets || 0}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Total vendido</p><p className="kpi-value">{formatAmount(report.totals?.totalAmount)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ventas pagadas</p><p className="kpi-value">{formatAmount(report.totals?.totalPaid)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Promedio ticket</p><p className="kpi-value">{formatAmount(report.totals?.averageTicket)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ítems vendidos</p><p className="kpi-value">{Number(report.totals?.totalItems || 0).toFixed(2)}</p></article>
        </section>

        <SimpleDataTable
          title="Detalle de ventas"
          rows={report.rows || []}
          pageSize={10}
          filters={[
            {
              key: 'status',
              label: 'Estado',
              accessor: (row) => row.status,
              options: [
                { value: 'ABIERTA', label: 'ABIERTA' },
                { value: 'PAGADA', label: 'PAGADA' },
                { value: 'CANCELADA', label: 'CANCELADA' },
              ],
            },
          ]}
          columns={[
            { key: 'id', label: '#', accessor: (row) => row.id, sortable: true },
            { key: 'date', label: 'Fecha', accessor: (row) => row.paidAt || row.openedAt, sortable: true, render: (row) => formatDate(row.paidAt || row.openedAt) },
            { key: 'table', label: 'Mesa', accessor: (row) => row.tableNumber, sortable: true },
            { key: 'user', label: 'Vendedor', accessor: (row) => row.userName, sortable: true },
            { key: 'items', label: 'Ítems', accessor: (row) => Number(row.itemsQty || 0), sortable: true },
            { key: 'paymentMethod', label: 'Pago', accessor: (row) => row.paymentMethod, sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => row.status, sortable: true },
            { key: 'total', label: 'Total', accessor: (row) => Number(row.total || 0), sortable: true, render: (row) => formatAmount(row.total) },
          ]}
        />
      </main>
    </div>
  );
}

export default SalesManagement;
