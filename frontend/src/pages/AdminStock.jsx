import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createStockMovement,
  getProducts,
  getStock,
  getStockMovements,
} from '../services/adminService';

const INITIAL_FORM = {
  productId: '',
  type: 'INGRESO',
  quantity: '',
  reason: '',
};

function AdminStock() {
  const [stockRows, setStockRows] = useState([]);
  const [movementRows, setMovementRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [productsData, stockData, movementsData] = await Promise.all([
        getProducts(),
        getStock({ onlyManaged: true }),
        getStockMovements({ limit: 100 }),
      ]);

      setProducts(productsData.filter((product) => (product.has_stock ?? product.hasStock)));
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

  const productOptions = useMemo(
    () => products.map((product) => ({ value: String(product.id), label: product.name })),
    [products],
  );

  const stockByProductId = useMemo(
    () => Object.fromEntries(stockRows.map((row) => [Number(row.product_id), Number(row.quantity)])),
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
        productId: Number(form.productId),
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
              value={form.productId}
              onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              required
            >
              <option value="">Seleccionar producto</option>
              {productOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              required
            >
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
              <option value="AJUSTE">Ajuste (valor final)</option>
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
            { key: 'product', label: 'Producto', accessor: (row) => row.product_name, sortable: true },
            { key: 'category', label: 'Categoría', accessor: (row) => row.category_name || '-', sortable: true },
            {
              key: 'quantity',
              label: 'Cantidad',
              accessor: (row) => Number(row.quantity || 0).toFixed(3),
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
            { key: 'product', label: 'Producto', accessor: (row) => row.product_name, sortable: true },
            { key: 'type', label: 'Tipo', accessor: (row) => row.type, sortable: true },
            { key: 'qty', label: 'Cantidad', accessor: (row) => Number(row.quantity).toFixed(3), sortable: true },
            { key: 'user', label: 'Usuario', accessor: (row) => row.user_name || '-', sortable: true },
            { key: 'reason', label: 'Motivo', accessor: (row) => row.reason || '-' },
            {
              key: 'stock_post',
              label: 'Stock actual',
              accessor: (row) => {
                const qty = stockByProductId[Number(row.product_id)];
                return qty === undefined ? '-' : qty.toFixed(3);
              },
            },
          ]}
        />
      </main>
    </div>
  );
}

export default AdminStock;
