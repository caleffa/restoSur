const CURRENCY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const INTEGER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

function StatsCards({ summary, loading }) {
  const stats = [
    {
      key: 'sales',
      title: 'Ventas del día',
      value: CURRENCY.format(summary?.sales || 0),
      icon: '💵',
    },
    {
      key: 'tickets',
      title: 'Tickets',
      value: INTEGER.format(summary?.tickets || 0),
      icon: '🧾',
    },
    {
      key: 'avgTicket',
      title: 'Ticket promedio',
      value: CURRENCY.format(summary?.avgTicket || 0),
      icon: '📈',
    },
    {
      key: 'occupiedTables',
      title: 'Mesas ocupadas',
      value: INTEGER.format(summary?.occupiedTables || 0),
      icon: '🍽️',
    },
  ];

  return (
    <section className="dashboard-kpis">
      {stats.map((stat) => (
        <article key={stat.key} className="dashboard-card kpi-card shadow-sm">
          {loading ? (
            <div className="placeholder-glow mb-2">
              <span className="placeholder col-8" />
              <span className="placeholder col-5" />
            </div>
          ) : (
            <>
              <p className="kpi-label mb-1">{stat.icon} {stat.title}</p>
              <h3 className="kpi-value mb-0">{stat.value}</h3>
            </>
          )}
        </article>
      ))}
    </section>
  );
}

export default StatsCards;
