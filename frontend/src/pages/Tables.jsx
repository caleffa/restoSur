import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TableCard from '../components/TableCard';
import { getAreas } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { createSale, getTables } from '../services/tableService';
import { canAccessPOS, canCreateSale } from '../utils/roles';

function Tables() {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [error, setError] = useState('');
  const [busyTableId, setBusyTableId] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadTables = useCallback(async (areaId = null) => {
    try {
      setLoading(true);
      const response = await getTables(areaId ? { areaId } : {});
      const tablesData = Array.isArray(response)
        ? response
        : response?.data || [];

      setTables(
        tablesData.map((table) => ({
          ...table,
          name: table.name || table.table_number || `Mesa ${table.id}`,
          capacity: Number(table.capacity) > 0 ? Number(table.capacity) : 1,
        }))
      );
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
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      await loadTables(selectedArea === 'ALL' ? null : Number(selectedArea));
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadTables, selectedArea]);

  const handleTableClick = async (table) => {
    if (busyTableId) return;

    setError('');

    if (table.status === 'LIBRE' && canCreateSale(user?.role)) {
      try {
        setBusyTableId(table.id);
        await createSale(table.id);
        await loadTables(selectedArea === 'ALL' ? null : Number(selectedArea));
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

    if (
      (table.status === 'OCUPADA' || table.status === 'CUENTA_PEDIDA') &&
      canAccessPOS(user?.role)
    ) {
      navigate(`/pos/${table.id}`);
    }
  };

  const areaOptions = useMemo(
    () => [{ id: 'ALL', name: 'Todas las áreas' }, ...areas],
    [areas]
  );

  return (
    <div className="app-layout">
      <Navbar />

      <main className="content tables-screen">
        <div className="tables-header">
          <h2>Mesas</h2>
          <small>Actualización automática cada 5 segundos</small>
        </div>

        <div className="tables-filters-row">
          <label htmlFor="tablesAreaFilter">Área</label>
          <select
            id="tablesAreaFilter"
            value={selectedArea}
            onChange={(event) => setSelectedArea(event.target.value)}
          >
            {areaOptions.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
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
