import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import SimpleDataTable from '../components/SimpleDataTable';
import {
  createArticle,
  deleteArticle,
  downloadArticlesImportTemplate,
  getArticleTypes,
  getArticles,
  getCategories,
  getMeasurementUnits,
  getSuppliers,
  importArticlesCsv,
  updateArticle,
} from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { sortByLabel } from '../utils/sort';

const initialForm = {
  name: '',
  sku: '',
  barcode: '',
  articleTypeId: '',
  measurementUnitId: '',
  categoryId: '',
  supplierId: '',
  cost: '',
  salePrice: '',
  managesStock: true,
  isProduct: false,
  isSupply: false,
  forSale: false,
  active: true,
};

function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [articleTypes, setArticleTypes] = useState([]);
  const [measurementUnits, setMeasurementUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [articlesData, articleTypesData, measurementUnitsData, categoriesData, suppliersData] = await Promise.all([
        getArticles(),
        getArticleTypes(),
        getMeasurementUnits(),
        getCategories(),
        getSuppliers(),
      ]);
      setArticles(articlesData);
      setArticleTypes(articleTypesData);
      setMeasurementUnits(measurementUnitsData);
      setCategories(categoriesData);
      setSuppliers(suppliersData.filter((item) => Number(item.active) === 1));
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
  const sortedArticleTypes = useMemo(() => sortByLabel(articleTypes, (item) => item.name), [articleTypes]);
  const sortedMeasurementUnits = useMemo(() => sortByLabel(measurementUnits, (item) => item.name), [measurementUnits]);
  const sortedCategories = useMemo(() => sortByLabel(categories, (item) => item.name), [categories]);
  const sortedSuppliers = useMemo(() => sortByLabel(suppliers, (item) => item.business_name), [suppliers]);

  const handleTypeToggle = (field, checked) => {
    setForm((prev) => ({ ...prev, [field]: checked }));
  };

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
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        cost: Number(form.cost),
        salePrice: Number(form.salePrice),
        managesStock: Boolean(form.managesStock),
        isProduct: Boolean(form.isProduct),
        isSupply: Boolean(form.isSupply),
        forSale: Boolean(form.forSale),
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
      categoryId: row.category_id ?? row.categoryId ?? '',
      supplierId: row.supplier_id ?? row.supplierId ?? '',
      cost: row.cost,
      salePrice: row.sale_price ?? row.salePrice ?? 0,
      managesStock: row.manages_stock === 1 || row.manages_stock === true,
      isProduct: row.is_product === 1 || row.is_product === true,
      isSupply: row.is_supply === 1 || row.is_supply === true,
      forSale: row.for_sale === 1 || row.for_sale === true,
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

  const normalizeFlag = (value) => (value === 1 || value === true ? 'true' : 'false');

  const handleImportCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file || importing) return;

    try {
      setImporting(true);
      setError('');
      setImportResult(null);
      const csvContent = await file.text();
      const result = await importArticlesCsv(csvContent);
      setImportResult(result);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo importar el archivo CSV.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setError('');
      const blob = await downloadArticlesImportTemplate();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'articulos-import-template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo descargar el CSV de ejemplo.');
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="content admin-management-screen">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Administración de artículos</h2>
          <div className="admin-actions-row">
            <button type="button" className="touch-btn" onClick={handleDownloadTemplate}>
              Descargar CSV modelo
            </button>
            <label className="touch-btn" style={{ marginBottom: 0, cursor: 'pointer' }}>
              {importing ? 'Importando...' : 'Importar CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCsv}
                disabled={importing}
                style={{ display: 'none' }}
              />
            </label>
            <button type="button" className="touch-btn btn-primary" onClick={openCreateModal}>
              Nuevo artículo
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {importResult && (
          <div className="table-card" style={{ marginBottom: '1rem' }}>
            <strong>Resultado de importación:</strong>{' '}
            {importResult.imported} importados / {importResult.errorsCount} con error (de {importResult.totalRows} filas).
            {importResult.errorsCount > 0 && (
              <ul style={{ marginTop: '0.5rem' }}>
                {importResult.errors.slice(0, 10).map((item) => (
                  <li key={`${item.line}-${item.sku || 'sin-sku'}`}>
                    Línea {item.line}: {item.message}
                  </li>
                ))}
                {importResult.errorsCount > 10 && <li>... y {importResult.errorsCount - 10} errores más.</li>}
              </ul>
            )}
          </div>
        )}

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
              options: sortedArticleTypes.map((item) => ({ value: String(item.id), label: item.name })),
            },
            {
              key: 'supplier',
              label: 'Proveedor',
              accessor: (row) => String(row.supplier_id ?? row.supplierId ?? ''),
              options: sortedSuppliers.map((item) => ({ value: String(item.id), label: item.business_name })),
            },
            {
              key: 'forSale',
              label: 'Para venta',
              accessor: (row) => normalizeFlag(row.for_sale ?? row.forSale),
              options: [
                { value: 'true', label: 'Sí' },
                { value: 'false', label: 'No' },
              ],
            },
            {
              key: 'isProduct',
              label: 'Es producto',
              accessor: (row) => normalizeFlag(row.is_product ?? row.isProduct),
              options: [
                { value: 'true', label: 'Sí' },
                { value: 'false', label: 'No' },
              ],
            },
            {
              key: 'isSupply',
              label: 'Es insumo',
              accessor: (row) => normalizeFlag(row.is_supply ?? row.isSupply),
              options: [
                { value: 'true', label: 'Sí' },
                { value: 'false', label: 'No' },
              ],
            },
            {
              key: 'managesStock',
              label: 'Controla stock',
              accessor: (row) => normalizeFlag(row.manages_stock ?? row.managesStock),
              options: [
                { value: 'true', label: 'Sí' },
                { value: 'false', label: 'No' },
              ],
            },
          ]}
          columns={[
            { key: 'name', label: 'Nombre', accessor: (row) => row.name, sortAccessor: (row) => (row.name || '').toLowerCase(), sortable: true },
            { key: 'sku', label: 'SKU', accessor: (row) => row.sku, sortable: true },
            { key: 'barcode', label: 'Código de barras', accessor: (row) => row.barcode || '-' },
            { key: 'articleType', label: 'Tipo', accessor: (row) => articleTypeMap[Number(row.article_type_id ?? row.articleTypeId)] || '-', sortAccessor: (row) => (articleTypeMap[Number(row.article_type_id ?? row.articleTypeId)] || '').toLowerCase(), sortable: true },
            { key: 'unit', label: 'Unidad', accessor: (row) => measurementUnitMap[Number(row.measurement_unit_id ?? row.measurementUnitId)] || '-' },
            { key: 'supplier', label: 'Proveedor', accessor: (row) => row.supplier_name || '-' },
            { key: 'cost', label: 'Costo', accessor: (row) => formatCurrency(row.cost), sortAccessor: (row) => Number(row.cost) || 0, sortable: true },
            { key: 'salePrice', label: 'Precio venta', accessor: (row) => formatCurrency(row.sale_price ?? row.salePrice ?? 0), sortAccessor: (row) => Number(row.sale_price ?? row.salePrice) || 0, sortable: true },
            { key: 'flags', label: 'Flags', accessor: (row) => `Venta:${row.for_sale ? 'Sí' : 'No'} · Prod:${row.is_product ? 'Sí' : 'No'} · Insumo:${row.is_supply ? 'Sí' : 'No'}` },
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
                {sortedArticleTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select
                value={form.measurementUnitId}
                onChange={(event) => setForm((prev) => ({ ...prev, measurementUnitId: event.target.value }))}
                required
              >
                <option value="">Seleccionar unidad de medida</option>
                {sortedMeasurementUnits.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
              </select>
              <select value={form.categoryId} onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}>
                <option value="">Seleccionar categoría</option>
                {sortedCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select value={form.supplierId} onChange={(event) => setForm((prev) => ({ ...prev, supplierId: event.target.value }))}>
                <option value="">Proveedor principal (opcional)</option>
                {sortedSuppliers.map((item) => <option key={item.id} value={item.id}>{item.business_name}</option>)}
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
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio de venta"
                value={form.salePrice}
                onChange={(event) => setForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                required
              />
              <label><input type="checkbox" checked={form.managesStock} onChange={(event) => setForm((prev) => ({ ...prev, managesStock: event.target.checked }))} /> Maneja stock</label>
              <label><input type="checkbox" checked={form.isProduct} onChange={(event) => handleTypeToggle('isProduct', event.target.checked)} /> Es producto</label>
              <label><input type="checkbox" checked={form.isSupply} onChange={(event) => handleTypeToggle('isSupply', event.target.checked)} /> Es insumo</label>
              <label><input type="checkbox" checked={form.forSale} onChange={(event) => setForm((prev) => ({ ...prev, forSale: event.target.checked }))} /> A la venta</label>
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
