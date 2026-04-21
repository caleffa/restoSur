function TableActions({
  tableStatus,
  hasItems,
  loading,
  canEdit,
  canCharge,
  onRequestBill,
  onOpenPayment,
  onCancelTable,
}) {
  const isFree = tableStatus === 'LIBRE';
  const isBillRequested = tableStatus === 'CUENTA_PEDIDA';

  return (
    <div className="d-flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-warning"
        onClick={onRequestBill}
        disabled={loading || isFree || isBillRequested || !hasItems}
        title={isFree ? 'No se puede pedir cuenta en una mesa libre' : ''}
      >
        🧾 Pedir cuenta
      </button>

      {canCharge && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onOpenPayment}
          disabled={loading || !hasItems}
        >
          💳 Cobrar
        </button>
      )}

      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={onCancelTable}
        disabled={loading || isFree}
      >
        ❌ Cancelar mesa
      </button>

      {!canEdit && (
        <span className="badge text-bg-warning align-self-center">
          Edición bloqueada: cuenta pedida
        </span>
      )}
    </div>
  );
}

export default TableActions;
