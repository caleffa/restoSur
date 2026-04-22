import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { getProfitReport } from '../services/profitsService';
import { formatCurrency, formatNumber } from '../utils/formatters';

const PERIOD_OPTIONS = [
  { value: 'DIARIO', label: 'Diario' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'ANUAL', label: 'Anual' },
];

function formatPercent(value) {
  return `${formatNumber(value, 2)}%`;
}

function formatIsoDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-AR');
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
      { label: 'Personal', value: reportData.operatingExpenses.personal },
      { label: 'Alquiler', value: reportData.operatingExpenses.alquiler },
      { label: 'Servicios', value: reportData.operatingExpenses.servicios },
      { label: 'Marketing', value: reportData.operatingExpenses.marketing },
      { label: 'Mantenimiento', value: reportData.operatingExpenses.mantenimiento },
      { label: 'Administrativos', value: reportData.operatingExpenses.administrativos },
      { label: 'Delivery', value: reportData.operatingExpenses.delivery },
      { label: 'Otros operativos', value: reportData.operatingExpenses.otrosOperativos },
    ];
  }, [reportData]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content">
        <h2>Reporte de ganancias</h2>
        {error && <p className="text-danger">{error}</p>}

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3">
              <label htmlFor="profit-period">Período</label>
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
          </div>
        </section>

        {report && (
          <>
            <section className="admin-card">
              <h3>{report.header.restaurantName}</h3>
              <p>
                Período: {report.header.period} | Desde: {formatIsoDate(report.header.from)} | Hasta: {formatIsoDate(report.header.to)}
              </p>
              <p>Generado: {new Date(report.header.generatedAt).toLocaleString('es-AR')}</p>
            </section>

            <section className="cash-info-grid">
              <article className="dashboard-card">
                <p className="kpi-label">Ganancia neta</p>
                <p className="kpi-value">{formatCurrency(report.executiveSummary.netProfit)}</p>
              </article>
              <article className="dashboard-card">
                <p className="kpi-label">Margen neto</p>
                <p className="kpi-value">{formatPercent(report.executiveSummary.netMargin)}</p>
              </article>
              <article className="dashboard-card">
                <p className="kpi-label">Comparación período anterior</p>
                <p className="kpi-value">{formatCurrency(report.executiveSummary.comparison.netProfit.diffAmount)}</p>
                <small>{formatPercent(report.executiveSummary.comparison.netProfit.diffPercent)}</small>
              </article>
            </section>

            <section className="admin-card">
              <h4>A. Ingresos totales</h4>
              <p>Ventas brutas: <strong>{formatCurrency(reportData.totals.grossSales)}</strong></p>
              <p>Descuentos: <strong>{formatCurrency(reportData.totals.discounts)}</strong> | Devoluciones: <strong>{formatCurrency(reportData.totals.returns)}</strong></p>
              <p>Ventas netas: <strong>{formatCurrency(reportData.totals.netSales)}</strong></p>

              <div className="row g-3">
                <div className="col-md-4">
                  <h5>Canales / métodos de cobro</h5>
                  <ul>
                    {(reportData.breakdown.byChannel || []).map((item) => (
                      <li key={item.channel}>{item.channel}: {formatCurrency(item.total)} ({formatPercent(item.percentage)})</li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>Categorías</h5>
                  <ul>
                    {(reportData.breakdown.byCategory || []).map((item) => (
                      <li key={item.category}>{item.category}: {formatCurrency(item.total)} ({formatPercent(item.percentage)})</li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>Horarios</h5>
                  <ul>
                    {(reportData.breakdown.bySchedule || []).map((item) => (
                      <li key={item.schedule}>{item.schedule}: {formatCurrency(item.total)} ({formatPercent(item.percentage)})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="admin-card">
              <h4>B. Costo de ventas (COGS)</h4>
              <p>{reportData.cogs.inventoryMethod}</p>
              <p>Costo teórico: <strong>{formatCurrency(reportData.cogs.theoreticalCost)}</strong></p>
              <p>Mermas/ajustes: <strong>{formatCurrency(reportData.cogs.wasteCost)}</strong></p>
              <p>Total COGS: <strong>{formatCurrency(reportData.cogs.total)}</strong> ({formatPercent(reportData.cogs.percentage)})</p>
            </section>

            <section className="admin-card">
              <h4>C. Ganancia bruta</h4>
              <p>Ganancia bruta: <strong>{formatCurrency(reportData.grossProfit.amount)}</strong></p>
              <p>Margen bruto: <strong>{formatPercent(reportData.grossProfit.margin)}</strong></p>
            </section>

            <section className="admin-card">
              <h4>D. Gastos operativos</h4>
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
              <h4>E. Otros ingresos/gastos</h4>
              <p>Otros ingresos: <strong>{formatCurrency(reportData.others.incomes)}</strong></p>
              <p>Otros gastos: <strong>{formatCurrency(reportData.others.expenses)}</strong></p>
              <p>Neto otros: <strong>{formatCurrency(reportData.others.net)}</strong></p>
            </section>

            <section className="admin-card">
              <h4>F. Ganancia neta final</h4>
              <p>Ganancia neta: <strong>{formatCurrency(reportData.netProfit.amount)}</strong></p>
              <p>Margen neto: <strong>{formatPercent(reportData.netProfit.margin)}</strong></p>
            </section>

            <section className="admin-card">
              <h4>Indicadores clave</h4>
              <div className="row g-2">
                <div className="col-md-4"><strong>Margen neto:</strong> {formatPercent(reportData.kpis.netMargin)}</div>
                <div className="col-md-4"><strong>Costo AyB:</strong> {formatPercent(reportData.kpis.foodAndBeverageCost)}</div>
                <div className="col-md-4"><strong>Mano de obra:</strong> {formatPercent(reportData.kpis.laborCost)}</div>
                <div className="col-md-4"><strong>Gastos generales:</strong> {formatPercent(reportData.kpis.overheadCost)}</div>
                <div className="col-md-4"><strong>Venta promedio:</strong> {formatCurrency(reportData.kpis.averagePerSale)}</div>
                <div className="col-md-4"><strong>Rotación mesas (proxy):</strong> {formatNumber(reportData.kpis.tableTurnover, 2)}</div>
                <div className="col-md-4"><strong>Punto equilibrio:</strong> {formatCurrency(reportData.kpis.breakEvenSales)}</div>
              </div>
            </section>

            <section className="admin-card">
              <h4>Ejemplo visual simplificado</h4>
              <table className="table table-sm">
                <thead>
                  <tr><th>Concepto</th><th>Monto ($)</th><th>% sobre ventas netas</th></tr>
                </thead>
                <tbody>
                  <tr><td>Ventas netas</td><td>{formatCurrency(reportData.totals.netSales)}</td><td>100%</td></tr>
                  <tr><td>- Costo de ventas</td><td>{formatCurrency(reportData.cogs.total)}</td><td>{formatPercent(reportData.cogs.percentage)}</td></tr>
                  <tr><td>= Ganancia bruta</td><td>{formatCurrency(reportData.grossProfit.amount)}</td><td>{formatPercent(reportData.grossProfit.margin)}</td></tr>
                  <tr><td>- Gastos operativos</td><td>{formatCurrency(reportData.operatingExpenses.total)}</td><td>{formatPercent(reportData.operatingExpenses.percentage)}</td></tr>
                  <tr><td>± Otros</td><td>{formatCurrency(reportData.others.net)}</td><td>{formatPercent((reportData.others.net / (reportData.totals.netSales || 1)) * 100)}</td></tr>
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
