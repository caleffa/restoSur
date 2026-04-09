import { useMemo, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

function ProductSelector({ products, onAdd, disabled = false }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const id = Number(product.category_id ?? product.categoryId ?? 0);
      const name = product.category_name ?? product.categoryName ?? `Categoría ${id}`;
      map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryId = String(product.category_id ?? product.categoryId ?? '');
      const matchesCategory = !categoryFilter || categoryFilter === categoryId;
      const matchesSearch = !normalized || product.name.toLowerCase().includes(normalized);
      return matchesCategory && matchesSearch && (product.active === 1 || product.active === true);
    });
  }, [products, search, categoryFilter]);

  return (
    <section className="card shadow-sm">
      <div className="card-body d-grid gap-3">
        <h5 className="mb-0">Agregar productos</h5>

        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label">Buscar producto</label>
            <input
              type="search"
              className="form-control"
              placeholder="Ej: Milanesa napolitana"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} disabled={disabled}>
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Cantidad</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="row g-2 align-items-end">
          <div className="col-md-9">
            <label className="form-label">Producto</label>
            <select className="form-select" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} disabled={disabled}>
              <option value="">Seleccionar producto...</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {formatCurrency(product.price)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3 d-grid">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!selectedProductId || disabled}
              onClick={() => {
                const selected = products.find((product) => String(product.id) === String(selectedProductId));
                if (!selected) return;
                onAdd(selected, quantity);
                setSelectedProductId('');
                setQuantity(1);
              }}
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductSelector;
