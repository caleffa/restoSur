import { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Navbar from '../components/Navbar';
import { getProfitReport } from '../services/profitsService';
import { formatCurrency, formatNumber } from '../utils/formatters';

const PERIOD_OPTIONS = [
  { value: 'DIARIO', label: 'Diario' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'TOTAL', label: 'Total histórico' },
];

function formatPercent(value) {
  return `${formatNumber(value, 2)}%`;
}

function formatIsoDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-AR');
}

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = ['#0d6efd', '#198754', '#fd7e14', '#dc3545', '#6f42c1', '#20c997', '#ffc107', '#0dcaf0'];

function buildDoughnutData(items, labelKey, valueKey) {
  if (!items.length) return null;
  return {
    labels: items.map((item) => item[labelKey]),
    datasets: [
      {
        data: items.map((item) => item[valueKey] || 0),
        backgroundColor: CHART_COLORS,
        borderWidth: 1,
      },
    ],
  };
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
};

function downloadCsv(report) {
  const rows = [
    ['Concepto', 'Monto'],
    ['Ventas netas', report?.report?.totals?.netSales || 0],
    ['COGS total', report?.report?.cogs?.total || 0],
    ['Ganancia bruta', report?.report?.grossProfit?.amount || 0],
    ['Gastos operativos', report?.report?.operatingExpenses?.total || 0],
    ['Ganancia neta', report?.report?.netProfit?.amount || 0],
  ];

  const csvContent = rows.map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `reporte_ganancias_${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function AdminProfitReport() {
  const [filters, setFilters] = useState({ period: 'MENSUAL', from: '', to: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await getProfitReport(nextFilters);
      setReport(data);
      setError('');
    } catch {
      setError('No se pudo cargar el reporte de ganancias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reportData = report?.report;
  const operatingRows = useMemo(() => {
    if (!reportData?.operatingExpenses) return [];
    return [
      { label: 'Nómina del personal', value: reportData.operatingExpenses.personal },
      { label: 'Rentas o arrendamiento', value: reportData.operatingExpenses.alquiler },
      { label: 'Servicios públicos', value: reportData.operatingExpenses.servicios },
      { label: 'Mantenimiento de equipos', value: reportData.operatingExpenses.mantenimiento },
      { label: 'Publicidad y marketing', value: reportData.operatingExpenses.marketing },
    ];
  }, [reportData]);

  const topProducts = reportData?.breakdown?.topProducts || [];
  const peakHours = reportData?.breakdown?.bySchedule || [];
  const paymentMethods = reportData?.breakdown?.byChannel || [];
  const categoryBreakdown = reportData?.breakdown?.byCategory || [];
  const categoryChartData = useMemo(
    () => buildDoughnutData(categoryBreakdown, 'category', 'total'),
    [categoryBreakdown],
  );
  const paymentMethodsChartData = useMemo(
    () => buildDoughnutData(paymentMethods, 'channel', 'total'),
    [paymentMethods],
  );
  const operatingExpensesChartData = useMemo(() => {
    const rowsWithValue = operatingRows.filter((item) => (item.value || 0) > 0);
    return buildDoughnutData(rowsWithValue, 'label', 'value');
  }, [operatingRows]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <h2>Reporte de ganancias</h2>
        {error && <p className="text-danger">{error}</p>}

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3">
              <label htmlFor="profit-period">Tipo de reporte</label>
              <select
                id="profit-period"
                className="form-select"
                value={filters.period}
                onChange={(event) => setFilters((prev) => ({ ...prev, period: event.target.value }))}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="profit-from">Desde</label>
              <input
                id="profit-from"
                type="date"
                className="form-control"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="profit-to">Hasta</label>
              <input
                id="profit-to"
                type="date"
                className="form-control"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              />
            </div>
          </div>
          <div className="admin-actions-row mt-3">
            <button type="button" className="touch-btn btn-primary" onClick={() => loadReport(filters)} disabled={loading}>
              {loading ? 'Generando...' : 'Generar reporte'}
            </button>
            <button type="button" className="touch-btn btn-outline-secondary" onClick={() => downloadCsv(report)} disabled={!report}>
              Exportar Excel (CSV)
            </button>
            <button type="button" className="touch-btn btn-outline-secondary" onClick={() => window.print()} disabled={!report}>
              Exportar PDF
            </button>
          </div>
        </section>

        {report && (
          <>
            <section className="admin-card">
              <h4>1. Encabezado del reporte</h4>
              <p><strong>Restaurante:</strong> {report.header.restaurantName}</p>
              <p><strong>Rango de fechas:</strong> del {formatIsoDate(report.header.from)} al {formatIsoDate(report.header.to)}</p>
              <p><strong>Fecha de generación:</strong> {new Date(report.header.generatedAt).toLocaleString('es-AR')}</p>
              <p><strong>Tipo de reporte:</strong> {report.header.period}</p>
            </section>

            <section className="admin-card">
              <h4>2. Ingresos totales</h4>
              <p>Ventas netas (pedidos - descuentos/devoluciones): <strong>{formatCurrency(reportData.totals.netSales)}</strong></p>
              <div className="row g-3">
                <div className="col-md-6">
                  <h5>Desglose por categoría</h5>
                  <div style={{ height: '280px' }} className="mb-3">
                    {categoryChartData ? <Doughnut data={categoryChartData} options={doughnutOptions} /> : <p className="text-muted">Sin datos para graficar.</p>}
                  </div>
                  <ul>
                    {categoryBreakdown.map((item) => (
                      <li key={item.category}>{item.category}: {formatCurrency(item.total)} ({formatPercent(item.percentage)})</li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-6">
                  <h5>Ingresos por método de pago</h5>
                  <div style={{ height: '280px' }} className="mb-3">
                    {paymentMethodsChartData ? <Doughnut data={paymentMethodsChartData} options={doughnutOptions} /> : <p className="text-muted">Sin datos para graficar.</p>}
                  </div>
                  <ul>
                    {paymentMethods.map((item) => (
                      <li key={item.channel}>{item.channel}: {formatCurrency(item.total)} ({formatPercent(item.percentage)})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="admin-card">
              <h4>3. Costos directos (COGS)</h4>
              <p>Costo de alimentos (materia prima): <strong>{formatCurrency(reportData.cogs.foodCost)}</strong></p>
              <p>Costo de bebidas: <strong>{formatCurrency(reportData.cogs.beverageCost)}</strong></p>
              <p>Mermas y desperdicios: <strong>{formatCurrency(reportData.cogs.wasteCost)}</strong></p>
              <p>Total COGS: <strong>{formatCurrency(reportData.cogs.total)}</strong> ({formatPercent(reportData.cogs.percentage)})</p>
            </section>

            <section className="admin-card">
              <h4>4. Cálculo de ganancia bruta</h4>
              <p>Fórmula: Ingresos totales - Costos directos</p>
              <p>Ganancia bruta: <strong>{formatCurrency(reportData.grossProfit.amount)}</strong></p>
              <p>Margen de ganancia bruta: <strong>{formatPercent(reportData.grossProfit.margin)}</strong></p>
            </section>

            <section className="admin-card">
              <h4>5. Gastos operativos básicos</h4>
              <div style={{ height: '300px' }} className="mb-3">
                {operatingExpensesChartData ? <Doughnut data={operatingExpensesChartData} options={doughnutOptions} /> : <p className="text-muted">Sin datos para graficar.</p>}
              </div>
              <table className="table table-sm">
                <thead>
                  <tr><th>Categoría</th><th>Monto</th><th>% sobre ventas netas</th></tr>
                </thead>
                <tbody>
                  {operatingRows.map((item) => (
                    <tr key={item.label}>
                      <td>{item.label}</td>
                      <td>{formatCurrency(item.value)}</td>
                      <td>{formatPercent((item.value / (reportData.totals.netSales || 1)) * 100)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>{formatCurrency(reportData.operatingExpenses.total)}</strong></td>
                    <td><strong>{formatPercent(reportData.operatingExpenses.percentage)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="admin-card">
              <h4>6. Ganancia neta</h4>
              <p>Ganancia neta = Ganancia bruta - Gastos operativos</p>
              <p>Ganancia neta: <strong>{formatCurrency(reportData.netProfit.amount)}</strong></p>
              <p>Margen neto: <strong>{formatPercent(reportData.netProfit.margin)}</strong></p>
            </section>

            <section className="admin-card">
              <h4>7. Métricas clave adicionales</h4>
              <div className="row g-2">
                <div className="col-md-4"><strong>Ticket promedio por cliente:</strong> {formatCurrency(reportData.kpis.averagePerSale)}</div>
                <div className="col-md-4"><strong>Total de clientes atendidos:</strong> {formatNumber(reportData.kpis.totalCustomers, 0)}</div>
                <div className="col-md-4"><strong>Productos más vendidos:</strong> {topProducts.slice(0, 3).map((p) => p.product).join(', ') || 'Sin datos'}</div>
              </div>
              <div className="mt-3">
                <h5>Horas pico de ventas</h5>
                {peakHours.map((item) => (
                  <div key={item.schedule} className="mb-2">
                    <div className="d-flex justify-content-between">
                      <span>{item.schedule}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <div className="progress" role="progressbar" aria-label={item.schedule}>
                      <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <h4>8. Comparativas</h4>
              <p>Versus período anterior: <strong>{formatCurrency(report.executiveSummary.comparison.netProfit.diffAmount)}</strong> ({formatPercent(report.executiveSummary.comparison.netProfit.diffPercent)})</p>
              <p>Versus presupuesto esperado: <strong>{formatCurrency(report.executiveSummary.comparison.budget.diffAmount)}</strong> ({formatPercent(report.executiveSummary.comparison.budget.diffPercent)})</p>
            </section>

            <section className="admin-card">
              <h4>9. Observaciones o notas</h4>
              <ul>
                {(reportData.notes || []).map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}
              </ul>
            </section>

            <section className="admin-card">
              <h4>10. Formato recomendado</h4>
              <p>Este reporte incluye tabla resumen clara, barras simples de tendencia por horario y exportación a Excel (CSV) o PDF.</p>
              <table className="table table-sm">
                <thead>
                  <tr><th>Concepto</th><th>Monto</th><th>% sobre ventas netas</th></tr>
                </thead>
                <tbody>
                  <tr><td>Ventas netas</td><td>{formatCurrency(reportData.totals.netSales)}</td><td>100%</td></tr>
                  <tr><td>- Costo de ventas</td><td>{formatCurrency(reportData.cogs.total)}</td><td>{formatPercent(reportData.cogs.percentage)}</td></tr>
                  <tr><td>= Ganancia bruta</td><td>{formatCurrency(reportData.grossProfit.amount)}</td><td>{formatPercent(reportData.grossProfit.margin)}</td></tr>
                  <tr><td>- Gastos operativos</td><td>{formatCurrency(reportData.operatingExpenses.total)}</td><td>{formatPercent(reportData.operatingExpenses.percentage)}</td></tr>
                  <tr><td>= Ganancia neta</td><td>{formatCurrency(reportData.netProfit.amount)}</td><td>{formatPercent(reportData.netProfit.margin)}</td></tr>
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminProfitReport;
