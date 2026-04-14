import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { getAreas } from '../services/adminService';
import { getAreaMap, saveAreaMap } from '../services/tableService';
import { getTableVisualConfig, normalizeTableType } from '../utils/tableVisuals';

const MAP_WIDTH = 780;
const MAP_HEIGHT = 560;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTableStatusClass(status) {
  if (status === 'LIBRE') return 'table-pill table-free';
  if (status === 'OCUPADA') return 'table-pill table-busy';
  if (status === 'CUENTA_PEDIDA') return 'table-pill table-bill';
  if (status === 'CERRADA') return 'table-pill table-closed';
  return 'table-pill';
}

function AdminAreaMapEditor() {
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [placedTables, setPlacedTables] = useState([]);
  const [unplacedTables, setUnplacedTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mapRef = useRef(null);

  const selectedArea = useMemo(
    () => areas.find((area) => String(area.id) === String(selectedAreaId)) || null,
    [areas, selectedAreaId]
  );

  const loadAreas = useCallback(async () => {
    const data = await getAreas();
    setAreas(data);

    if (!selectedAreaId && data.length > 0) {
      setSelectedAreaId(String(data[0].id));
    }
  }, [selectedAreaId]);

  const loadAreaMap = useCallback(async (areaId) => {
    if (!areaId) return;

    try {
      setLoading(true);
      const data = await getAreaMap(areaId);
      setPlacedTables(
        (data?.placedTables || []).map((table) => ({
          ...table,
          table_type: normalizeTableType(table.table_type),
        }))
      );
      setUnplacedTables(
        (data?.unplacedTables || []).map((table) => ({
          ...table,
          table_type: normalizeTableType(table.table_type),
        }))
      );
      setError('');
    } catch {
      setPlacedTables([]);
      setUnplacedTables([]);
      setError('No se pudo cargar el mapa del área.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAreas().catch(() => {
      setError('No se pudieron cargar las áreas.');
      setLoading(false);
    });
  }, [loadAreas]);

  useEffect(() => {
    loadAreaMap(selectedAreaId);
  }, [loadAreaMap, selectedAreaId]);

  const handleDragStart = (event, tableId, source) => {
    event.dataTransfer.setData('text/plain', JSON.stringify({ tableId, source }));
  };

  const dropToMap = (event) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw || !mapRef.current) return;

    const { tableId, source } = JSON.parse(raw);
    const rect = mapRef.current.getBoundingClientRect();
    const sourceTable = source === 'panel'
      ? unplacedTables.find((item) => item.id === tableId)
      : placedTables.find((item) => item.id === tableId);
    const visual = getTableVisualConfig(sourceTable);
    const x = clamp(event.clientX - rect.left - visual.width / 2, 0, MAP_WIDTH - visual.width);
    const y = clamp(event.clientY - rect.top - visual.height / 2, 0, MAP_HEIGHT - visual.height);

    if (source === 'panel') {
      const table = sourceTable;
      if (!table) return;

      setUnplacedTables((prev) => prev.filter((item) => item.id !== tableId));
      setPlacedTables((prev) => [...prev, { ...table, pos_x: Math.round(x), pos_y: Math.round(y) }]);
      return;
    }

    setPlacedTables((prev) => prev.map((item) => (
      item.id === tableId ? { ...item, pos_x: Math.round(x), pos_y: Math.round(y) } : item
    )));
  };

  const dropToPanel = (event) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain');
    if (!raw) return;

    const { tableId, source } = JSON.parse(raw);
    if (source !== 'map') return;

    const table = placedTables.find((item) => item.id === tableId);
    if (!table) return;

    setPlacedTables((prev) => prev.filter((item) => item.id !== tableId));
    setUnplacedTables((prev) => [...prev, { ...table, pos_x: null, pos_y: null }]);
  };

  const handleSave = async () => {
    if (!selectedAreaId || saving) return;

    try {
      setSaving(true);
      setSuccess('');
      await saveAreaMap({
        areaId: Number(selectedAreaId),
        placements: placedTables.map((table) => ({
          tableId: table.id,
          x: Number(table.pos_x),
          y: Number(table.pos_y),
        })),
        mapLayout: { width: MAP_WIDTH, height: MAP_HEIGHT },
      });
      setError('');
      setSuccess('Mapa guardado correctamente.');
    } catch {
      setError('No se pudo guardar el mapa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Gestor de mapa de salón</h2>
          <button type="button" className="touch-btn btn-primary" onClick={handleSave} disabled={saving || !selectedAreaId}>
            {saving ? 'Guardando...' : 'Guardar mapa'}
          </button>
        </div>

        <div className="tables-filters-row">
          <label htmlFor="areaMapSelect">Área</label>
          <select
            id="areaMapSelect"
            value={selectedAreaId}
            onChange={(event) => {
              setSelectedAreaId(event.target.value);
              setSuccess('');
            }}
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <div className="area-map-editor-layout">
          <aside
            className="area-map-sidebar"
            onDragOver={(event) => event.preventDefault()}
            onDrop={dropToPanel}
          >
            <h3>Mesas de {selectedArea?.name || 'área'}</h3>
            <p className="muted-text">Arrastrá y soltá las mesas al mapa.</p>

            <div className="area-map-table-list">
              {unplacedTables.length === 0 && <p className="muted-text">Todas las mesas están ubicadas.</p>}
              {unplacedTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  className="touch-btn area-map-table-chip"
                  draggable
                  onDragStart={(event) => handleDragStart(event, table.id, 'panel')}
                >
                  Mesa {table.table_number}
                </button>
              ))}
            </div>
          </aside>

          <section className="area-map-canvas-wrapper">
            {loading ? (
              <p>Cargando mapa...</p>
            ) : (
              <div
                ref={mapRef}
                className="area-map-canvas"
                style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropToMap}
              >

              <div className="area-map-static-label" style={{ left: 20, top: 20, width: 120, height: 42 }}>Acceso</div>
              <div className="area-map-static-label" style={{ right: 20, top: 20, width: 140, height: 42 }}>Baños</div>
              <div className="area-map-static-label" style={{ right: 20, bottom: 20, width: 140, height: 42 }}>Cocina</div>
              <div className="area-map-static-line" style={{ left: 160, top: 88, width: 560, height: 2 }} />
              <div className="area-map-static-line" style={{ left: 220, top: 120, width: 2, height: 380 }} />
              <div className="area-map-static-column" style={{ left: 290, top: 170 }} />
              <div className="area-map-static-column" style={{ left: 510, top: 300 }} />
              <div className="area-map-static-plant" style={{ left: 64, top: 290 }} />
              <div className="area-map-static-plant" style={{ left: 694, top: 246 }} />

              {placedTables.map((table) => {
                const visual = getTableVisualConfig(table);

                return (
                  <button
                    key={table.id}
                    type="button"
                    className={`dashboard-table-btn table-shape-only ${getTableStatusClass(table.status)}`}
                    style={{
                      position: 'absolute',
                      left: Number(table.pos_x),
                      top: Number(table.pos_y),
                      width: visual.width,
                      minHeight: visual.height,
                      cursor: 'grab',
                      borderRadius: visual.borderRadius,
                      userSelect: 'none',
                    }}
                    draggable
                    onDragStart={(event) => handleDragStart(event, table.id, 'map')}
                  >
                    <span className="table-number-label">{table.table_number}</span>
                  </button>
                );
              })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminAreaMapEditor;
