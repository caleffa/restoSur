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
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadTables = useCallback(async () => {
    try {
      const data = await getTables();
      setTables(data);
      setError('');
    } catch {
      setError('No se pudieron cargar las mesas.');
    }
  }, []);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 5000);
    return () => clearInterval(interval);
  }, [loadTables]);

  const handleTableClick = async (table) => {
    if (busyTableId) return;

    if (table.status === 'LIBRE' && canCreateSale(user?.role)) {
      try {
        setBusyTableId(table.id);
        await createSale(table.id);
        await loadTables();
      } catch {
        setError('No se pudo abrir la venta para esta mesa.');
      } finally {
        setBusyTableId(null);
      }
      return;
    }

    if ((table.status === 'OCUPADA' || table.status === 'CUENTA') && canAccessPOS(user?.role)) {
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

        <section className="tables-grid">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={handleTableClick}
              disabled={busyTableId === table.id}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

export default Tables;
