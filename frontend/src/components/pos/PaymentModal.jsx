import { useMemo, useState } from 'react';
import Modal from '../Modal';

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

function PaymentModal({
  total,
  hasItems,
  onClose,
  onConfirm,
  loading,
  caeaOptions = [],
  canEmitFiscalTicket = false,
}) {
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [emitFiscalTicket, setEmitFiscalTicket] = useState(canEmitFiscalTicket);
  const [invoiceType, setInvoiceType] = useState('B');
  const [authorizationType, setAuthorizationType] = useState('CAE');
  const [caeaId, setCaeaId] = useState('');

  const formattedTotal = useMemo(() => Number(total || 0).toFixed(2), [total]);

  return (
    <Modal
      title="Cobrar mesa"
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !hasItems || !confirmChecked}
            onClick={() => onConfirm({
              paymentMethod,
              emitFiscalTicket,
              invoiceType,
              authorizationType,
              caeaId: authorizationType === 'CAEA' ? Number(caeaId) : null,
            })}
          >
            Confirmar pago
          </button>
        </>
      )}
      size="sm"
    >
      <div className="d-grid gap-3">
        {!hasItems && <p className="text-danger mb-0">No se puede cobrar una venta sin productos.</p>}

        <p className="mb-0">
          Total a cobrar: <strong>${formattedTotal}</strong>
        </p>

        <div>
          <label className="form-label">Método de pago</label>
          <select className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </div>

        {canEmitFiscalTicket && (
          <div className="border rounded p-2 d-grid gap-2">
            <label className="form-check d-flex align-items-center gap-2 mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                checked={emitFiscalTicket}
                onChange={(event) => setEmitFiscalTicket(event.target.checked)}
              />
              <span className="form-check-label fw-semibold">Emitir ticket fiscal ECP/POS</span>
            </label>

            {emitFiscalTicket && (
              <>
                <div>
                  <label className="form-label mb-1">Tipo de comprobante</label>
                  <select className="form-select" value={invoiceType} onChange={(event) => setInvoiceType(event.target.value)}>
                    <option value="A">Factura A</option>
                    <option value="B">Factura B</option>
                    <option value="C">Factura C</option>
                  </select>
                </div>

                <div>
                  <label className="form-label mb-1">Autorización AFIP</label>
                  <select className="form-select" value={authorizationType} onChange={(event) => setAuthorizationType(event.target.value)}>
                    <option value="CAE">CAE</option>
                    <option value="CAEA">CAEA</option>
                  </select>
                </div>

                {authorizationType === 'CAEA' && (
                  <div>
                    <label className="form-label mb-1">CAEA</label>
                    <select className="form-select" value={caeaId} onChange={(event) => setCaeaId(event.target.value)}>
                      <option value="">Seleccionar CAEA</option>
                      {caeaOptions.map((caea) => (
                        <option key={caea.id} value={caea.id}>
                          {caea.caea_code} - {caea.period_year}/{caea.period_half}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Si elegís CAEA, se imprimirá el código del período seleccionado.
                    </small>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <label className="form-check d-flex align-items-center gap-2 mb-0">
          <input
            type="checkbox"
            className="form-check-input"
            checked={confirmChecked}
            onChange={(event) => setConfirmChecked(event.target.checked)}
          />
          <span className="form-check-label">Confirmo que deseo registrar y cobrar esta venta.</span>
        </label>
      </div>
    </Modal>
  );
}

export default PaymentModal;
