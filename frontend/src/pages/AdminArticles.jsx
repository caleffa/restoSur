import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createArticle,
  deleteArticle,
  getArticleTypes,
  getArticles,
  getMeasurementUnits,
  updateArticle,
} from '../services/adminService';
import { formatCurrency } from '../utils/formatters';

const initialForm = {
  name: '',
  sku: '',
  barcode: '',
  articleTypeId: '',
  measurementUnitId: '',
  cost: '',
  active: true,
};

function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [articleTypes, setArticleTypes] = useState([]);
  const [measurementUnits, setMeasurementUnits] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [articlesData, articleTypesData, measurementUnitsData] = await Promise.all([
        getArticles(),
        getArticleTypes(),
        getMeasurementUnits(),
      ]);
      setArticles(articlesData);
      setArticleTypes(articleTypesData);
      setMeasurementUnits(measurementUnitsData);
      setError('');
    } catch {
      setError('No se pudo cargar la información de artículos.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const articleTypeMap = useMemo(
    () => Object.fromEntries(articleTypes.map((item) => [Number(item.id), item.name])),
    [articleTypes],
  );
  const measurementUnitMap = useMemo(
    () => Object.fromEntries(measurementUnits.map((item) => [Number(item.id), `${item.name} (${item.code})`])),
    [measurementUnits],
  );

  const onCreateOrUpdate = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || null,
        articleTypeId: Number(form.articleTypeId),
        measurementUnitId: Number(form.measurementUnitId),
        cost: Number(form.cost),
        active: Boolean(form.active),
      };

      if (editingId) {
        await updateArticle(editingId, payload);
      } else {
        await createArticle(payload);
      }

      setForm(initialForm);
      setEditingId(null);
      setIsFormModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo guardar el artículo.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      sku: row.sku || '',
      barcode: row.barcode || '',
      articleTypeId: row.article_type_id ?? row.articleTypeId ?? '',
      measurementUnitId: row.measurement_unit_id ?? row.measurementUnitId ?? '',
      cost: row.cost,
      active: row.active === 1 || row.active === true,
    });
    setIsFormModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || loading) return;

    try {
      setLoading(true);
      await deleteArticle(pendingDelete.id);
      setPendingDelete(null);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar el artículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de artículos</h2>
          <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
            Nuevo artículo
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <SimpleDataTable
          title="Artículos"
          rows={articles}
          filters={[
            {
              key: 'active',
              label: 'Estado',
              accessor: (row) => String(row.active),
              options: [
                { value: '1', label: 'Activo' },
                { value: '0', label: 'Inactivo' },
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ],
            },
            {
              key: 'articleType',
              label: 'Tipo',
              accessor: (row) => String(row.article_type_id ?? row.articleTypeId ?? ''),
              options: articleTypes.map((item) => ({ value: String(item.id), label: item.name })),
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortable: true },
            { key: 'sku', label: 'SKU', accessor: (row) => row.sku, sortable: true },
            { key: 'barcode', label: 'Código de barras', accessor: (row) => row.barcode || '-' },
            { key: 'articleType', label: 'Tipo', accessor: (row) => articleTypeMap[Number(row.article_type_id ?? row.articleTypeId)] || '-', sortable: true },
            { key: 'unit', label: 'Unidad', accessor: (row) => measurementUnitMap[Number(row.measurement_unit_id ?? row.measurementUnitId)] || '-' },
            { key: 'cost', label: 'Costo', accessor: (row) => formatCurrency(row.cost), sortable: true },
            { key: 'status', label: 'Estado', accessor: (row) => ((row.active === 1 || row.active === true) ? 'Activo' : 'Inactivo') },
            {
              key: 'actions',
              label: 'Acciones',
              accessor: () => '',
              render: (row) => (
                <div className="admin-actions-row">
                  <button type="button" className="touch-btn" onClick={() => openEditModal(row)}>Editar</button>
                  <button type="button" className="touch-btn btn-danger" onClick={() => setPendingDelete(row)}>Eliminar</button>
                </div>
              ),
            },
          ]}
        />

        {isFormModalOpen && (
          <Modal
            title={editingId ? 'Editar artículo' : 'Nuevo artículo'}
            onClose={() => {
              if (loading) return;
              setIsFormModalOpen(false);
              setEditingId(null);
              setForm(initialForm);
            }}
          >
            <form className="admin-table-form modal-form" onSubmit={onCreateOrUpdate}>
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                placeholder="SKU"
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                required
              />
              <input
                placeholder="Código de barras"
                value={form.barcode}
                onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))}
              />
              <select
                value={form.articleTypeId}
                onChange={(event) => setForm((prev) => ({ ...prev, articleTypeId: event.target.value }))}
                required
              >
                <option value="">Seleccionar tipo de artículo</option>
                {articleTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select
                value={form.measurementUnitId}
                onChange={(event) => setForm((prev) => ({ ...prev, measurementUnitId: event.target.value }))}
                required
              >
                <option value="">Seleccionar unidad de medida</option>
                {measurementUnits.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo"
                value={form.cost}
                onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
                required
              />
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                />{' '}
                Activo
              </label>
              <div className="admin-actions-row">
                <button className="touch-btn btn-primary" type="submit" disabled={loading}>{editingId ? 'Actualizar' : 'Crear'}</button>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Modal>
        )}

        {pendingDelete && (
          <Modal
            title="Confirmar eliminación"
            onClose={() => !loading && setPendingDelete(null)}
            actions={(
              <>
                <button type="button" className="touch-btn" onClick={() => setPendingDelete(null)} disabled={loading}>Cancelar</button>
                <button type="button" className="touch-btn btn-danger" onClick={confirmDelete} disabled={loading}>Sí, eliminar</button>
              </>
            )}
            size="sm"
          >
            <p>¿Está seguro que desea eliminar este artículo?</p>
          </Modal>
        )}
      </main>
    </div>
  );
}

export default AdminArticles;
