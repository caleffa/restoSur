import { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const LANGUAGE_LOCALES = {
  es: 'es-AR',
  en: 'en-US',
  pt: 'pt-BR',
};

function StatsCards({ summary, loading }) {
  const { language, t } = useLanguage();
  const locale = LANGUAGE_LOCALES[language] || 'es-AR';

  const currencyFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }), [locale]);

  const integerFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }), [locale]);

  const stats = [
    {
      key: 'sales',
      title: t('dashboard.stats.sales_today', 'Ventas del día'),
      value: currencyFormatter.format(summary?.sales || 0),
      icon: '💵',
    },
    {
      key: 'tickets',
      title: t('dashboard.stats.tickets', 'Tickets'),
      value: integerFormatter.format(summary?.tickets || 0),
      icon: '🧾',
    },
    {
      key: 'avgTicket',
      title: t('dashboard.stats.avg_ticket', 'Ticket promedio'),
      value: currencyFormatter.format(summary?.avgTicket || 0),
      icon: '📈',
    },
    {
      key: 'occupiedTables',
      title: t('dashboard.stats.occupied_tables', 'Mesas ocupadas'),
      value: integerFormatter.format(summary?.occupiedTables || 0),
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
