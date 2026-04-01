import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TableCard from '../components/TableCard';
import { useAuth } from '../context/AuthContext';
import { createSale, getTables } from '../services/tableService';
import { canAccessPOS, canCreateSale } from '../utils/roles';

function Tables() {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState('');
  const [busyTableId, setBusyTableId] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadTables = useCallback(async () => {
    try {
      const response = await getTables();

      const tablesData = response?.data || [];

      setTables(tablesData);
      setError('');
    } catch (err) {
      setTables([]);
      setError(
        err?.response?.data?.message ||
        'No se pudieron cargar las mesas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      await loadTables();
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadTables]);

  const handleTableClick = async (table) => {
    if (busyTableId) return;

    setError('');

    // 🟢 Crear venta
    if (table.status === 'LIBRE' && canCreateSale(user?.role)) {
      try {
        setBusyTableId(table.id);
        await createSale(table.id);
        await loadTables();
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          'No se pudo abrir la venta para esta mesa.'
        );
      } finally {
        setBusyTableId(null);
      }
      return;
    }

    // 🔵 Ir al POS
    if (
      (table.status === 'OCUPADA' || table.status === 'CUENTA') &&
      canAccessPOS(user?.role)
    ) {
      navigate(`/pos/${table.id}`);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="content tables-screen">
        <div className="tables-header">
          <h2>Mesas</h2>
          <small>Actualización automática cada 5 segundos</small>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <p>Cargando mesas...</p>
        ) : (
          <section className="tables-grid">
            {tables.length === 0 ? (
              <p>No hay mesas disponibles</p>
            ) : (
              tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={handleTableClick}
                  disabled={busyTableId === table.id}
                />
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default Tables;