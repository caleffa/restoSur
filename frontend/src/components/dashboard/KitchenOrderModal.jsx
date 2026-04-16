import Modal from '../Modal';

const STATUS_OPTIONS = ['PENDIENTE', 'PREPARANDO', 'LISTO'];

function KitchenOrderModal({
  order,
  saleDetail,
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
            <p><strong>Mesa:</strong> {saleDetail?.tableName || `Mesa ${saleDetail?.tableId || '-'}`}</p>
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
          {!saleDetail?.items?.length ? (
            <p className="text-muted mb-0">No se encontraron items para esta comanda.</p>
          ) : (
            <ul className="dashboard-list kitchen-items-list">
              {saleDetail.items.map((item) => (
                <li key={item.id} className="list-row-split">
                  <span>{item.articleName || item.article_name || item.name}</span>
                  <span className="text-muted">x{Number(item.quantity || 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export default KitchenOrderModal;
