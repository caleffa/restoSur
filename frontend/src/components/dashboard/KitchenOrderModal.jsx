import Modal from '../Modal';

const STATUS_OPTIONS = ['PENDIENTE', 'PREPARANDO', 'LISTO'];

function KitchenOrderModal({
  order,
  loading,
  statusUpdating,
  onClose,
  onChangeStatus,
}) {
  return (
    <Modal
      title={`Comanda #${order.id}`}
      onClose={onClose}
      size="md"
      actions={(
        <button type="button" className="touch-btn" onClick={onClose}>
          Cerrar
        </button>
      )}
    >
      {loading ? (
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          Cargando detalle...
        </div>
      ) : (
        <div className="kitchen-modal-content">
          <div className="kitchen-modal-header">
            <p><strong>Venta:</strong> #{order.saleId}</p>
            <p><strong>Mesa:</strong> {`Mesa ${order.tableId || '-'}`}</p>
          </div>

          <div className="kitchen-status-actions">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                className={`touch-btn ${order.status === status ? 'active' : ''}`}
                onClick={() => onChangeStatus(status)}
                disabled={statusUpdating || order.status === status}
              >
                {statusUpdating && order.status !== status ? 'Actualizando...' : status}
              </button>
            ))}
          </div>

          <h4 className="section-title mb-2">Detalle</h4>
          {!order?.articleName ? (
            <p className="text-muted mb-0">No se encontraron items para esta comanda.</p>
          ) : (
            <ul className="dashboard-list kitchen-items-list">
              <li className="list-row-split">
                <span>{order.articleName}</span>
                <span className="text-muted">x{Number(order.quantity || 0)}</span>
              </li>
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export default KitchenOrderModal;
