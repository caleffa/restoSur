import { useMemo, useState } from 'react';

const statusClassMap = {
  PENDIENTE: 'text-bg-warning',
  'EN PREPARACIÓN': 'text-bg-info',
  LISTO: 'text-bg-success',
  SIN_COMANDA: 'text-bg-secondary',
};

function OrderTable({ items, onChangeQuantity, onDelete }) {
  const [editingRow, setEditingRow] = useState(null);
  const [nextQty, setNextQty] = useState(1);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.unitPrice) * Number(item.quantity), 0),
    [items],
  );

  const startEdit = (item) => {
    setEditingRow(item.id);
    setNextQty(Number(item.quantity));
  };

  return (
    <section className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Consumos</h5>
          <span className="fw-semibold">Total: ${total.toFixed(2)}</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle pos-orders-table mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th>Cocina</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">Aún no hay consumos en esta mesa.</td>
                </tr>
              )}

              {items.map((item) => {
                const subtotal = Number(item.unitPrice) * Number(item.quantity);
                const isEditing = editingRow === item.id;

                return (
                  <tr key={item.id}>
                    <td className="fw-semibold">{item.productName}</td>
                    <td>${Number(item.unitPrice).toFixed(2)}</td>
                    <td style={{ maxWidth: 140 }}>
                      {isEditing ? (
                        <input
                          className="form-control"
                          type="number"
                          min="1"
                          value={nextQty}
                          onChange={(event) => setNextQty(Number(event.target.value) || 1)}
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </td>
                    <td>${subtotal.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${statusClassMap[item.kitchenStatus] || 'text-bg-secondary'}`}>
                        {item.kitchenStatus}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                onChangeQuantity(item, nextQty);
                                setEditingRow(null);
                              }}
                            >
                              Guardar
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditingRow(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => startEdit(item)}>
                            Editar
                          </button>
                        )}
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default OrderTable;
