import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { getCashRegisters, getCashReports } from '../services/cashService';
import { formatCurrency } from '../utils/formatters';
import { sortByLabel } from '../utils/sort';

function CashReport() {
  const [filters, setFilters] = useState({ from: '', to: '', userId: '', registerId: '' });
  const [registers, setRegisters] = useState([]);
  const [report, setReport] = useState({ totals: {}, movements: [] });

  const load = async (nextFilters = filters) => {
    const [registerData, reportData] = await Promise.all([getCashRegisters(), getCashReports(nextFilters)]);
    setRegisters(registerData);
    setReport(reportData);
  };

  useEffect(() => {
    load();
  }, []);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    (report.movements || []).forEach((mov) => {
      const day = new Date(mov.created_at).toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + Number(mov.amount || 0));
    });
    return Array.from(map.entries()).map(([day, total]) => ({ day, total }));
  }, [report]);
  const sortedRegisters = useMemo(() => sortByLabel(registers, (item) => item.name), [registers]);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content cash-screen">
        <h2>Reportes de Caja</h2>

        <section className="admin-card cash-filters">
          <div className="row g-2">
            <div className="col-md-3"><label>Desde<input type="date" className="form-control" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} /></label></div>
            <div className="col-md-3"><label>Hasta<input type="date" className="form-control" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} /></label></div>
            <div className="col-md-3"><label>Usuario<input className="form-control" placeholder="ID usuario" value={filters.userId} onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))} /></label></div>
            <div className="col-md-3"><label>Caja
              <select className="form-select" value={filters.registerId} onChange={(e) => setFilters((p) => ({ ...p, registerId: e.target.value }))}>
                <option value="">Todas</option>
                {sortedRegisters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label></div>
          </div>
          <div className="mt-3"><button type="button" className="touch-btn btn-primary" onClick={() => load(filters)}>Aplicar filtros</button></div>
        </section>

        <section className="cash-info-grid">
          <article className="dashboard-card"><p className="kpi-label">Total ventas</p><p className="kpi-value">{formatCurrency(report.totals?.sales || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Ingresos manuales</p><p className="kpi-value">{formatCurrency(report.totals?.incomes || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Egresos</p><p className="kpi-value">{formatCurrency(report.totals?.expenses || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Diferencias</p><p className="kpi-value">{formatCurrency(report.totals?.differences || 0)}</p></article>
          <article className="dashboard-card"><p className="kpi-label">Balance final</p><p className="kpi-value">{formatCurrency(report.totals?.balance || 0)}</p></article>
        </section>

        <section className="admin-card">
          <h4>Agrupación por día (acumulado)</h4>
          <ul className="dashboard-list">
            {groupedByDay.map((item) => <li key={item.day} className="list-row-split"><span>{item.day}</span><strong>{formatCurrency(item.total)}</strong></li>)}
          </ul>
        </section>

        <section className="admin-card">
          <h4>Movimientos</h4>
          <div className="admin-table-wrap">
            <table className="table table-striped align-middle mb-0">
              <thead><tr><th>Fecha</th><th>Caja</th><th>Usuario</th><th>Tipo</th><th>Monto</th><th>Referencia</th></tr></thead>
              <tbody>
                {(report.movements || []).length ? (report.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.created_at).toLocaleString()}</td>
                    <td>{m.register_name || '-'}</td>
                    <td>{m.user_name || '-'}</td>
                    <td>{m.type}</td>
                    <td>{formatCurrency(m.amount)}</td>
                    <td>{m.reference || '-'}</td>
                  </tr>
                ))) : <tr><td colSpan="6" className="text-center py-4">Sin movimientos</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CashReport;
