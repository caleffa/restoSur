import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createStockMovement,
  getArticles,
  getStock,
  getStockMovements,
} from '../services/adminService';
import { formatNumber } from '../utils/formatters';
import { sortByLabel } from '../utils/sort';

const INITIAL_FORM = {
  articleId: '',
  type: 'INGRESO',
  quantity: '',
  reason: '',
};

function AdminStock() {
  const [stockRows, setStockRows] = useState([]);
  const [movementRows, setMovementRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [articlesData, stockData, movementsData] = await Promise.all([
        getArticles(),
        getStock(),
        getStockMovements({ limit: 100 }),
      ]);

      setArticles(articlesData.filter((article) => (article.active ?? true)));
      setStockRows(stockData);
      setMovementRows(movementsData);
      setError('');
    } catch {
      setError('No se pudo cargar el módulo de stock.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const articleOptions = useMemo(
    () => sortByLabel(
      articles.map((article) => ({ value: String(article.id), label: `${article.name} (${article.sku})` })),
      (article) => article.label,
    ),
    [articles],
  );

  const stockByArticleId = useMemo(
    () => Object.fromEntries(stockRows.map((row) => [Number(row.article_id), Number(row.quantity)])),
    [stockRows],
  );

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await createStockMovement({
        articleId: Number(form.articleId),
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason,
      });

      setSuccess('Movimiento registrado correctamente.');
      setForm(INITIAL_FORM);
      await loadData();
    } catch (submitError) {
      const message = submitError?.response?.data?.message || 'No se pudo registrar el movimiento de stock.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen stock-screen">
        <h2>Gestión de stock</h2>

        <section className="admin-card">
          <h3>Nuevo movimiento</h3>
          <form className="admin-table-form stock-form" onSubmit={onSubmit}>
            <select
              value={form.articleId}
              onChange={(event) => setForm((prev) => ({ ...prev, articleId: event.target.value }))}
              required
            >
              <option value="">Seleccionar artículo</option>
              {articleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              required
            >
              <option value="AJUSTE">Ajuste (valor final)</option>
              <option value="EGRESO">Egreso</option>
              <option value="INGRESO">Ingreso</option>
            </select>

            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder={form.type === 'AJUSTE' ? 'Stock final' : 'Cantidad'}
              value={form.quantity}
              onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
              required
            />

            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            />

            <button type="submit" className="touch-btn btn-primary" disabled={loading}>
              Registrar movimiento
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </section>

        <SimpleDataTable
          title="Stock actual"
          rows={stockRows}
          columns={[
            { key: 'article', label: 'Artículo', accessor: (row) => row.article_name, sortable: true },
            {
              key: 'products',
              label: 'Producto/s',
              accessor: (row) => row.related_products || '-',
              sortable: true,
            },
            { key: 'sku', label: 'SKU', accessor: (row) => row.article_sku, sortable: true },
            {
              key: 'quantity',
              label: 'Cantidad',
              accessor: (row) => formatNumber(row.quantity || 0, 3),
              sortable: true,
            },
            {
              key: 'status',
              label: 'Estado',
              accessor: (row) => (Number(row.quantity) <= 0 ? 'Sin stock' : 'Disponible'),
              sortable: true,
            },
          ]}
        />

        <SimpleDataTable
          title="Últimos movimientos"
          rows={movementRows}
          columns={[
            { key: 'created', label: 'Fecha', accessor: (row) => new Date(row.created_at).toLocaleString(), sortable: true },
            { key: 'article', label: 'Artículo', accessor: (row) => row.article_name, sortable: true },
            {
              key: 'products',
              label: 'Producto/s',
              accessor: (row) => row.related_products || '-',
              sortable: true,
            },
            { key: 'type', label: 'Tipo', accessor: (row) => row.type, sortable: true },
            { key: 'qty', label: 'Cantidad', accessor: (row) => formatNumber(row.quantity, 3), sortable: true },
            { key: 'user', label: 'Usuario', accessor: (row) => row.user_name || '-', sortable: true },
            { key: 'reason', label: 'Motivo', accessor: (row) => row.reason || '-' },
            {
              key: 'stock_post',
              label: 'Stock actual',
              accessor: (row) => {
                const qty = stockByArticleId[Number(row.article_id)];
                return qty === undefined ? '-' : formatNumber(qty, 3);
              },
            },
          ]}
        />
      </main>
    </div>
  );
}

export default AdminStock;
