import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SalesList from '../components/dashboard/SalesList';
import StatsCards from '../components/dashboard/StatsCards';
import TablesGrid from '../components/dashboard/TablesGrid';
import TopProducts from '../components/dashboard/TopProducts';
import KitchenOrdersGrid from '../components/dashboard/KitchenOrdersGrid';
import KitchenOrderModal from '../components/dashboard/KitchenOrderModal';
import { createSale, getTables } from '../services/tableService';
import { getAreas } from '../services/adminService';
import {
  getDashboardSummary,
  getOpenSales,
  getSalesByHour,
  getTopProducts,
} from '../services/dashboardService';
import { canAccessPOS, canCreateSale, ROLES } from '../utils/roles';
import { useAuth } from '../context/AuthContext';
import { getKitchenOrders, getSaleDetail, updateKitchenOrderStatus } from '../services/kitchenService';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [openSales, setOpenSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesByHour, setSalesByHour] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyTableId, setBusyTableId] = useState(null);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [selectedKitchenOrder, setSelectedKitchenOrder] = useState(null);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [kitchenModalLoading, setKitchenModalLoading] = useState(false);
  const [kitchenStatusLoading, setKitchenStatusLoading] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const isKitchenRole = user?.role === ROLES.COCINA;

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [summaryData, tablesData, salesData, productsData, hourlyData, kitchenData] = await Promise.all([
        getDashboardSummary(),
        getTables(selectedArea === 'ALL' ? {} : { areaId: Number(selectedArea) }),
        getOpenSales(),
        getTopProducts(),
        getSalesByHour(),
        isKitchenRole ? getKitchenOrders() : Promise.resolve([]),
      ]);

      setSummary(summaryData);
      setTables(
        (Array.isArray(tablesData) ? tablesData : []).map((table) => ({
          ...table,
          name: table.name || table.table_number || `Mesa ${table.id}`,
          capacity: Number(table.capacity) > 0 ? Number(table.capacity) : 1,
        }))
      );
      setOpenSales(salesData);
      setTopProducts(productsData);
      setSalesByHour(hourlyData);
      setKitchenOrders(kitchenData);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  }, [isKitchenRole, selectedArea]);

  const loadAreas = useCallback(async () => {
    try {
      const data = await getAreas();
      setAreas(data);
    } catch {
      setAreas([]);
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleTableClick = async (table) => {
    if (!table || busyTableId) return;

    if (table.status === 'LIBRE' && canCreateSale(user?.role)) {
      try {
        setBusyTableId(table.id);
        await createSale(table.id);
        await loadDashboard();
      } catch (err) {
        setError(err?.response?.data?.message || 'No se pudo abrir la venta de la mesa.');
      } finally {
        setBusyTableId(null);
      }
      return;
    }

    if ((table.status === 'OCUPADA' || table.status === 'CUENTA_PEDIDA') && canAccessPOS(user?.role)) {
      navigate(`/pos/${table.id}`);
    }
  };

  const handleKitchenOrderSelect = async (order) => {
    if (!order) return;
    setSelectedKitchenOrder(order);
    setKitchenModalLoading(true);

    try {
      const detail = await getSaleDetail(order.saleId);
      setSelectedSaleDetail({
        ...detail,
        tableName: detail?.tableName || detail?.table?.name,
      });
      setError('');
    } catch (err) {
      setSelectedSaleDetail(null);
      setError(err?.response?.data?.message || 'No se pudo cargar el detalle de la comanda.');
    } finally {
      setKitchenModalLoading(false);
    }
  };

  const handleKitchenStatusChange = async (status) => {
    if (!selectedKitchenOrder || kitchenStatusLoading) return;

    try {
      setKitchenStatusLoading(true);
      await updateKitchenOrderStatus(selectedKitchenOrder.id, status);

      setSelectedKitchenOrder((prev) => (prev ? { ...prev, status } : prev));
      setKitchenOrders((prev) => prev.map((order) => (
        order.id === selectedKitchenOrder.id ? { ...order, status } : order
      )));
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar el estado de la comanda.');
    } finally {
      setKitchenStatusLoading(false);
    }
  };

  const alerts = useMemo(() => {
    const outOfStockProducts = topProducts.filter((product) => product.quantity === 0);
    const pendingBillTables = tables.filter((table) => table.status === 'CUENTA_PEDIDA');
    const delayedOrders = openSales.filter((sale) => {
      if (!sale.openedAt) return false;
      const openedAtMs = new Date(sale.openedAt).getTime();
      return Number.isFinite(openedAtMs) && Date.now() - openedAtMs > 1000 * 60 * 45;
    });

    return {
      outOfStockProducts,
      pendingBillTables,
      delayedOrders,
    };
  }, [tables, openSales, topProducts]);

  const maxHourlySale = useMemo(() => {
    if (!salesByHour.length) return 1;
    return Math.max(...salesByHour.map((item) => item.total), 1);
  }, [salesByHour]);

  const areaOptions = useMemo(
    () => [{ id: 'ALL', name: 'Todas las áreas' }, ...areas],
    [areas]
  );

  return (
    <div className="app-layout">
      <Navbar />

      <main className="content dashboard-screen">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h2 className="mb-1">Dashboard Operativo</h2>
            <p className="text-muted mb-0">Bienvenido, {user?.name}. Vista en tiempo real para piso y caja.</p>
          </div>
          <span className="badge rounded-pill text-bg-light">Actualizado: {new Date().toLocaleTimeString('es-AR')}</span>
        </div>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <StatsCards summary={summary} loading={loading} />

        <section className="dashboard-main-grid mt-3">
          {isKitchenRole ? (
            <KitchenOrdersGrid
              orders={kitchenOrders}
              loading={loading}
              onSelectOrder={handleKitchenOrderSelect}
            />
          ) : (
            <TablesGrid
              tables={tables}
              loading={loading}
              busyTableId={busyTableId}
              onTableClick={handleTableClick}
              areaOptions={areaOptions}
              selectedArea={selectedArea}
              onAreaChange={setSelectedArea}
            />
          )}

          <div className="dashboard-side-grid">
            <SalesList sales={openSales} loading={loading} onSaleClick={(sale) => navigate(`/pos/${sale.tableId}`)} />
            <TopProducts products={topProducts} loading={loading} />
          </div>
        </section>

        <section className="dashboard-bottom-grid mt-3">
          <article className="dashboard-card shadow-sm">
            <h3 className="section-title">Ventas por hora (hoy)</h3>
            {loading ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Cargando gráfico...
              </div>
            ) : (
              <div className="sales-chart">
                {salesByHour.map((entry) => (
                  <div key={entry.hour} className="chart-bar-wrap">
                    <div
                      className="chart-bar"
                      style={{ height: `${Math.max((entry.total / maxHourlySale) * 140, 10)}px` }}
                      title={`${entry.hour}: ${entry.total}`}
                    />
                    <small className="text-muted">{entry.hour}</small>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card shadow-sm">
            <h3 className="section-title">Alertas</h3>
            <ul className="alerts-list">
              <li>
                <strong>Sin stock:</strong> {alerts.outOfStockProducts.length > 0
                  ? alerts.outOfStockProducts.map((product) => product.name).join(', ')
                  : 'Sin alertas'}
              </li>
              <li>
                <strong>Cuentas pendientes:</strong> {alerts.pendingBillTables.length > 0
                  ? alerts.pendingBillTables.map((table) => table.name).join(', ')
                  : 'Sin cuentas pendientes'}
              </li>
              <li>
                <strong>Pedidos demorados (&gt;45 min):</strong> {alerts.delayedOrders.length > 0
                  ? `${alerts.delayedOrders.length} mesa(s) con demora`
                  : 'Sin demoras detectadas'}
              </li>
            </ul>
          </article>
        </section>
        {selectedKitchenOrder ? (
          <KitchenOrderModal
            order={selectedKitchenOrder}
            saleDetail={selectedSaleDetail}
            loading={kitchenModalLoading}
            statusUpdating={kitchenStatusLoading}
            onClose={() => {
              setSelectedKitchenOrder(null);
              setSelectedSaleDetail(null);
            }}
            onChangeStatus={handleKitchenStatusChange}
          />
        ) : null}
      </main>
    </div>
  );
}

export default Dashboard;
