import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Navbar from '../components/Navbar';
import TableCard from '../components/TableCard';
import { getAreas } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { createSaleWithWaiter, getAreaMap, getTables, getWaiters } from '../services/tableService';
import { normalizeTableType } from '../utils/tableVisuals';
import { canAccessPOS, canCreateSale } from '../utils/roles';

function Tables() {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [error, setError] = useState('');
  const [busyTableId, setBusyTableId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waiters, setWaiters] = useState([]);
  const [pendingTable, setPendingTable] = useState(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState(null);

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
          table_type: normalizeTableType(table.table_type),
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

  const loadMappedTables = useCallback(async (areaId) => {
    try {
      setLoading(true);
      const data = await getAreaMap(areaId);
      const placed = data?.placedTables || [];
      const unplaced = data?.unplacedTables || [];
      const ordered = [...placed, ...unplaced].map((table) => ({
        ...table,
        name: table.name || table.table_number || `Mesa ${table.id}`,
        capacity: Number(table.capacity) > 0 ? Number(table.capacity) : 1,
        table_type: normalizeTableType(table.table_type),
      }));

      setTables(ordered);
      setError('');
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'No se pudo cargar el mapa del área.'
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
    getWaiters().then(setWaiters).catch(() => setWaiters([]));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      if (selectedArea === 'ALL') {
        await loadTables(null);
      } else {
        await loadMappedTables(Number(selectedArea));
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadMappedTables, loadTables, selectedArea]);

  const handleTableClick = async (table) => {
    if (busyTableId) return;

    setError('');

    if (table.status === 'LIBRE' && canCreateSale(user?.role)) {
      const defaultWaiter = waiters.find((item) => Number(item.id) === Number(user?.id)) || waiters[0] || null;
      setPendingTable(table);
      setSelectedWaiterId(defaultWaiter ? Number(defaultWaiter.id) : null);
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

  const confirmOpenTable = async () => {
    if (!pendingTable || !selectedWaiterId) {
      setError('Seleccioná un mozo para abrir la mesa.');
      return;
    }

    try {
      setBusyTableId(pendingTable.id);
      await createSaleWithWaiter(pendingTable.id, selectedWaiterId);
      setPendingTable(null);
      if (selectedArea === 'ALL') {
        await loadTables(null);
      } else {
        await loadMappedTables(Number(selectedArea));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'No se pudo abrir la venta para esta mesa.'
      );
    } finally {
      setBusyTableId(null);
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
          <section className={selectedArea !== 'ALL' ? 'tables-map-canvas' : 'tables-grid'}>
            {tables.length === 0 ? (
              <p>No hay mesas disponibles</p>
            ) : (
              tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={handleTableClick}
                  disabled={busyTableId === table.id}
                  style={selectedArea !== 'ALL' && Number.isFinite(Number(table.pos_x)) && Number.isFinite(Number(table.pos_y))
                    ? { position: 'absolute', left: Number(table.pos_x), top: Number(table.pos_y) }
                    : undefined}
                />
              ))
            )}
          </section>
        )}
      </main>

      {pendingTable && (
        <Modal
          title={`Abrir mesa ${pendingTable.table_number}`}
          onClose={() => setPendingTable(null)}
          size="sm"
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={() => setPendingTable(null)}>
                Cancelar
              </button>
              <button type="button" className="touch-btn btn-primary" onClick={confirmOpenTable}>
                Confirmar
              </button>
            </>
          )}
        >
          <p className="modal-helper-text">Seleccioná el mozo asignado para esta mesa.</p>
          <div className="waiters-touch-grid">
            {waiters.map((waiter) => (
              <button
                key={waiter.id}
                type="button"
                className={`touch-btn waiter-choice ${Number(selectedWaiterId) === Number(waiter.id) ? 'active' : ''}`}
                onClick={() => setSelectedWaiterId(Number(waiter.id))}
              >
                {waiter.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Tables;
