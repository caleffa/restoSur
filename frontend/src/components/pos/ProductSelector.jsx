import { useMemo, useState } from 'react';
import Modal from '../Modal';
import { formatCurrency } from '../../utils/formatters';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://localhost:3000/api').replace(/\/api\/?$/, '');

function resolveImageUrl(imagePath) {
  if (!imagePath) return '';
  if (String(imagePath).startsWith('http://') || String(imagePath).startsWith('https://')) return imagePath;
  if (String(imagePath).startsWith('/')) return `${API_BASE_URL}${imagePath}`;
  return imagePath;
}

function ProductSelector({ products, onAdd, disabled = false }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const categories = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      const categoryId = Number(product.category_id ?? product.categoryId ?? 0);
      if (!categoryId) return;

      if (!map.has(categoryId)) {
        const categoryName = product.category_name ?? product.categoryName ?? `Categoría ${categoryId}`;
        const categoryImage =
          product.category_image
          ?? product.categoryImage
          ?? product.category_image_url
          ?? product.categoryImageUrl
          ?? '';

        map.set(categoryId, {
          id: categoryId,
          name: categoryName,
          image: resolveImageUrl(categoryImage),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const activeProducts = products.filter((product) => {
      const isActive = product.active === 1 || product.active === true;
      const isForSale = product.for_sale === 1 || product.for_sale === true || product.forSale === true;
      return isActive && isForSale;
    });

    if (!selectedCategoryId) return [];

    return activeProducts.filter((product) => Number(product.category_id ?? product.categoryId ?? 0) === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const openQuantityModal = (product) => {
    if (disabled) return;
    setPendingSelection(product);
    setQuantity(1);
  };

  const increment = () => setQuantity((current) => current + 1);
  const decrement = () => setQuantity((current) => Math.max(1, current - 1));

  return (
    <section className="card shadow-sm">
      <div className="card-body d-grid gap-3">
        <h5 className="mb-0">Agregar productos</h5>

        {!selectedCategoryId && (
          <div className="touch-categories-grid">
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className="touch-category-btn"
                onClick={() => setSelectedCategoryId(category.id)}
                disabled={disabled}
              >
                <div className="touch-category-image-wrap">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="touch-category-image" />
                  ) : (
                    <span className="touch-category-fallback" aria-hidden="true">🍽️</span>
                  )}
                </div>
                <span className="touch-category-name">{category.name}</span>
              </button>
            ))}
          </div>
        )}

        {selectedCategoryId && (
          <div className="d-grid gap-3">
            <div>
              <button type="button" className="touch-btn" onClick={() => setSelectedCategoryId(null)} disabled={disabled}>
                ← Volver a categorías
              </button>
            </div>

            <div className="touch-products-grid">
              {filteredProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className="touch-product-btn"
                  onClick={() => openQuantityModal(product)}
                  disabled={disabled}
                >
                  <span className="touch-product-name">{product.name}</span>
                  <span className="touch-product-price">{formatCurrency(product.price)}</span>
                </button>
              ))}

              {filteredProducts.length === 0 && (
                <p className="text-muted mb-0">No hay artículos cargados en esta categoría.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingSelection && (
        <Modal
          title={`Cantidad · ${pendingSelection.name}`}
          size="sm"
          onClose={() => setPendingSelection(null)}
          actions={(
            <>
              <button type="button" className="touch-btn" onClick={() => setPendingSelection(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="touch-btn btn-primary"
                onClick={() => {
                  if (quantity < 1) return;
                  onAdd(pendingSelection, quantity);
                  setPendingSelection(null);
                  setQuantity(1);
                }}
              >
                Aceptar
              </button>
            </>
          )}
        >
          <div className="touch-qty-modal-body">
            <p className="text-muted mb-0">Seleccioná la cantidad:</p>
            <div className="touch-qty-controls">
              <button type="button" className="touch-qty-btn" onClick={decrement} aria-label="Restar cantidad">−</button>
              <strong className="touch-qty-value">{quantity}</strong>
              <button type="button" className="touch-qty-btn" onClick={increment} aria-label="Sumar cantidad">+</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default ProductSelector;
