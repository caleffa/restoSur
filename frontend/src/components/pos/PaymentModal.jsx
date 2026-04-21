import { useMemo, useState } from 'react';
import Modal from '../Modal';
import { formatCurrency } from '../../utils/formatters';

const METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

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
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelection, setSplitSelection] = useState({
    EFECTIVO: true,
    TARJETA: false,
    TRANSFERENCIA: false,
  });
  const [splitAmounts, setSplitAmounts] = useState({
    EFECTIVO: '',
    TARJETA: '',
    TRANSFERENCIA: '',
  });
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [emitFiscalTicket, setEmitFiscalTicket] = useState(canEmitFiscalTicket);
  const [invoiceType, setInvoiceType] = useState('B');
  const [authorizationType, setAuthorizationType] = useState('CAE');
  const [caeaId, setCaeaId] = useState('');

  const formattedTotal = useMemo(() => formatCurrency(total || 0), [total]);

  const selectedSplits = useMemo(
    () => METHODS.filter((method) => splitSelection[method.value]).map((method) => ({
      paymentMethod: method.value,
      amount: roundMoney(splitAmounts[method.value]),
    })),
    [splitAmounts, splitSelection]
  );

  const splitTotal = useMemo(
    () => roundMoney(selectedSplits.reduce((acc, item) => acc + Number(item.amount || 0), 0)),
    [selectedSplits]
  );

  const hasInvalidSplitAmounts = selectedSplits.some((item) => !Number.isFinite(item.amount) || item.amount <= 0);
  const hasSelectedSplit = selectedSplits.length > 0;
  const splitMatchesTotal = roundMoney(total || 0) === splitTotal;
  const canConfirm = hasItems
    && confirmChecked
    && (!splitMode || (hasSelectedSplit && !hasInvalidSplitAmounts && splitMatchesTotal));

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
            disabled={loading || !canConfirm}
            onClick={() => onConfirm({
              paymentMethod,
              paymentSplits: splitMode ? selectedSplits : null,
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
          Total a cobrar: <strong>{formattedTotal}</strong>
        </p>

        <div className="d-grid gap-2">
          <button
            type="button"
            className={`btn ${splitMode ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => setSplitMode((prev) => !prev)}
            disabled={loading}
          >
            {splitMode ? 'Quitar división' : 'Dividir'}
          </button>

          {!splitMode && (
            <div>
              <label className="form-label">Método de pago</label>
              <select className="form-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </select>
            </div>
          )}

          {splitMode && (
            <div className="border rounded p-2 d-grid gap-2">
              <p className="mb-0 fw-semibold">Dividir entre medios de pago</p>
              {METHODS.map((method) => (
                <div key={method.value} className="d-flex gap-2 align-items-center">
                  <label className="form-check mb-0 flex-grow-1 d-flex gap-2 align-items-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={Boolean(splitSelection[method.value])}
                      onChange={(event) => setSplitSelection((prev) => ({ ...prev, [method.value]: event.target.checked }))}
                    />
                    <span className="form-check-label">{method.label}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    style={{ maxWidth: 120 }}
                    disabled={!splitSelection[method.value]}
                    value={splitAmounts[method.value]}
                    onChange={(event) => setSplitAmounts((prev) => ({ ...prev, [method.value]: event.target.value }))}
                    placeholder="Monto"
                  />
                </div>
              ))}
              <small className={splitMatchesTotal ? 'text-success' : 'text-danger'}>
                Subtotales: {formatCurrency(splitTotal)} / {formattedTotal}
              </small>
              {!hasSelectedSplit && <small className="text-danger">Seleccioná al menos un medio de pago.</small>}
              {hasInvalidSplitAmounts && <small className="text-danger">Todos los montos deben ser mayores a 0.</small>}
              {!splitMatchesTotal && hasSelectedSplit && !hasInvalidSplitAmounts && (
                <small className="text-danger">La suma de subtotales debe ser igual al total.</small>
              )}
            </div>
          )}
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
